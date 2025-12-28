import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LeaveCategory } from '@prisma/client';

/**
 * خدمة إدارة أنواع الإجازات
 * تدير إعدادات أنواع الإجازات الديناميكية وشرائح الاستحقاق
 */
@Injectable()
export class LeaveTypeConfigService {
    constructor(private prisma: PrismaService) { }

    /**
     * الحصول على جميع أنواع الإجازات المفعلة للشركة
     */
    async getActiveLeaveTypes(companyId: string) {
        return this.prisma.leaveTypeConfig.findMany({
            where: { companyId, isActive: true },
            include: {
                entitlementTiers: {
                    orderBy: { minServiceYears: 'asc' },
                },
                sickPayTiers: {
                    orderBy: { fromDay: 'asc' },
                },
            },
            orderBy: { sortOrder: 'asc' },
        });
    }

    /**
     * الحصول على نوع إجازة بالكود
     */
    async getLeaveTypeByCode(companyId: string, code: string) {
        const leaveType = await this.prisma.leaveTypeConfig.findUnique({
            where: { companyId_code: { companyId, code } },
            include: {
                entitlementTiers: { orderBy: { minServiceYears: 'asc' } },
                sickPayTiers: { orderBy: { fromDay: 'asc' } },
            },
        });

        if (!leaveType) {
            throw new NotFoundException(`نوع الإجازة ${code} غير موجود`);
        }

        return leaveType;
    }

    /**
     * حساب الاستحقاق بناءً على سنوات الخدمة
     */
    async calculateEntitlement(leaveTypeId: string, hireDate: Date): Promise<number> {
        const leaveType = await this.prisma.leaveTypeConfig.findUnique({
            where: { id: leaveTypeId },
            include: { entitlementTiers: { orderBy: { minServiceYears: 'asc' } } },
        });

        if (!leaveType) {
            throw new NotFoundException('نوع الإجازة غير موجود');
        }

        // إذا لم يكن يعتمد على الاستحقاق، أرجع القيمة الافتراضية
        if (!leaveType.isEntitlementBased) {
            return leaveType.defaultEntitlement;
        }

        // حساب سنوات الخدمة
        const serviceYears = this.calculateServiceYears(hireDate);

        // البحث عن الشريحة المناسبة
        const tier = leaveType.entitlementTiers.find(
            (t) => serviceYears >= t.minServiceYears && serviceYears < t.maxServiceYears,
        );

        return tier?.entitlementDays || leaveType.defaultEntitlement;
    }

    /**
     * حساب أجر الإجازة المرضية المتدرج (نظام العمل السعودي)
     */
    async calculateSickLeavePayment(
        leaveTypeId: string,
        totalSickDaysThisYear: number,
        requestedDays: number,
        dailySalary: number,
    ): Promise<{
        fullPayDays: number;
        partialPayDays: number;
        unpaidDays: number;
        totalPayment: number;
        totalDeduction: number;
    }> {
        const leaveType = await this.prisma.leaveTypeConfig.findUnique({
            where: { id: leaveTypeId },
            include: { sickPayTiers: { orderBy: { fromDay: 'asc' } } },
        });

        if (!leaveType || leaveType.sickPayTiers.length === 0) {
            // لا توجد شرائح - افتراض أجر كامل
            return {
                fullPayDays: requestedDays,
                partialPayDays: 0,
                unpaidDays: 0,
                totalPayment: requestedDays * dailySalary,
                totalDeduction: 0,
            };
        }

        let fullPayDays = 0;
        let partialPayDays = 0;
        let unpaidDays = 0;
        let totalPayment = 0;

        // حساب كل يوم على حدة
        for (let i = 0; i < requestedDays; i++) {
            const dayNumber = totalSickDaysThisYear + i + 1;

            // البحث عن الشريحة المناسبة لهذا اليوم
            const tier = leaveType.sickPayTiers.find(
                (t) => dayNumber >= t.fromDay && dayNumber <= t.toDay,
            );

            const payPercent = tier?.paymentPercent ?? 0;

            if (payPercent === 100) {
                fullPayDays++;
                totalPayment += dailySalary;
            } else if (payPercent > 0) {
                partialPayDays++;
                totalPayment += dailySalary * (payPercent / 100);
            } else {
                unpaidDays++;
            }
        }

        const fullPay = requestedDays * dailySalary;
        const totalDeduction = fullPay - totalPayment;

        return {
            fullPayDays,
            partialPayDays,
            unpaidDays,
            totalPayment,
            totalDeduction,
        };
    }

    /**
     * إعداد البيانات الافتراضية للشركة (متوافق مع نظام العمل السعودي)
     */
    async seedDefaultLeaveTypes(companyId: string) {
        const existingTypes = await this.prisma.leaveTypeConfig.count({
            where: { companyId },
        });

        if (existingTypes > 0) {
            throw new BadRequestException('يوجد بالفعل أنواع إجازات لهذه الشركة');
        }

        // إنشاء الأنواع الافتراضية
        const defaultTypes = [
            // ===== إجازات متوازنة (Balanced) =====
            {
                code: 'ANNUAL',
                nameAr: 'إجازة سنوية',
                nameEn: 'Annual Leave',
                category: LeaveCategory.BALANCED,
                isEntitlementBased: true,
                defaultEntitlement: 21,
                maxBalanceCap: 60,
                allowCarryForward: true,
                maxCarryForwardDays: 30,
                isPaid: true,
                paymentPercentage: 100,
                minNoticeDays: 7,
                sortOrder: 1,
                entitlementTiers: [
                    { minServiceYears: 0, maxServiceYears: 5, entitlementDays: 21 },
                    { minServiceYears: 5, maxServiceYears: 10, entitlementDays: 25 },
                    { minServiceYears: 10, maxServiceYears: 999, entitlementDays: 30 },
                ],
            },
            // ===== إجازات مرضية (Sick) =====
            {
                code: 'SICK',
                nameAr: 'إجازة مرضية',
                nameEn: 'Sick Leave',
                category: LeaveCategory.SICK,
                isEntitlementBased: true,
                defaultEntitlement: 30,
                allowCarryForward: false,
                isPaid: true,
                requiresAttachment: true,
                attachmentRequiredAfterDays: 3,
                sortOrder: 2,
                sickPayTiers: [
                    { fromDay: 1, toDay: 30, paymentPercent: 100 },
                    { fromDay: 31, toDay: 90, paymentPercent: 75 },
                    { fromDay: 91, toDay: 120, paymentPercent: 0 },
                ],
            },
            // ===== إجازات عارضة (Casual) =====
            {
                code: 'MARRIAGE',
                nameAr: 'إجازة زواج',
                nameEn: 'Marriage Leave',
                category: LeaveCategory.CASUAL,
                isEntitlementBased: false,
                defaultEntitlement: 5,
                allowCarryForward: false,
                isPaid: true,
                isOneTimeOnly: true,
                requiresAttachment: true,
                sortOrder: 3,
            },
            {
                code: 'BEREAVEMENT',
                nameAr: 'إجازة وفاة',
                nameEn: 'Bereavement Leave',
                category: LeaveCategory.CASUAL,
                isEntitlementBased: false,
                defaultEntitlement: 5,
                allowCarryForward: false,
                isPaid: true,
                requiresAttachment: true,
                sortOrder: 4,
            },
            {
                code: 'NEW_BABY',
                nameAr: 'إجازة مولود جديد',
                nameEn: 'Paternity Leave',
                category: LeaveCategory.CASUAL,
                isEntitlementBased: false,
                defaultEntitlement: 3,
                allowCarryForward: false,
                isPaid: true,
                requiresAttachment: true,
                sortOrder: 5,
            },
            {
                code: 'HAJJ',
                nameAr: 'إجازة حج',
                nameEn: 'Hajj Leave',
                category: LeaveCategory.CASUAL,
                isEntitlementBased: false,
                defaultEntitlement: 15,
                allowCarryForward: false,
                isPaid: true,
                isOneTimeOnly: true,
                minNoticeDays: 30,
                sortOrder: 6,
            },
            {
                code: 'EXAM',
                nameAr: 'إجازة اختبارات',
                nameEn: 'Exam Leave',
                category: LeaveCategory.CASUAL,
                isEntitlementBased: false,
                defaultEntitlement: 0,
                allowCarryForward: false,
                isPaid: true,
                requiresAttachment: true,
                sortOrder: 7,
            },
            // ===== إجازات بدون راتب (Unpaid) =====
            {
                code: 'UNPAID',
                nameAr: 'إجازة بدون راتب',
                nameEn: 'Unpaid Leave',
                category: LeaveCategory.UNPAID,
                isEntitlementBased: false,
                defaultEntitlement: 0,
                allowCarryForward: false,
                isPaid: false,
                allowNegativeBalance: true,
                sortOrder: 10,
            },
        ];

        // إنشاء الأنواع مع الشرائح
        for (const typeData of defaultTypes) {
            const { entitlementTiers, sickPayTiers, ...leaveTypeData } = typeData;

            const leaveType = await this.prisma.leaveTypeConfig.create({
                data: {
                    companyId,
                    ...leaveTypeData,
                },
            });

            // إنشاء شرائح الاستحقاق
            if (entitlementTiers) {
                await this.prisma.leaveEntitlementTier.createMany({
                    data: entitlementTiers.map((tier) => ({
                        leaveTypeId: leaveType.id,
                        ...tier,
                    })),
                });
            }

            // إنشاء شرائح الأجر المرضي
            if (sickPayTiers) {
                await this.prisma.sickPayTier.createMany({
                    data: sickPayTiers.map((tier) => ({
                        leaveTypeId: leaveType.id,
                        ...tier,
                    })),
                });
            }
        }

        return { message: 'تم إعداد أنواع الإجازات الافتراضية بنجاح', count: defaultTypes.length };
    }

    /**
     * حساب سنوات الخدمة
     */
    private calculateServiceYears(hireDate: Date): number {
        const now = new Date();
        const diffMs = now.getTime() - new Date(hireDate).getTime();
        return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));
    }
}
