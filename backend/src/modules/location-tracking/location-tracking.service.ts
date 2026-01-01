import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GeofenceService } from '../attendance/services/geofence.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PermissionsService } from '../permissions/permissions.service';
import { UpdateLocationDto, LocationHistoryQueryDto, ActiveEmployeeDto, LiveLocationDto } from './dto/location-tracking.dto';
import { NotificationType } from '@prisma/client';

@Injectable()
export class LocationTrackingService {
    private readonly logger = new Logger(LocationTrackingService.name);
    // الفاصل الزمني للتحديث (بالثواني)
    private readonly LOCATION_UPDATE_INTERVAL = 30;
    // مدة الإشعار للخروج من النطاق (بالدقائق)
    private readonly EXIT_NOTIFICATION_COOLDOWN = 5;
    // عدد الأيام للاحتفاظ بسجلات المواقع
    private readonly DATA_RETENTION_DAYS = 30;

    constructor(
        private prisma: PrismaService,
        private geofenceService: GeofenceService,
        private notificationsService: NotificationsService,
        private permissionsService: PermissionsService,
    ) { }

    /**
     * تحديث موقع الموظف
     * يتم استدعاؤها من التطبيق كل 30 ثانية
     */
    async updateLocation(userId: string, dto: UpdateLocationDto): Promise<LiveLocationDto> {
        // الحصول على بيانات المستخدم
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                branch: true,
                company: true,
            },
        });

        if (!user) {
            throw new NotFoundException('المستخدم غير موجود');
        }

        if (!user.branch) {
            throw new ForbiddenException('لم يتم تعيين فرع للموظف');
        }

        // التحقق من أن الموظف سجل حضوره اليوم
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await this.prisma.attendance.findUnique({
            where: {
                userId_date: {
                    userId,
                    date: today,
                },
            },
        });

        if (!attendance?.checkInTime || attendance.checkOutTime) {
            throw new ForbiddenException('لا يمكن تتبع الموقع إلا بعد تسجيل الحضور وقبل الانصراف');
        }

        // حساب المسافة من الفرع
        const geofenceResult = this.geofenceService.isWithinGeofence(
            dto.latitude,
            dto.longitude,
            Number(user.branch.latitude),
            Number(user.branch.longitude),
            user.branch.geofenceRadius,
        );

        const isInsideGeofence = geofenceResult.isWithin;
        const distanceFromBranch = geofenceResult.distance;

        // تسجيل الموقع في قاعدة البيانات
        const locationLog = await this.prisma.employeeLocationLog.create({
            data: {
                companyId: user.companyId,
                userId,
                latitude: dto.latitude,
                longitude: dto.longitude,
                accuracy: dto.accuracy,
                isInsideGeofence,
                distanceFromBranch,
                batteryLevel: dto.batteryLevel,
                deviceInfo: dto.deviceInfo,
            },
        });

        // التعامل مع الخروج من النطاق
        if (!isInsideGeofence) {
            await this.handleGeofenceExit(user, attendance.id, dto.latitude, dto.longitude, distanceFromBranch);
        } else {
            // التعامل مع العودة للنطاق
            await this.handleGeofenceReturn(user, attendance.id, dto.latitude, dto.longitude);
        }

        return {
            userId,
            latitude: dto.latitude,
            longitude: dto.longitude,
            isInsideGeofence,
            distanceFromBranch,
            accuracy: dto.accuracy,
            batteryLevel: dto.batteryLevel,
            updatedAt: locationLog.createdAt,
        };
    }

    /**
     * التعامل مع خروج الموظف من نطاق الشركة
     */
    private async handleGeofenceExit(
        user: any,
        attendanceId: string,
        latitude: number,
        longitude: number,
        distance: number,
    ) {
        // البحث عن حدث خروج نشط (لم يعد بعد)
        const activeExit = await this.prisma.geofenceExitEvent.findFirst({
            where: {
                userId: user.id,
                attendanceId,
                returnTime: null,
            },
            orderBy: { exitTime: 'desc' },
        });

        // إذا كان هناك حدث خروج نشط، لا نسجل جديد
        if (activeExit) {
            return;
        }

        // إنشاء حدث خروج جديد
        const exitEvent = await this.prisma.geofenceExitEvent.create({
            data: {
                companyId: user.companyId,
                userId: user.id,
                attendanceId,
                exitLatitude: latitude,
                exitLongitude: longitude,
                distanceFromBranch: distance,
                exitTime: new Date(),
                notificationSent: true,
            },
        });

        // إشعار المسؤولين
        await this.notifyManagersOnExit(user, distance, exitEvent.id);
    }

    /**
     * التعامل مع عودة الموظف للنطاق
     */
    private async handleGeofenceReturn(
        user: any,
        attendanceId: string,
        latitude: number,
        longitude: number,
    ) {
        // البحث عن حدث خروج نشط
        const activeExit = await this.prisma.geofenceExitEvent.findFirst({
            where: {
                userId: user.id,
                attendanceId,
                returnTime: null,
            },
            orderBy: { exitTime: 'desc' },
        });

        if (!activeExit) {
            return;
        }

        // حساب مدة الخروج
        const exitTime = new Date(activeExit.exitTime);
        const returnTime = new Date();
        const durationMinutes = Math.round((returnTime.getTime() - exitTime.getTime()) / (1000 * 60));

        // تحديث حدث الخروج
        await this.prisma.geofenceExitEvent.update({
            where: { id: activeExit.id },
            data: {
                returnTime,
                returnLatitude: latitude,
                returnLongitude: longitude,
                durationMinutes,
            },
        });

        // إشعار المسؤولين بالعودة
        await this.notifyManagersOnReturn(user, durationMinutes, activeExit.id);
    }

    /**
     * إشعار المسؤولين عند خروج الموظف
     */
    private async notifyManagersOnExit(user: any, distance: number, exitEventId: string) {
        const userName = `${user.firstName} ${user.lastName}`;

        // إشعار المدير المباشر
        if (user.managerId) {
            await this.notificationsService.create({
                companyId: user.companyId,
                userId: user.managerId,
                type: 'EMP_EXIT_GEOFENCE' as NotificationType,
                title: '⚠️ موظف خرج من نطاق الشركة',
                titleEn: 'Employee Left Company Premises',
                body: `${userName} خرج من نطاق الشركة (المسافة: ${distance} متر)`,
                bodyEn: `${userName} left company premises (Distance: ${distance}m)`,
                entityType: 'GEOFENCE_EXIT',
                entityId: exitEventId,
                data: {
                    userId: user.id,
                    employeeCode: user.employeeCode,
                    distance,
                },
            });
        }

        // إشعار HR/ADMIN
        const admins = await this.prisma.user.findMany({
            where: {
                companyId: user.companyId,
                role: { in: ['ADMIN', 'HR'] },
                status: 'ACTIVE',
                id: { not: user.managerId || '' }, // تجنب الإشعار المكرر
            },
            select: { id: true },
        });

        if (admins.length > 0) {
            await this.notificationsService.createMany(
                user.companyId,
                admins.map((a) => a.id),
                'EMP_EXIT_GEOFENCE' as NotificationType,
                '⚠️ موظف خرج من نطاق الشركة',
                `${userName} خرج من نطاق الشركة (المسافة: ${distance} متر)`,
                'GEOFENCE_EXIT',
                exitEventId,
                { userId: user.id, employeeCode: user.employeeCode, distance },
            );
        }
    }

    /**
     * إشعار المسؤولين عند عودة الموظف
     */
    private async notifyManagersOnReturn(user: any, durationMinutes: number, exitEventId: string) {
        const userName = `${user.firstName} ${user.lastName}`;

        // إشعار المدير المباشر
        if (user.managerId) {
            await this.notificationsService.create({
                companyId: user.companyId,
                userId: user.managerId,
                type: 'EMP_RETURN_GEOFENCE' as NotificationType,
                title: '✅ موظف عاد إلى نطاق الشركة',
                titleEn: 'Employee Returned to Company',
                body: `${userName} عاد إلى نطاق الشركة (مدة الغياب: ${durationMinutes} دقيقة)`,
                bodyEn: `${userName} returned to company (Away: ${durationMinutes} min)`,
                entityType: 'GEOFENCE_EXIT',
                entityId: exitEventId,
                data: {
                    userId: user.id,
                    employeeCode: user.employeeCode,
                    durationMinutes,
                },
            });
        }

        // إشعار HR/ADMIN
        const admins = await this.prisma.user.findMany({
            where: {
                companyId: user.companyId,
                role: { in: ['ADMIN', 'HR'] },
                status: 'ACTIVE',
                id: { not: user.managerId || '' },
            },
            select: { id: true },
        });

        if (admins.length > 0) {
            await this.notificationsService.createMany(
                user.companyId,
                admins.map((a) => a.id),
                'EMP_RETURN_GEOFENCE' as NotificationType,
                '✅ موظف عاد إلى الشركة',
                `${userName} عاد إلى نطاق الشركة (مدة الغياب: ${durationMinutes} دقيقة)`,
                'GEOFENCE_EXIT',
                exitEventId,
                { userId: user.id, employeeCode: user.employeeCode, durationMinutes },
            );
        }
    }

    /**
     * الحصول على قائمة الموظفين الحاضرين (النشطين)
     */
    async getActiveEmployees(companyId: string): Promise<ActiveEmployeeDto[]> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activeAttendances = await this.prisma.attendance.findMany({
            where: {
                companyId,
                date: today,
                checkInTime: { not: null },
                checkOutTime: null, // لم يسجل انصراف بعد
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        department: { select: { name: true } },
                    },
                },
                branch: { select: { name: true } },
            },
        });

        const result: ActiveEmployeeDto[] = [];

        for (const attendance of activeAttendances) {
            // آخر موقع للموظف
            const lastLocation = await this.prisma.employeeLocationLog.findFirst({
                where: { userId: attendance.userId },
                orderBy: { createdAt: 'desc' },
            });

            // عدد أحداث الخروج اليوم
            const exitEventsCount = await this.prisma.geofenceExitEvent.count({
                where: {
                    userId: attendance.userId,
                    attendanceId: attendance.id,
                },
            });

            result.push({
                id: attendance.user.id,
                firstName: attendance.user.firstName,
                lastName: attendance.user.lastName,
                employeeCode: attendance.user.employeeCode || '',
                branchName: attendance.branch.name,
                departmentName: attendance.user.department?.name,
                checkInTime: attendance.checkInTime!,
                lastLocation: lastLocation
                    ? {
                        latitude: Number(lastLocation.latitude),
                        longitude: Number(lastLocation.longitude),
                        isInsideGeofence: lastLocation.isInsideGeofence,
                        distanceFromBranch: lastLocation.distanceFromBranch || 0,
                        updatedAt: lastLocation.createdAt,
                    }
                    : undefined,
                exitEvents: exitEventsCount,
            });
        }

        return result;
    }

    /**
     * الحصول على موقع موظف معين (للمسؤولين)
     */
    async getEmployeeLocation(
        requesterId: string,
        targetUserId: string,
        companyId: string,
    ): Promise<LiveLocationDto | null> {
        // التحقق من صلاحية التتبع
        const hasPermission = await this.checkTrackingPermission(requesterId, targetUserId, companyId);
        if (!hasPermission) {
            throw new ForbiddenException('ليس لديك صلاحية تتبع هذا الموظف');
        }

        // آخر موقع
        const lastLocation = await this.prisma.employeeLocationLog.findFirst({
            where: { userId: targetUserId },
            orderBy: { createdAt: 'desc' },
        });

        if (!lastLocation) {
            return null;
        }

        return {
            userId: targetUserId,
            latitude: Number(lastLocation.latitude),
            longitude: Number(lastLocation.longitude),
            isInsideGeofence: lastLocation.isInsideGeofence,
            distanceFromBranch: lastLocation.distanceFromBranch || 0,
            accuracy: lastLocation.accuracy || undefined,
            batteryLevel: lastLocation.batteryLevel || undefined,
            updatedAt: lastLocation.createdAt,
        };
    }

    /**
     * الحصول على سجل المواقع
     */
    async getLocationHistory(
        requesterId: string,
        targetUserId: string,
        companyId: string,
        query: LocationHistoryQueryDto,
    ) {
        // التحقق من الصلاحية
        const hasPermission = await this.checkTrackingPermission(requesterId, targetUserId, companyId);
        if (!hasPermission) {
            throw new ForbiddenException('ليس لديك صلاحية الوصول لسجل هذا الموظف');
        }

        const where: any = {
            userId: targetUserId,
            companyId,
        };

        if (query.startDate) {
            where.createdAt = { ...where.createdAt, gte: new Date(query.startDate) };
        }

        if (query.endDate) {
            where.createdAt = { ...where.createdAt, lte: new Date(query.endDate) };
        }

        if (query.insideOnly !== undefined) {
            where.isInsideGeofence = query.insideOnly;
        }

        const logs = await this.prisma.employeeLocationLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: query.limit || 100,
        });

        return logs.map((log) => ({
            id: log.id,
            latitude: Number(log.latitude),
            longitude: Number(log.longitude),
            isInsideGeofence: log.isInsideGeofence,
            distanceFromBranch: log.distanceFromBranch,
            accuracy: log.accuracy,
            batteryLevel: log.batteryLevel,
            createdAt: log.createdAt,
        }));
    }

    /**
     * الحصول على أحداث الخروج لموظف
     */
    async getExitEvents(
        requesterId: string,
        targetUserId: string,
        companyId: string,
        date?: Date,
    ) {
        const hasPermission = await this.checkTrackingPermission(requesterId, targetUserId, companyId);
        if (!hasPermission) {
            throw new ForbiddenException('ليس لديك صلاحية الوصول لهذه البيانات');
        }

        const where: any = {
            userId: targetUserId,
            companyId,
        };

        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            where.exitTime = {
                gte: startOfDay,
                lte: endOfDay,
            };
        }

        return this.prisma.geofenceExitEvent.findMany({
            where,
            orderBy: { exitTime: 'desc' },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                    },
                },
            },
        });
    }

    /**
     * التحقق من صلاحية التتبع
     */
    private async checkTrackingPermission(
        requesterId: string,
        targetUserId: string,
        companyId: string,
    ): Promise<boolean> {
        // المستخدم يمكنه رؤية موقعه
        if (requesterId === targetUserId) {
            return true;
        }

        const requester = await this.prisma.user.findUnique({
            where: { id: requesterId },
            select: { role: true, id: true },
        });

        if (!requester) {
            return false;
        }

        // ADMIN و HR يمكنهم تتبع الجميع
        if (requester.role === 'ADMIN' || requester.role === 'HR') {
            return true;
        }

        // MANAGER يمكنه تتبع موظفيه
        if (requester.role === 'MANAGER') {
            const isManager = await this.prisma.user.count({
                where: {
                    id: targetUserId,
                    managerId: requesterId,
                },
            });
            return isManager > 0;
        }

        return false;
    }

    /**
     * مهمة مجدولة: حذف سجلات المواقع القديمة
     * تعمل كل يوم الساعة 3 صباحاً
     */
    @Cron('0 3 * * *') // كل يوم الساعة 3:00 صباحاً
    async cleanOldLocationLogs() {
        this.logger.log('🧹 Starting scheduled cleanup of old location logs...');

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.DATA_RETENTION_DAYS);

        try {
            // حذف سجلات المواقع القديمة
            const deletedLogs = await this.prisma.employeeLocationLog.deleteMany({
                where: {
                    createdAt: { lt: cutoffDate },
                },
            });

            // حذف أحداث الخروج القديمة
            const deletedExits = await this.prisma.geofenceExitEvent.deleteMany({
                where: {
                    exitTime: { lt: cutoffDate },
                },
            });

            this.logger.log(
                `✅ Cleanup complete: Deleted ${deletedLogs.count} location logs and ${deletedExits.count} exit events older than ${this.DATA_RETENTION_DAYS} days`,
            );
        } catch (error) {
            this.logger.error('❌ Failed to cleanup old location data:', error);
        }
    }
}
