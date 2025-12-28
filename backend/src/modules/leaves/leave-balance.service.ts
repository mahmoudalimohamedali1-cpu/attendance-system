import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LeaveTypeConfigService } from './leave-type-config.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * خدمة إدارة أرصدة الإجازات
 * تدير أرصدة الإجازات لكل موظف لكل نوع إجازة
 */
@Injectable()
export class LeaveBalanceService {
    constructor(
        private prisma: PrismaService,
        private leaveTypeConfigService: LeaveTypeConfigService,
    ) { }

    /**
     * الحصول على جميع أرصدة الموظف لسنة معينة
     */
    async getEmployeeBalances(userId: string, year?: number) {
        const targetYear = year || new Date().getFullYear();

        const balances = await this.prisma.leaveBalance.findMany({
            where: { userId, year: targetYear },
            include: {
                leaveType: {
                    select: {
                        id: true,
                        code: true,
                        nameAr: true,
                        nameEn: true,
                        category: true,
                        isPaid: true,
                        allowCarryForward: true,
                        maxBalanceCap: true,
                    },
                },
            },
            orderBy: { leaveType: { sortOrder: 'asc' } },
        });

        // حساب الرصيد المتاح لكل نوع
        return balances.map((balance) => ({
            ...balance,
            available: this.calculateAvailable(balance),
        }));
    }

    /**
     * الحصول على رصيد نوع إجازة محدد
     */
    async getBalance(userId: string, leaveTypeId: string, year?: number) {
        const targetYear = year || new Date().getFullYear();

        const balance = await this.prisma.leaveBalance.findUnique({
            where: {
                userId_leaveTypeId_year: { userId, leaveTypeId, year: targetYear },
            },
            include: { leaveType: true },
        });

        if (!balance) {
            // إنشاء رصيد جديد إذا لم يكن موجوداً
            return this.initializeBalance(userId, leaveTypeId, targetYear);
        }

        return {
            ...balance,
            available: this.calculateAvailable(balance),
        };
    }

    /**
     * تهيئة رصيد جديد للموظف
     */
    async initializeBalance(userId: string, leaveTypeId: string, year: number) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { hireDate: true, companyId: true },
        });

        if (!user) {
            throw new NotFoundException('الموظف غير موجود');
        }

        const leaveType = await this.prisma.leaveTypeConfig.findUnique({
            where: { id: leaveTypeId },
        });

        if (!leaveType) {
            throw new NotFoundException('نوع الإجازة غير موجود');
        }

        // حساب الاستحقاق
        let entitled = leaveType.defaultEntitlement;
        if (leaveType.isEntitlementBased && user.hireDate) {
            entitled = await this.leaveTypeConfigService.calculateEntitlement(
                leaveTypeId,
                user.hireDate,
            );
        }

        // إنشاء الرصيد
        const balance = await this.prisma.leaveBalance.create({
            data: {
                userId,
                leaveTypeId,
                companyId: user.companyId,
                year,
                entitled: new Decimal(entitled),
                carriedForward: new Decimal(0),
                used: new Decimal(0),
                pending: new Decimal(0),
            },
            include: { leaveType: true },
        });

        return {
            ...balance,
            available: entitled,
        };
    }

    /**
     * خصم من الرصيد عند الموافقة على الإجازة
     */
    async deductBalance(userId: string, leaveTypeId: string, days: number, year?: number) {
        const targetYear = year || new Date().getFullYear();

        const balance = await this.prisma.leaveBalance.findUnique({
            where: {
                userId_leaveTypeId_year: { userId, leaveTypeId, year: targetYear },
            },
        });

        if (!balance) {
            throw new NotFoundException('رصيد الإجازة غير موجود');
        }

        const available = this.calculateAvailable(balance);
        const leaveType = await this.prisma.leaveTypeConfig.findUnique({
            where: { id: leaveTypeId },
        });

        // التحقق من الرصيد الكافي (إلا إذا كان مسموح بالسالب)
        if (available < days && !leaveType?.allowNegativeBalance) {
            throw new BadRequestException(
                `رصيد الإجازة غير كافي. المتاح: ${available.toFixed(2)} يوم`,
            );
        }

        // خصم من الرصيد وإزالة من المعلق
        return this.prisma.leaveBalance.update({
            where: { id: balance.id },
            data: {
                used: { increment: days },
                pending: { decrement: days },
            },
        });
    }

    /**
     * إرجاع الرصيد عند إلغاء/رفض الإجازة
     */
    async restoreBalance(userId: string, leaveTypeId: string, days: number, year?: number) {
        const targetYear = year || new Date().getFullYear();

        const balance = await this.prisma.leaveBalance.findUnique({
            where: {
                userId_leaveTypeId_year: { userId, leaveTypeId, year: targetYear },
            },
        });

        if (!balance) {
            return; // لا يوجد رصيد للإرجاع
        }

        return this.prisma.leaveBalance.update({
            where: { id: balance.id },
            data: {
                used: { decrement: days },
            },
        });
    }

    /**
     * تحديث الأيام المعلقة عند تقديم طلب جديد
     */
    async addPendingDays(userId: string, leaveTypeId: string, days: number, year?: number) {
        const targetYear = year || new Date().getFullYear();

        let balance = await this.prisma.leaveBalance.findUnique({
            where: {
                userId_leaveTypeId_year: { userId, leaveTypeId, year: targetYear },
            },
        });

        // إنشاء رصيد إذا لم يكن موجوداً
        if (!balance) {
            await this.initializeBalance(userId, leaveTypeId, targetYear);
            balance = await this.prisma.leaveBalance.findUnique({
                where: {
                    userId_leaveTypeId_year: { userId, leaveTypeId, year: targetYear },
                },
            });
        }

        if (!balance) {
            throw new BadRequestException('فشل في إنشاء رصيد الإجازة');
        }

        return this.prisma.leaveBalance.update({
            where: { id: balance.id },
            data: {
                pending: { increment: days },
            },
        });
    }

    /**
     * إزالة الأيام المعلقة عند الرفض/الإلغاء
     */
    async removePendingDays(userId: string, leaveTypeId: string, days: number, year?: number) {
        const targetYear = year || new Date().getFullYear();

        const balance = await this.prisma.leaveBalance.findUnique({
            where: {
                userId_leaveTypeId_year: { userId, leaveTypeId, year: targetYear },
            },
        });

        if (!balance) {
            return;
        }

        const newPending = Math.max(0, Number(balance.pending) - days);

        return this.prisma.leaveBalance.update({
            where: { id: balance.id },
            data: {
                pending: new Decimal(newPending),
            },
        });
    }

    /**
     * ترحيل الأرصدة في بداية السنة الجديدة
     */
    async carryForwardBalances(companyId: string, fromYear: number) {
        const toYear = fromYear + 1;

        // الحصول على جميع الأرصدة للسنة السابقة
        const previousBalances = await this.prisma.leaveBalance.findMany({
            where: { companyId, year: fromYear },
            include: { leaveType: true, user: true },
        });

        const results = {
            processed: 0,
            carriedForward: 0,
            expired: 0,
        };

        for (const balance of previousBalances) {
            const available = this.calculateAvailable(balance);

            if (available <= 0 || !balance.leaveType.allowCarryForward) {
                results.expired++;
                continue;
            }

            // حساب الأيام المرحلة
            let carryForwardDays = available;
            if (balance.leaveType.maxCarryForwardDays) {
                carryForwardDays = Math.min(available, balance.leaveType.maxCarryForwardDays);
            }

            // حساب تاريخ انتهاء الصلاحية
            let expiresAt: Date | null = null;
            if (balance.leaveType.carryForwardExpiryMonths) {
                expiresAt = new Date(toYear, balance.leaveType.carryForwardExpiryMonths - 1, 1);
            }

            // حساب الاستحقاق الجديد
            let newEntitled = balance.leaveType.defaultEntitlement;
            if (balance.leaveType.isEntitlementBased && balance.user.hireDate) {
                newEntitled = await this.leaveTypeConfigService.calculateEntitlement(
                    balance.leaveTypeId,
                    balance.user.hireDate,
                );
            }

            // إنشاء أو تحديث رصيد السنة الجديدة
            await this.prisma.leaveBalance.upsert({
                where: {
                    userId_leaveTypeId_year: {
                        userId: balance.userId,
                        leaveTypeId: balance.leaveTypeId,
                        year: toYear,
                    },
                },
                create: {
                    userId: balance.userId,
                    leaveTypeId: balance.leaveTypeId,
                    companyId,
                    year: toYear,
                    entitled: new Decimal(newEntitled),
                    carriedForward: new Decimal(carryForwardDays),
                    used: new Decimal(0),
                    pending: new Decimal(0),
                    carryForwardExpiresAt: expiresAt,
                },
                update: {
                    carriedForward: new Decimal(carryForwardDays),
                    carryForwardExpiresAt: expiresAt,
                },
            });

            results.processed++;
            results.carriedForward += carryForwardDays;
        }

        return results;
    }

    /**
     * إعادة حساب أرصدة موظف لسنة معينة
     */
    async recalculateEmployeeBalances(userId: string, year: number) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { companyId: true, hireDate: true },
        });

        if (!user?.companyId) {
            throw new NotFoundException('الموظف غير موجود أو ليس له شركة');
        }

        // الحصول على جميع أنواع الإجازات للشركة
        const leaveTypes = await this.leaveTypeConfigService.getActiveLeaveTypes(user.companyId);

        for (const leaveType of leaveTypes) {
            // حساب الاستحقاق
            let entitled = leaveType.defaultEntitlement;
            if (leaveType.isEntitlementBased && user.hireDate) {
                entitled = await this.leaveTypeConfigService.calculateEntitlement(
                    leaveType.id,
                    user.hireDate,
                );
            }

            // حساب المستخدم من الطلبات المعتمدة
            const approvedRequests = await this.prisma.leaveRequest.aggregate({
                where: {
                    userId,
                    leaveTypeConfigId: leaveType.id,
                    status: 'APPROVED',
                    startDate: {
                        gte: new Date(year, 0, 1),
                        lte: new Date(year, 11, 31),
                    },
                },
                _sum: { approvedDays: true },
            });

            const used = approvedRequests._sum.approvedDays || 0;

            // حساب المعلق من الطلبات المعلقة
            const pendingRequests = await this.prisma.leaveRequest.aggregate({
                where: {
                    userId,
                    leaveTypeConfigId: leaveType.id,
                    status: { in: ['PENDING', 'MGR_APPROVED'] },
                    startDate: {
                        gte: new Date(year, 0, 1),
                        lte: new Date(year, 11, 31),
                    },
                },
                _sum: { requestedDays: true },
            });

            const pending = pendingRequests._sum.requestedDays || 0;

            // الحصول على الرصيد المرحل
            const previousYearBalance = await this.prisma.leaveBalance.findUnique({
                where: {
                    userId_leaveTypeId_year: {
                        userId,
                        leaveTypeId: leaveType.id,
                        year: year - 1,
                    },
                },
            });

            let carriedForward = 0;
            if (previousYearBalance && leaveType.allowCarryForward) {
                const prevAvailable = this.calculateAvailable(previousYearBalance);
                carriedForward = leaveType.maxCarryForwardDays
                    ? Math.min(prevAvailable, leaveType.maxCarryForwardDays)
                    : prevAvailable;
            }

            // تحديث أو إنشاء الرصيد
            await this.prisma.leaveBalance.upsert({
                where: {
                    userId_leaveTypeId_year: { userId, leaveTypeId: leaveType.id, year },
                },
                create: {
                    userId,
                    leaveTypeId: leaveType.id,
                    companyId: user.companyId,
                    year,
                    entitled: new Decimal(entitled),
                    carriedForward: new Decimal(carriedForward),
                    used: new Decimal(used),
                    pending: new Decimal(pending),
                },
                update: {
                    entitled: new Decimal(entitled),
                    used: new Decimal(used),
                    pending: new Decimal(pending),
                },
            });
        }

        return this.getEmployeeBalances(userId, year);
    }

    /**
     * حساب الرصيد المتاح
     */
    private calculateAvailable(balance: {
        entitled: Decimal | number;
        carriedForward: Decimal | number;
        used: Decimal | number;
        pending: Decimal | number;
    }): number {
        const entitled = Number(balance.entitled);
        const carried = Number(balance.carriedForward);
        const used = Number(balance.used);
        const pending = Number(balance.pending);

        return entitled + carried - used - pending;
    }
}
