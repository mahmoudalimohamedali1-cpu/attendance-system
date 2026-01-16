/**
 * GOSI Validation Gate Service
 *
 * بوابة التحقق من صحة إعدادات التأمينات الاجتماعية (GOSI)
 * يجب اجتياز هذه البوابة قبل حساب الرواتب
 *
 * نظام التأمينات الاجتماعية السعودي:
 * - نسبة الموظف: 9% معاش + 0.75% ساند = 9.75%
 * - نسبة صاحب العمل: 9% معاش + 0.75% ساند + 2% أخطار مهنية = 11.75%
 * - الحد الأقصى للراتب الخاضع: 45,000 ريال
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GosiConfig } from '@prisma/client';
import {
    Decimal,
    toDecimal,
    toNumber,
    isPositive,
    isZero,
    ZERO,
} from '../../common/utils/decimal.util';

// ============================================
// Constants - النسب القانونية حسب نظام العمل السعودي
// ============================================

/** النسب القانونية المعتمدة من التأمينات الاجتماعية */
export const GOSI_LEGAL_RATES = {
    /** نسبة معاش الموظف (9%) */
    EMPLOYEE_PENSION: 9.0,
    /** نسبة ساند للموظف (0.75%) */
    EMPLOYEE_SANED: 0.75,
    /** إجمالي نسبة الموظف (9.75%) */
    EMPLOYEE_TOTAL: 9.75,

    /** نسبة معاش صاحب العمل (9%) */
    EMPLOYER_PENSION: 9.0,
    /** نسبة ساند لصاحب العمل (0.75%) */
    EMPLOYER_SANED: 0.75,
    /** نسبة الأخطار المهنية (2%) */
    EMPLOYER_HAZARD: 2.0,
    /** إجمالي نسبة صاحب العمل (11.75%) */
    EMPLOYER_TOTAL: 11.75,

    /** الحد الأقصى للراتب الخاضع */
    MAX_CAP_AMOUNT: 45000,
    /** الحد الأدنى للراتب الخاضع */
    MIN_BASE_SALARY: 1500,

    /** هامش التسامح للنسب (±0.01%) */
    TOLERANCE: 0.01,
} as const;

// ============================================
// Types and Interfaces
// ============================================

export type ValidationSeverity = 'ERROR' | 'WARNING' | 'INFO';

export interface ValidationIssue {
    code: string;
    severity: ValidationSeverity;
    message: string;
    messageAr: string;
    field?: string;
    expected?: number | string;
    actual?: number | string;
    suggestion?: string;
}

export interface GosiValidationResult {
    isValid: boolean;
    canProceed: boolean; // يمكن المتابعة حتى مع التحذيرات
    config: GosiConfig | null;
    issues: ValidationIssue[];
    summary: {
        errors: number;
        warnings: number;
        info: number;
    };
    validatedAt: Date;
}

export interface GosiConfigSnapshot {
    employeeRate: number;
    employerRate: number;
    sanedRate: number;
    hazardRate: number;
    maxCapAmount: number;
    minBaseSalary: number;
    isSaudiOnly: boolean;
    effectiveDate: Date;
    endDate: Date | null;
}

// ============================================
// Validation Service
// ============================================

@Injectable()
export class GosiValidationService {
    private readonly logger = new Logger(GosiValidationService.name);

    constructor(private prisma: PrismaService) {}

    /**
     * البوابة الرئيسية للتحقق من إعدادات GOSI
     * يجب استدعاؤها قبل أي حساب للرواتب
     */
    async validateForPayroll(
        companyId: string,
        periodStartDate: Date,
        options?: {
            strictMode?: boolean; // رفض أي تحذيرات
            allowExpired?: boolean; // السماح بإعدادات منتهية
        }
    ): Promise<GosiValidationResult> {
        const issues: ValidationIssue[] = [];
        const strictMode = options?.strictMode ?? false;
        const allowExpired = options?.allowExpired ?? false;

        // 1. التحقق من وجود إعدادات نشطة
        const config = await this.getActiveConfig(companyId, periodStartDate);

        if (!config) {
            issues.push({
                code: 'GOSI_NO_CONFIG',
                severity: 'ERROR',
                message: 'No active GOSI configuration found for company',
                messageAr: 'لا يوجد إعدادات تأمينات اجتماعية نشطة للشركة',
                suggestion: 'Create a GOSI configuration before running payroll',
            });

            return this.buildResult(null, issues);
        }

        // 2. التحقق من تاريخ السريان
        this.validateEffectiveDate(config, periodStartDate, allowExpired, issues);

        // 3. التحقق من نسبة الموظف
        this.validateEmployeeRate(config, issues);

        // 4. التحقق من نسبة صاحب العمل
        this.validateEmployerRate(config, issues);

        // 5. التحقق من نسبة ساند
        this.validateSanedRate(config, issues);

        // 6. التحقق من نسبة الأخطار المهنية
        this.validateHazardRate(config, issues);

        // 7. التحقق من الحد الأقصى للراتب
        this.validateMaxCap(config, issues);

        // 8. التحقق من الحد الأدنى للراتب
        this.validateMinBaseSalary(config, issues);

        // 9. التحقق من الإجماليات
        this.validateTotals(config, issues);

        // 10. التحقق من إعداد السعوديين فقط
        this.validateSaudiOnlySetting(config, issues);

        const result = this.buildResult(config, issues);

        // في الوضع الصارم، أي تحذير يمنع المتابعة
        if (strictMode && result.summary.warnings > 0) {
            result.canProceed = false;
        }

        this.logValidationResult(companyId, result);

        return result;
    }

    /**
     * التحقق السريع - للتحقق فقط دون منع
     */
    async quickValidate(companyId: string): Promise<{
        hasConfig: boolean;
        isValid: boolean;
        issues: string[];
    }> {
        const config = await this.prisma.gosiConfig.findFirst({
            where: { companyId, isActive: true },
        });

        if (!config) {
            return {
                hasConfig: false,
                isValid: false,
                issues: ['No active GOSI configuration'],
            };
        }

        const issues: string[] = [];
        const employeeTotal = Number(config.employeeRate) + Number(config.sanedRate);
        // Employer total includes: pension + SANED + hazard
        const employerTotal = Number(config.employerRate) + Number(config.sanedRate) + Number(config.hazardRate);

        if (Math.abs(employeeTotal - GOSI_LEGAL_RATES.EMPLOYEE_TOTAL) > GOSI_LEGAL_RATES.TOLERANCE) {
            issues.push(`Employee rate mismatch: ${employeeTotal}% vs ${GOSI_LEGAL_RATES.EMPLOYEE_TOTAL}%`);
        }

        if (Math.abs(employerTotal - GOSI_LEGAL_RATES.EMPLOYER_TOTAL) > GOSI_LEGAL_RATES.TOLERANCE) {
            issues.push(`Employer rate mismatch: ${employerTotal}% vs ${GOSI_LEGAL_RATES.EMPLOYER_TOTAL}%`);
        }

        return {
            hasConfig: true,
            isValid: issues.length === 0,
            issues,
        };
    }

    /**
     * الحصول على الإعدادات النشطة السارية
     */
    private async getActiveConfig(
        companyId: string,
        asOfDate: Date
    ): Promise<GosiConfig | null> {
        return this.prisma.gosiConfig.findFirst({
            where: {
                companyId,
                isActive: true,
                effectiveDate: { lte: asOfDate },
                OR: [
                    { endDate: null },
                    { endDate: { gte: asOfDate } },
                ],
            },
            orderBy: { effectiveDate: 'desc' },
        });
    }

    /**
     * التحقق من تاريخ السريان
     */
    private validateEffectiveDate(
        config: GosiConfig,
        periodStartDate: Date,
        allowExpired: boolean,
        issues: ValidationIssue[]
    ): void {
        const effectiveDate = new Date(config.effectiveDate);
        const endDate = config.endDate ? new Date(config.endDate) : null;

        // التحقق من أن الإعدادات سارية
        if (effectiveDate > periodStartDate) {
            issues.push({
                code: 'GOSI_NOT_YET_EFFECTIVE',
                severity: 'ERROR',
                message: 'GOSI configuration is not yet effective for the payroll period',
                messageAr: 'إعدادات التأمينات لم تدخل حيز التنفيذ بعد لفترة الرواتب',
                field: 'effectiveDate',
                expected: `<= ${periodStartDate.toISOString().split('T')[0]}`,
                actual: effectiveDate.toISOString().split('T')[0],
            });
        }

        // التحقق من انتهاء الصلاحية
        if (endDate && endDate < periodStartDate) {
            issues.push({
                code: 'GOSI_CONFIG_EXPIRED',
                severity: allowExpired ? 'WARNING' : 'ERROR',
                message: 'GOSI configuration has expired',
                messageAr: 'انتهت صلاحية إعدادات التأمينات',
                field: 'endDate',
                expected: `>= ${periodStartDate.toISOString().split('T')[0]}`,
                actual: endDate.toISOString().split('T')[0],
                suggestion: 'Create a new GOSI configuration with updated dates',
            });
        }

        // تحذير إذا كانت الإعدادات ستنتهي قريباً (خلال 30 يوم)
        if (endDate) {
            const daysUntilExpiry = Math.ceil(
                (endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );

            if (daysUntilExpiry > 0 && daysUntilExpiry <= 30) {
                issues.push({
                    code: 'GOSI_EXPIRING_SOON',
                    severity: 'WARNING',
                    message: `GOSI configuration will expire in ${daysUntilExpiry} days`,
                    messageAr: `ستنتهي صلاحية إعدادات التأمينات خلال ${daysUntilExpiry} يوم`,
                    field: 'endDate',
                    suggestion: 'Prepare a new GOSI configuration before expiry',
                });
            }
        }
    }

    /**
     * التحقق من نسبة الموظف
     */
    private validateEmployeeRate(config: GosiConfig, issues: ValidationIssue[]): void {
        const rate = Number(config.employeeRate);

        if (rate < 0 || rate > 100) {
            issues.push({
                code: 'GOSI_EMPLOYEE_RATE_INVALID',
                severity: 'ERROR',
                message: 'Employee rate is out of valid range (0-100)',
                messageAr: 'نسبة الموظف خارج النطاق الصالح (0-100)',
                field: 'employeeRate',
                actual: rate,
            });
            return;
        }

        // التحقق من المطابقة للنسبة القانونية
        if (Math.abs(rate - GOSI_LEGAL_RATES.EMPLOYEE_PENSION) > GOSI_LEGAL_RATES.TOLERANCE) {
            issues.push({
                code: 'GOSI_EMPLOYEE_RATE_MISMATCH',
                severity: 'WARNING',
                message: `Employee pension rate differs from legal rate`,
                messageAr: 'نسبة معاش الموظف تختلف عن النسبة القانونية',
                field: 'employeeRate',
                expected: GOSI_LEGAL_RATES.EMPLOYEE_PENSION,
                actual: rate,
                suggestion: `Set employee rate to ${GOSI_LEGAL_RATES.EMPLOYEE_PENSION}%`,
            });
        }
    }

    /**
     * التحقق من نسبة صاحب العمل
     */
    private validateEmployerRate(config: GosiConfig, issues: ValidationIssue[]): void {
        const rate = Number(config.employerRate);

        if (rate < 0 || rate > 100) {
            issues.push({
                code: 'GOSI_EMPLOYER_RATE_INVALID',
                severity: 'ERROR',
                message: 'Employer rate is out of valid range (0-100)',
                messageAr: 'نسبة صاحب العمل خارج النطاق الصالح (0-100)',
                field: 'employerRate',
                actual: rate,
            });
            return;
        }

        if (Math.abs(rate - GOSI_LEGAL_RATES.EMPLOYER_PENSION) > GOSI_LEGAL_RATES.TOLERANCE) {
            issues.push({
                code: 'GOSI_EMPLOYER_RATE_MISMATCH',
                severity: 'WARNING',
                message: 'Employer pension rate differs from legal rate',
                messageAr: 'نسبة معاش صاحب العمل تختلف عن النسبة القانونية',
                field: 'employerRate',
                expected: GOSI_LEGAL_RATES.EMPLOYER_PENSION,
                actual: rate,
                suggestion: `Set employer rate to ${GOSI_LEGAL_RATES.EMPLOYER_PENSION}%`,
            });
        }
    }

    /**
     * التحقق من نسبة ساند
     */
    private validateSanedRate(config: GosiConfig, issues: ValidationIssue[]): void {
        const rate = Number(config.sanedRate);

        if (rate < 0 || rate > 100) {
            issues.push({
                code: 'GOSI_SANED_RATE_INVALID',
                severity: 'ERROR',
                message: 'SANED rate is out of valid range (0-100)',
                messageAr: 'نسبة ساند خارج النطاق الصالح (0-100)',
                field: 'sanedRate',
                actual: rate,
            });
            return;
        }

        // ساند يجب أن يكون 0.75% للموظف و 0.75% لصاحب العمل
        const expectedSaned = GOSI_LEGAL_RATES.EMPLOYEE_SANED;
        if (Math.abs(rate - expectedSaned) > GOSI_LEGAL_RATES.TOLERANCE) {
            issues.push({
                code: 'GOSI_SANED_RATE_MISMATCH',
                severity: 'WARNING',
                message: 'SANED rate differs from legal rate',
                messageAr: 'نسبة ساند تختلف عن النسبة القانونية',
                field: 'sanedRate',
                expected: expectedSaned,
                actual: rate,
                suggestion: `Set SANED rate to ${expectedSaned}%`,
            });
        }
    }

    /**
     * التحقق من نسبة الأخطار المهنية
     */
    private validateHazardRate(config: GosiConfig, issues: ValidationIssue[]): void {
        const rate = Number(config.hazardRate);

        if (rate < 0 || rate > 100) {
            issues.push({
                code: 'GOSI_HAZARD_RATE_INVALID',
                severity: 'ERROR',
                message: 'Hazard rate is out of valid range (0-100)',
                messageAr: 'نسبة الأخطار المهنية خارج النطاق الصالح (0-100)',
                field: 'hazardRate',
                actual: rate,
            });
            return;
        }

        if (Math.abs(rate - GOSI_LEGAL_RATES.EMPLOYER_HAZARD) > GOSI_LEGAL_RATES.TOLERANCE) {
            issues.push({
                code: 'GOSI_HAZARD_RATE_MISMATCH',
                severity: 'WARNING',
                message: 'Hazard rate differs from legal rate',
                messageAr: 'نسبة الأخطار المهنية تختلف عن النسبة القانونية',
                field: 'hazardRate',
                expected: GOSI_LEGAL_RATES.EMPLOYER_HAZARD,
                actual: rate,
                suggestion: `Set hazard rate to ${GOSI_LEGAL_RATES.EMPLOYER_HAZARD}%`,
            });
        }
    }

    /**
     * التحقق من الحد الأقصى للراتب
     */
    private validateMaxCap(config: GosiConfig, issues: ValidationIssue[]): void {
        const maxCap = Number(config.maxCapAmount);

        if (maxCap <= 0) {
            issues.push({
                code: 'GOSI_MAX_CAP_INVALID',
                severity: 'ERROR',
                message: 'Maximum cap amount must be positive',
                messageAr: 'الحد الأقصى للراتب يجب أن يكون موجباً',
                field: 'maxCapAmount',
                actual: maxCap,
            });
            return;
        }

        // التحقق من الحد الأقصى القانوني
        if (maxCap !== GOSI_LEGAL_RATES.MAX_CAP_AMOUNT) {
            const severity = maxCap > GOSI_LEGAL_RATES.MAX_CAP_AMOUNT ? 'WARNING' : 'INFO';
            issues.push({
                code: 'GOSI_MAX_CAP_DIFFERS',
                severity,
                message: `Maximum cap differs from standard GOSI cap`,
                messageAr: 'الحد الأقصى للراتب يختلف عن الحد القانوني المعتمد',
                field: 'maxCapAmount',
                expected: GOSI_LEGAL_RATES.MAX_CAP_AMOUNT,
                actual: maxCap,
                suggestion: maxCap < GOSI_LEGAL_RATES.MAX_CAP_AMOUNT
                    ? 'Consider increasing to the legal maximum'
                    : 'Verify this cap is intentional',
            });
        }
    }

    /**
     * التحقق من الحد الأدنى للراتب
     */
    private validateMinBaseSalary(config: GosiConfig, issues: ValidationIssue[]): void {
        const minBase = Number(config.minBaseSalary);

        if (minBase < 0) {
            issues.push({
                code: 'GOSI_MIN_BASE_INVALID',
                severity: 'ERROR',
                message: 'Minimum base salary cannot be negative',
                messageAr: 'الحد الأدنى للراتب لا يمكن أن يكون سالباً',
                field: 'minBaseSalary',
                actual: minBase,
            });
        }

        // تحذير إذا كان الحد الأدنى أقل من الحد الأدنى للأجور
        if (minBase > 0 && minBase < GOSI_LEGAL_RATES.MIN_BASE_SALARY) {
            issues.push({
                code: 'GOSI_MIN_BASE_LOW',
                severity: 'INFO',
                message: 'Minimum base salary is below typical minimum wage',
                messageAr: 'الحد الأدنى للراتب أقل من الحد الأدنى للأجور المعتاد',
                field: 'minBaseSalary',
                expected: GOSI_LEGAL_RATES.MIN_BASE_SALARY,
                actual: minBase,
            });
        }
    }

    /**
     * التحقق من الإجماليات
     */
    private validateTotals(config: GosiConfig, issues: ValidationIssue[]): void {
        const employeeTotal = Number(config.employeeRate) + Number(config.sanedRate);
        const employerTotal = Number(config.employerRate) + Number(config.hazardRate) + Number(config.sanedRate);

        // التحقق من إجمالي الموظف
        if (Math.abs(employeeTotal - GOSI_LEGAL_RATES.EMPLOYEE_TOTAL) > GOSI_LEGAL_RATES.TOLERANCE) {
            issues.push({
                code: 'GOSI_EMPLOYEE_TOTAL_MISMATCH',
                severity: 'WARNING',
                message: 'Total employee contribution differs from legal requirement',
                messageAr: 'إجمالي اشتراك الموظف يختلف عن المتطلب القانوني',
                expected: GOSI_LEGAL_RATES.EMPLOYEE_TOTAL,
                actual: employeeTotal,
                suggestion: `Employee total should be ${GOSI_LEGAL_RATES.EMPLOYEE_TOTAL}% (${GOSI_LEGAL_RATES.EMPLOYEE_PENSION}% pension + ${GOSI_LEGAL_RATES.EMPLOYEE_SANED}% SANED)`,
            });
        }

        // التحقق من إجمالي صاحب العمل
        const expectedEmployerTotal = GOSI_LEGAL_RATES.EMPLOYER_PENSION +
            GOSI_LEGAL_RATES.EMPLOYER_SANED +
            GOSI_LEGAL_RATES.EMPLOYER_HAZARD;

        if (Math.abs(employerTotal - expectedEmployerTotal) > GOSI_LEGAL_RATES.TOLERANCE) {
            issues.push({
                code: 'GOSI_EMPLOYER_TOTAL_MISMATCH',
                severity: 'WARNING',
                message: 'Total employer contribution differs from legal requirement',
                messageAr: 'إجمالي مساهمة صاحب العمل يختلف عن المتطلب القانوني',
                expected: expectedEmployerTotal,
                actual: employerTotal,
                suggestion: `Employer total should be ${expectedEmployerTotal}% (${GOSI_LEGAL_RATES.EMPLOYER_PENSION}% pension + ${GOSI_LEGAL_RATES.EMPLOYER_SANED}% SANED + ${GOSI_LEGAL_RATES.EMPLOYER_HAZARD}% hazard)`,
            });
        }
    }

    /**
     * التحقق من إعداد السعوديين فقط
     */
    private validateSaudiOnlySetting(config: GosiConfig, issues: ValidationIssue[]): void {
        // GOSI يطبق فقط على السعوديين بشكل عام
        if (!config.isSaudiOnly) {
            issues.push({
                code: 'GOSI_NOT_SAUDI_ONLY',
                severity: 'INFO',
                message: 'GOSI is configured to apply to non-Saudi employees as well',
                messageAr: 'التأمينات مفعلة لغير السعوديين أيضاً',
                field: 'isSaudiOnly',
                actual: 'false',
                suggestion: 'Standard GOSI applies to Saudi employees only. Verify this setting is intentional.',
            });
        }
    }

    /**
     * بناء نتيجة التحقق
     */
    private buildResult(config: GosiConfig | null, issues: ValidationIssue[]): GosiValidationResult {
        const errors = issues.filter(i => i.severity === 'ERROR').length;
        const warnings = issues.filter(i => i.severity === 'WARNING').length;
        const info = issues.filter(i => i.severity === 'INFO').length;

        return {
            isValid: errors === 0,
            canProceed: errors === 0,
            config,
            issues,
            summary: { errors, warnings, info },
            validatedAt: new Date(),
        };
    }

    /**
     * تسجيل نتيجة التحقق
     */
    private logValidationResult(companyId: string, result: GosiValidationResult): void {
        const status = result.isValid ? 'PASSED' : 'FAILED';
        const level = result.isValid ? 'log' : 'warn';

        this.logger[level](
            `GOSI Validation ${status} for company ${companyId}: ` +
            `${result.summary.errors} errors, ${result.summary.warnings} warnings, ${result.summary.info} info`
        );

        if (!result.isValid) {
            const errorMessages = result.issues
                .filter(i => i.severity === 'ERROR')
                .map(i => `  - ${i.code}: ${i.message}`)
                .join('\n');
            this.logger.error(`GOSI Validation Errors:\n${errorMessages}`);
        }
    }

    /**
     * إنشاء لقطة من الإعدادات للتدقيق
     */
    createConfigSnapshot(config: GosiConfig): GosiConfigSnapshot {
        return {
            employeeRate: Number(config.employeeRate),
            employerRate: Number(config.employerRate),
            sanedRate: Number(config.sanedRate),
            hazardRate: Number(config.hazardRate),
            maxCapAmount: Number(config.maxCapAmount),
            minBaseSalary: Number(config.minBaseSalary),
            isSaudiOnly: config.isSaudiOnly,
            effectiveDate: new Date(config.effectiveDate),
            endDate: config.endDate ? new Date(config.endDate) : null,
        };
    }

    /**
     * الحصول على النسب القانونية المعتمدة
     */
    getLegalRates(): typeof GOSI_LEGAL_RATES {
        return GOSI_LEGAL_RATES;
    }

    /**
     * إنشاء إعدادات GOSI قياسية
     */
    getStandardConfig(): Omit<GosiConfigSnapshot, 'effectiveDate' | 'endDate'> {
        return {
            employeeRate: GOSI_LEGAL_RATES.EMPLOYEE_PENSION,
            employerRate: GOSI_LEGAL_RATES.EMPLOYER_PENSION,
            sanedRate: GOSI_LEGAL_RATES.EMPLOYEE_SANED,
            hazardRate: GOSI_LEGAL_RATES.EMPLOYER_HAZARD,
            maxCapAmount: GOSI_LEGAL_RATES.MAX_CAP_AMOUNT,
            minBaseSalary: 0,
            isSaudiOnly: true,
        };
    }
}
