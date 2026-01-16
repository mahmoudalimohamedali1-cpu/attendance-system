import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * نتيجة فحص القفل
 */
export interface LockCheckResult {
    isLocked: boolean;
    lockedPeriod?: string;
    lockedAt?: Date;
    lockedBy?: string;
    message?: string;
}

/**
 * حدود قانون العمل السعودي
 */
export const SAUDI_LABOR_LAW_LIMITS = {
    // المادة 95: الحد الأقصى للخصم الشهري 50%
    MAX_MONTHLY_DEDUCTION_PERCENTAGE: 50,
    // المادة 95: الحد الأقصى للعقوبة الواحدة 5 أيام
    MAX_SINGLE_PENALTY_DAYS: 5,
    // الحد الأقصى للإيقاف بدون راتب
    MAX_SUSPENSION_WITHOUT_PAY_DAYS: 5,
    // المادة 80: الفصل يتطلب تحقيق
    TERMINATION_REQUIRES_INVESTIGATION: true,
};

/**
 * خدمة حماية القفل والحدود القانونية
 * Priority 5: Payroll Lock Protection
 * Priority 10: Labor Law Hard Constraints
 * 
 * تتيح هذه الخدمة:
 * - منع تعديل السياسات أثناء فترة الرواتب المقفلة
 * - التحقق من الحدود القانونية للخصومات
 * - ضمان الامتثال لنظام العمل السعودي
 */
@Injectable()
export class PayrollProtectionService {
    private readonly logger = new Logger(PayrollProtectionService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * التحقق مما إذا كانت فترة الرواتب مقفلة
     */
    async isPayrollPeriodLocked(companyId: string, year?: number, month?: number): Promise<LockCheckResult> {
        const now = new Date();
        const targetYear = year || now.getFullYear();
        const targetMonth = month || (now.getMonth() + 1);

        // جلب فترة الرواتب
        const period = await this.prisma.payrollPeriod.findFirst({
            where: {
                companyId,
                year: targetYear,
                month: targetMonth,
            },
        });

        if (!period) {
            return {
                isLocked: false,
                message: 'لا توجد فترة رواتب لهذا الشهر',
            };
        }

        // التحقق من الحالة
        const lockedStatuses = ['LOCKED', 'APPROVED', 'PAID'];

        if (lockedStatuses.includes(period.status)) {
            return {
                isLocked: true,
                lockedPeriod: `${targetYear}-${targetMonth.toString().padStart(2, '0')}`,
                lockedAt: period.lockedAt || undefined,
                lockedBy: period.lockedBy || undefined,
                message: `فترة الرواتب ${targetMonth}/${targetYear} مقفلة ولا يمكن تعديل السياسات`,
            };
        }

        return {
            isLocked: false,
            lockedPeriod: `${targetYear}-${targetMonth.toString().padStart(2, '0')}`,
        };
    }

    /**
     * 🔥 التحقق قبل تعديل السياسة
     * تُستخدم من PolicyApprovalService
     */
    async validatePolicyModification(
        companyId: string,
        policyId: string,
    ): Promise<void> {
        const lockCheck = await this.isPayrollPeriodLocked(companyId);

        if (lockCheck.isLocked) {
            throw new BadRequestException(
                `لا يمكن تعديل السياسة أثناء فترة الرواتب المقفلة (${lockCheck.lockedPeriod}). ` +
                'يرجى الانتظار حتى فتح الفترة الجديدة أو التواصل مع مدير الرواتب.',
            );
        }

        // التحقق من عدم وجود payroll run نشط
        const activeRun = await this.prisma.payrollRun.findFirst({
            where: {
                companyId,
                status: { in: ['PROCESSING', 'CALCULATING'] as any },
            },
        });

        if (activeRun) {
            throw new BadRequestException(
                'لا يمكن تعديل السياسة أثناء معالجة الرواتب. يرجى الانتظار حتى اكتمال العملية.',
            );
        }
    }

    /**
     * 🔥 التحقق من حدود قانون العمل السعودي
     */
    validateLaborLawLimits(
        baseSalary: number,
        totalDeductions: number,
        penaltyDays?: number,
    ): {
        isValid: boolean;
        violations: string[];
        adjustedDeductions?: number;
    } {
        const violations: string[] = [];
        let adjustedDeductions = totalDeductions;

        // التحقق من الحد الأقصى للخصم (50%)
        const maxAllowedDeduction = baseSalary * (SAUDI_LABOR_LAW_LIMITS.MAX_MONTHLY_DEDUCTION_PERCENTAGE / 100);

        if (totalDeductions > maxAllowedDeduction) {
            violations.push(
                `الخصم الإجمالي (${totalDeductions.toFixed(2)} ريال) يتجاوز الحد القانوني ` +
                `(${SAUDI_LABOR_LAW_LIMITS.MAX_MONTHLY_DEDUCTION_PERCENTAGE}% = ${maxAllowedDeduction.toFixed(2)} ريال) - المادة 95`,
            );
            adjustedDeductions = maxAllowedDeduction;
        }

        // التحقق من الحد الأقصى للعقوبة الواحدة
        if (penaltyDays && penaltyDays > SAUDI_LABOR_LAW_LIMITS.MAX_SINGLE_PENALTY_DAYS) {
            violations.push(
                `عدد أيام العقوبة (${penaltyDays}) يتجاوز الحد القانوني ` +
                `(${SAUDI_LABOR_LAW_LIMITS.MAX_SINGLE_PENALTY_DAYS} أيام) - المادة 95`,
            );
        }

        return {
            isValid: violations.length === 0,
            violations,
            adjustedDeductions: violations.length > 0 ? adjustedDeductions : undefined,
        };
    }

    /**
     * تطبيق حدود قانون العمل على نتائج السياسات
     */
    async applyLaborLawCaps(
        employeeId: string,
        companyId: string,
        year: number,
        month: number,
        proposedDeductions: { code: string; amount: number }[],
    ): Promise<{
        original: number;
        capped: number;
        wasCapped: boolean;
        details: { code: string; originalAmount: number; cappedAmount: number }[];
    }> {
        // جلب الراتب الأساسي للموظف
        const employee = await this.prisma.user.findUnique({
            where: { id: employeeId },
            select: { salary: true },
        });

        if (!employee || !employee.salary) {
            this.logger.warn(`Employee ${employeeId} has no salary defined`);
            return {
                original: 0,
                capped: 0,
                wasCapped: false,
                details: [],
            };
        }

        const baseSalary = Number(employee.salary);
        const maxDeduction = baseSalary * (SAUDI_LABOR_LAW_LIMITS.MAX_MONTHLY_DEDUCTION_PERCENTAGE / 100);

        const totalOriginal = proposedDeductions.reduce((sum, d) => sum + d.amount, 0);

        if (totalOriginal <= maxDeduction) {
            return {
                original: totalOriginal,
                capped: totalOriginal,
                wasCapped: false,
                details: proposedDeductions.map(d => ({
                    code: d.code,
                    originalAmount: d.amount,
                    cappedAmount: d.amount,
                })),
            };
        }

        // توزيع نسبي للحد الأقصى
        const ratio = maxDeduction / totalOriginal;
        const cappedDetails = proposedDeductions.map(d => ({
            code: d.code,
            originalAmount: d.amount,
            cappedAmount: Math.round(d.amount * ratio * 100) / 100,
        }));

        this.logger.warn(
            `Deductions capped for employee ${employeeId}: ${totalOriginal} -> ${maxDeduction}`,
        );

        return {
            original: totalOriginal,
            capped: maxDeduction,
            wasCapped: true,
            details: cappedDetails,
        };
    }

    /**
     * جلب حالة القفل لجميع الفترات الأخيرة
     */
    async getRecentPeriodsLockStatus(companyId: string, monthsBack: number = 6) {
        const now = new Date();
        const periods = [];

        for (let i = 0; i < monthsBack; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;

            const period = await this.prisma.payrollPeriod.findFirst({
                where: { companyId, year, month },
                select: {
                    id: true,
                    year: true,
                    month: true,
                    status: true,
                    lockedAt: true,
                    lockedBy: true,
                },
            });

            periods.push({
                period: `${year}-${month.toString().padStart(2, '0')}`,
                exists: !!period,
                status: period?.status || 'NOT_CREATED',
                isLocked: period ? ['LOCKED', 'APPROVED', 'PAID'].includes(period.status) : false,
                lockedAt: period?.lockedAt,
            });
        }

        return periods;
    }

    /**
     * التحقق من إمكانية تطبيق سياسة بأثر رجعي
     */
    async canApplyRetroactively(
        companyId: string,
        startPeriod: string,
        endPeriod: string,
    ): Promise<{
        canApply: boolean;
        blockedPeriods: string[];
        message?: string;
    }> {
        const [startYear, startMonth] = startPeriod.split('-').map(Number);
        const [endYear, endMonth] = endPeriod.split('-').map(Number);

        const blockedPeriods: string[] = [];

        let currentYear = startYear;
        let currentMonth = startMonth;

        while (
            currentYear < endYear ||
            (currentYear === endYear && currentMonth <= endMonth)
        ) {
            const period = await this.prisma.payrollPeriod.findFirst({
                where: {
                    companyId,
                    year: currentYear,
                    month: currentMonth,
                    status: 'PAID', // Only PAID periods block retro application
                },
            });

            if (period) {
                blockedPeriods.push(`${currentYear}-${currentMonth.toString().padStart(2, '0')}`);
            }

            currentMonth++;
            if (currentMonth > 12) {
                currentMonth = 1;
                currentYear++;
            }
        }

        return {
            canApply: blockedPeriods.length === 0,
            blockedPeriods,
            message: blockedPeriods.length > 0
                ? `الفترات التالية تم صرف رواتبها ولا يمكن تعديلها: ${blockedPeriods.join(', ')}`
                : undefined,
        };
    }
}
