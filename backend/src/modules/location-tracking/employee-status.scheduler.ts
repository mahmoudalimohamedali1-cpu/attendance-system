import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class EmployeeStatusScheduler {
    private readonly logger = new Logger(EmployeeStatusScheduler.name);

    // المدة المسموح بها بدون heartbeat قبل اعتبار الموظف offline (بالدقائق)
    private readonly OFFLINE_THRESHOLD_MINUTES = 5;

    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService,
    ) { }

    /**
     * فحص الموظفين الـ offline كل دقيقة
     * يتم التحقق من الموظفين الذين لديهم حضور اليوم ولكن لم يرسلوا heartbeat
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async checkOfflineEmployees() {
        this.logger.debug('جاري فحص الموظفين المنقطعين...');

        try {
            const now = new Date();
            const thresholdTime = new Date(now.getTime() - this.OFFLINE_THRESHOLD_MINUTES * 60 * 1000);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // البحث عن الموظفين الذين لديهم حضور اليوم ولم يرسلوا موقع حديث
            const employeesWithAttendance = await this.prisma.attendance.findMany({
                where: {
                    date: today,
                    checkInTime: { not: null },
                    checkOutTime: null, // لم ينصرفوا بعد
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            companyId: true,
                            managerId: true,
                            company: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                },
            });

            for (const attendance of employeesWithAttendance) {
                const userId = attendance.userId;
                const companyId = attendance.companyId || attendance.user.companyId;

                if (!companyId) continue;

                // التحقق من آخر موقع للموظف
                const lastLocation = await this.prisma.employeeLocationLog.findFirst({
                    where: { userId },
                    orderBy: { createdAt: 'desc' },
                });

                // إذا لم يكن هناك موقع أو الموقع قديم
                const isOffline = !lastLocation || lastLocation.createdAt < thresholdTime;

                if (isOffline) {
                    // التحقق من وجود حدث offline نشط
                    const existingEvent = await this.prisma.employeeOfflineEvent.findFirst({
                        where: {
                            userId,
                            isResolved: false,
                        },
                    });

                    if (!existingEvent) {
                        // إنشاء حدث offline جديد
                        const newEvent = await this.prisma.employeeOfflineEvent.create({
                            data: {
                                userId,
                                companyId,
                                eventType: 'APP_CLOSED',
                                startedAt: thresholdTime,
                                lastLatitude: lastLocation?.latitude,
                                lastLongitude: lastLocation?.longitude,
                            },
                        });

                        this.logger.warn(`موظف منقطع: ${attendance.user.firstName} ${attendance.user.lastName}`);

                        // إرسال إشعار للمسؤولين
                        await this.notifyAdmins(attendance.user, newEvent.id);
                    }
                } else {
                    // الموظف online - تحقق من وجود حدث offline نشط لإغلاقه
                    await this.resolveOfflineEvent(userId);
                }
            }
        } catch (error) {
            this.logger.error(`خطأ في فحص الموظفين المنقطعين: ${error.message}`);
        }
    }

    /**
     * إغلاق حدث offline عند عودة الموظف
     */
    async resolveOfflineEvent(userId: string) {
        const activeEvent = await this.prisma.employeeOfflineEvent.findFirst({
            where: {
                userId,
                isResolved: false,
            },
        });

        if (activeEvent) {
            const now = new Date();
            const durationMinutes = Math.round(
                (now.getTime() - activeEvent.startedAt.getTime()) / (1000 * 60)
            );

            await this.prisma.employeeOfflineEvent.update({
                where: { id: activeEvent.id },
                data: {
                    isResolved: true,
                    endedAt: now,
                    durationMinutes,
                },
            });

            this.logger.log(`موظف عاد للاتصال بعد ${durationMinutes} دقيقة`);
        }
    }

    /**
     * إرسال إشعار للمسؤولين عند انقطاع موظف
     */
    private async notifyAdmins(user: any, eventId: string) {
        try {
            // البحث عن المسؤولين في نفس الشركة
            const admins = await this.prisma.user.findMany({
                where: {
                    companyId: user.companyId,
                    role: { in: ['ADMIN', 'HR', 'MANAGER'] },
                    status: 'ACTIVE',
                },
                select: { id: true },
            });

            const employeeName = `${user.firstName} ${user.lastName}`;

            for (const admin of admins) {
                await this.notificationsService.create({
                    userId: admin.id,
                    type: NotificationType.SYSTEM,
                    title: '⚠️ موظف منقطع عن الاتصال',
                    message: `الموظف ${employeeName} منقطع عن الاتصال منذ ${this.OFFLINE_THRESHOLD_MINUTES} دقائق. قد يكون الهاتف مغلق أو التطبيق محذوف.`,
                    data: { eventId, userId: user.id },
                });
            }

            // تحديث حالة الإشعار
            await this.prisma.employeeOfflineEvent.update({
                where: { id: eventId },
                data: {
                    notified: true,
                    notifiedAt: new Date(),
                },
            });
        } catch (error) {
            this.logger.error(`خطأ في إرسال الإشعارات: ${error.message}`);
        }
    }

    /**
     * الحصول على الموظفين المنقطعين حالياً
     */
    async getOfflineEmployees(companyId: string) {
        return this.prisma.employeeOfflineEvent.findMany({
            where: {
                companyId,
                isResolved: false,
            },
            orderBy: { startedAt: 'desc' },
        });
    }

    /**
     * الحصول على سجل الانقطاعات
     */
    async getOfflineHistory(companyId: string, startDate: Date, endDate: Date) {
        return this.prisma.employeeOfflineEvent.findMany({
            where: {
                companyId,
                startedAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: { startedAt: 'desc' },
        });
    }
}
