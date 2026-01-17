/**
 * MUDAD Validation Service
 *
 * بوابة التحقق من صحة ملفات WPS قبل التقديم لنظام مُدد
 * نظام حماية الأجور السعودي - Wage Protection System
 *
 * Validates payroll data against MUDAD requirements:
 * - Employee identification (National ID/Iqama)
 * - Valid IBAN format (SA + 22 digits)
 * - Positive net salary amounts
 * - Required salary components
 * - Valid bank codes
 * - Complete company information
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

// ============================================
// Constants - MUDAD Requirements
// ============================================

/** متطلبات نظام مُدد */
export const MUDAD_REQUIREMENTS = {
    /** الحد الأدنى لطول IBAN السعودي (SA + 22 رقم = 24 حرف) */
    IBAN_MIN_LENGTH: 24,
    /** الحد الأقصى لطول IBAN السعودي */
    IBAN_MAX_LENGTH: 24,
    /** بادئة IBAN السعودي */
    IBAN_PREFIX: 'SA',
    /** الحد الأدنى للراتب الصافي (1 ريال) */
    MIN_NET_SALARY: 1,
    /** الحد الأقصى للراتب الصافي (معقول) */
    MAX_NET_SALARY: 1000000,
    /** الحد الأدنى لطول رقم الهوية/الإقامة */
    NATIONAL_ID_MIN_LENGTH: 10,
    /** الحد الأقصى لطول رقم الهوية/الإقامة */
    NATIONAL_ID_MAX_LENGTH: 10,
    /** رموز البنوك السعودية المعتمدة */
    VALID_BANK_CODES: [
        '05', // البنك الأهلي السعودي
        '10', // الراجحي
        '15', // الرياض
        '20', // العربي الوطني
        '30', // الفرنسي
        '40', // البلاد
        '45', // الإنماء
        '50', // الجزيرة
        '55', // الخليج الدولي
        '60', // الأول
        '65', // ساب
        '71', // الاستثمار
        '75', // بنك الخليج
        '76', // البنك السعودي الهولندي
        '80', // البنك السعودي البريطاني ساب
        '85', // دويتشه
    ],
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
    employeeCode?: string;
    employeeName?: string;
    expected?: number | string;
    actual?: number | string;
    suggestion?: string;
}

export interface MudadValidationResult {
    isValid: boolean;
    canProceed: boolean; // يمكن المتابعة حتى مع التحذيرات
    readyForSubmission: boolean; // جاهز للتقديم (لا أخطاء)
    issues: ValidationIssue[];
    summary: {
        errors: number;
        warnings: number;
        info: number;
        totalEmployees: number;
        validEmployees: number;
        totalAmount: number;
    };
    validatedAt: Date;
    payrollRunId: string;
    period: string;
}

export interface EmployeeValidationContext {
    employeeCode: string;
    employeeName: string;
    nationalId: string | null;
    iban: string | null;
    bankCode: string | null;
    netSalary: number;
    baseSalary: number;
}

// ============================================
// Validation Service
// ============================================

@Injectable()
export class MudadValidatorService {
    private readonly logger = new Logger(MudadValidatorService.name);

    constructor(private prisma: PrismaService) {}

    /**
     * البوابة الرئيسية للتحقق من صحة ملف WPS قبل التقديم لمُدد
     * Main validation gate - must pass before MUDAD submission
     */
    async validateForMudad(
        payrollRunId: string,
        companyId: string,
        options?: {
            strictMode?: boolean; // رفض أي تحذيرات
            skipCompanyValidation?: boolean; // تخطي التحقق من بيانات الشركة
        }
    ): Promise<MudadValidationResult> {
        const issues: ValidationIssue[] = [];
        const strictMode = options?.strictMode ?? false;
        const skipCompanyValidation = options?.skipCompanyValidation ?? false;

        // 1. جلب بيانات تشغيل الرواتب
        const payrollRun = await this.prisma.payrollRun.findFirst({
            where: { id: payrollRunId, companyId },
            include: {
                period: true,
                payslips: {
                    include: {
                        employee: {
                            include: {
                                bankAccounts: {
                                    where: { isPrimary: true },
                                    take: 1,
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!payrollRun) {
            issues.push({
                code: 'MUDAD_PAYROLL_NOT_FOUND',
                severity: 'ERROR',
                message: 'Payroll run not found',
                messageAr: 'مسيرة الرواتب غير موجودة',
                suggestion: 'Verify the payroll run ID is correct',
            });

            return this.buildResult(payrollRunId, '', 0, 0, issues);
        }

        // 2. التحقق من حالة المسيرة
        this.validatePayrollRunStatus(payrollRun, issues);

        // 3. التحقق من بيانات الشركة (إذا لم يتم التخطي)
        if (!skipCompanyValidation) {
            await this.validateCompanyData(companyId, issues);
        }

        // 4. التحقق من بيانات الموظفين
        let totalAmount = 0;
        let validEmployees = 0;
        const totalEmployees = payrollRun.payslips.length;

        for (const payslip of payrollRun.payslips) {
            const employeeCtx = this.buildEmployeeContext(payslip);
            const employeeValid = this.validateEmployee(employeeCtx, issues);

            if (employeeValid) {
                validEmployees++;
                totalAmount += employeeCtx.netSalary;
            }
        }

        // 5. التحقق من وجود موظفين
        this.validateEmployeeCount(totalEmployees, issues);

        // بناء النتيجة
        const period = `${payrollRun.period.year}-${String(payrollRun.period.month).padStart(2, '0')}`;
        const result = this.buildResult(
            payrollRunId,
            period,
            totalEmployees,
            totalAmount,
            issues
        );

        result.summary.validEmployees = validEmployees;

        // في الوضع الصارم، أي تحذير يمنع المتابعة
        if (strictMode && result.summary.warnings > 0) {
            result.canProceed = false;
            result.readyForSubmission = false;
        }

        this.logValidationResult(payrollRunId, result);

        return result;
    }

    /**
     * التحقق السريع - للتحقق فقط دون منع
     */
    async quickValidate(payrollRunId: string, companyId: string): Promise<{
        hasData: boolean;
        isValid: boolean;
        errorCount: number;
        warningCount: number;
    }> {
        const payrollRun = await this.prisma.payrollRun.findFirst({
            where: { id: payrollRunId, companyId },
            include: {
                payslips: {
                    take: 1,
                },
            },
        });

        if (!payrollRun || payrollRun.payslips.length === 0) {
            return {
                hasData: false,
                isValid: false,
                errorCount: 1,
                warningCount: 0,
            };
        }

        const fullResult = await this.validateForMudad(payrollRunId, companyId);

        return {
            hasData: true,
            isValid: fullResult.isValid,
            errorCount: fullResult.summary.errors,
            warningCount: fullResult.summary.warnings,
        };
    }

    // ============================================
    // Private Validation Methods
    // ============================================

    /**
     * التحقق من حالة مسيرة الرواتب
     */
    private validatePayrollRunStatus(payrollRun: any, issues: ValidationIssue[]): void {
        const validStatuses = ['FINANCE_APPROVED', 'LOCKED', 'PAID'];

        if (!validStatuses.includes(payrollRun.status)) {
            issues.push({
                code: 'MUDAD_INVALID_PAYROLL_STATUS',
                severity: 'ERROR',
                message: `Payroll run must be approved before MUDAD submission. Current status: ${payrollRun.status}`,
                messageAr: `يجب اعتماد الرواتب قبل التقديم لمُدد. الحالة الحالية: ${payrollRun.status}`,
                field: 'status',
                expected: 'FINANCE_APPROVED, LOCKED, or PAID',
                actual: payrollRun.status,
                suggestion: 'Complete the payroll approval workflow first',
            });
        }
    }

    /**
     * التحقق من بيانات الشركة
     */
    private async validateCompanyData(companyId: string, issues: ValidationIssue[]): Promise<void> {
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
        });

        if (!company) {
            issues.push({
                code: 'MUDAD_COMPANY_NOT_FOUND',
                severity: 'ERROR',
                message: 'Company not found',
                messageAr: 'الشركة غير موجودة',
                suggestion: 'Verify company configuration',
            });
            return;
        }

        // التحقق من رقم السجل التجاري
        if (!company.crNumber) {
            issues.push({
                code: 'MUDAD_MISSING_CR_NUMBER',
                severity: 'ERROR',
                message: 'Commercial registration number is required for MUDAD',
                messageAr: 'رقم السجل التجاري مطلوب لنظام مُدد',
                field: 'crNumber',
                suggestion: 'Add CR number in company settings',
            });
        }

        // التحقق من الحساب البنكي للشركة
        const companyBankAccount = await this.prisma.companyBankAccount.findFirst({
            where: { companyId, isPrimary: true, isActive: true },
        });

        if (!companyBankAccount) {
            issues.push({
                code: 'MUDAD_MISSING_COMPANY_BANK',
                severity: 'ERROR',
                message: 'Company primary bank account is required',
                messageAr: 'الحساب البنكي الرئيسي للشركة مطلوب',
                field: 'companyBankAccount',
                suggestion: 'Add primary bank account in company bank accounts settings',
            });
        } else {
            // التحقق من IBAN الشركة
            if (!this.validateIBAN(companyBankAccount.iban)) {
                issues.push({
                    code: 'MUDAD_INVALID_COMPANY_IBAN',
                    severity: 'ERROR',
                    message: 'Company IBAN format is invalid',
                    messageAr: 'صيغة IBAN للشركة غير صحيحة',
                    field: 'companyIban',
                    actual: companyBankAccount.iban,
                    suggestion: 'Verify company IBAN is in Saudi format (SA + 22 digits)',
                });
            }
        }
    }

    /**
     * بناء سياق الموظف للتحقق
     */
    private buildEmployeeContext(payslip: any): EmployeeValidationContext {
        const employee = payslip.employee;
        const bankAccount = employee.bankAccounts[0];

        return {
            employeeCode: employee.employeeCode || 'N/A',
            employeeName: `${employee.firstName} ${employee.lastName}`,
            nationalId: employee.nationalId,
            iban: bankAccount?.iban || null,
            bankCode: bankAccount?.bankCode || null,
            netSalary: Number(payslip.netSalary || 0),
            baseSalary: Number(payslip.baseSalary || 0),
        };
    }

    /**
     * التحقق من بيانات موظف واحد
     * Returns true if employee is valid
     */
    private validateEmployee(ctx: EmployeeValidationContext, issues: ValidationIssue[]): boolean {
        let isValid = true;

        // 1. التحقق من رقم الهوية/الإقامة
        if (!ctx.nationalId) {
            issues.push({
                code: 'MUDAD_MISSING_NATIONAL_ID',
                severity: 'ERROR',
                message: 'National ID/Iqama is required for MUDAD',
                messageAr: 'رقم الهوية/الإقامة مطلوب لنظام مُدد',
                field: 'nationalId',
                employeeCode: ctx.employeeCode,
                employeeName: ctx.employeeName,
                suggestion: 'Add national ID in employee profile',
            });
            isValid = false;
        } else if (!this.validateNationalId(ctx.nationalId)) {
            issues.push({
                code: 'MUDAD_INVALID_NATIONAL_ID',
                severity: 'ERROR',
                message: 'National ID format is invalid',
                messageAr: 'صيغة رقم الهوية/الإقامة غير صحيحة',
                field: 'nationalId',
                employeeCode: ctx.employeeCode,
                employeeName: ctx.employeeName,
                actual: ctx.nationalId,
                suggestion: 'National ID must be exactly 10 digits',
            });
            isValid = false;
        }

        // 2. التحقق من الحساب البنكي
        if (!ctx.iban) {
            issues.push({
                code: 'MUDAD_MISSING_BANK_ACCOUNT',
                severity: 'ERROR',
                message: 'Primary bank account is required',
                messageAr: 'الحساب البنكي الرئيسي مطلوب',
                field: 'bankAccount',
                employeeCode: ctx.employeeCode,
                employeeName: ctx.employeeName,
                suggestion: 'Add primary bank account for employee',
            });
            isValid = false;
        } else if (!this.validateIBAN(ctx.iban)) {
            issues.push({
                code: 'MUDAD_INVALID_IBAN',
                severity: 'ERROR',
                message: 'IBAN format is invalid',
                messageAr: 'صيغة IBAN غير صحيحة',
                field: 'iban',
                employeeCode: ctx.employeeCode,
                employeeName: ctx.employeeName,
                actual: ctx.iban,
                suggestion: 'IBAN must be in Saudi format (SA + 22 digits)',
            });
            isValid = false;
        }

        // 3. التحقق من رمز البنك
        if (ctx.bankCode && !this.validateBankCode(ctx.bankCode)) {
            issues.push({
                code: 'MUDAD_INVALID_BANK_CODE',
                severity: 'WARNING',
                message: 'Bank code may not be recognized by MUDAD',
                messageAr: 'رمز البنك قد لا يكون معترف به من نظام مُدد',
                field: 'bankCode',
                employeeCode: ctx.employeeCode,
                employeeName: ctx.employeeName,
                actual: ctx.bankCode,
                suggestion: 'Verify bank code is correct',
            });
        }

        // 4. التحقق من الراتب الصافي
        if (ctx.netSalary <= 0) {
            issues.push({
                code: 'MUDAD_INVALID_NET_SALARY',
                severity: 'ERROR',
                message: 'Net salary must be positive',
                messageAr: 'الراتب الصافي يجب أن يكون موجب',
                field: 'netSalary',
                employeeCode: ctx.employeeCode,
                employeeName: ctx.employeeName,
                actual: ctx.netSalary,
                expected: `> ${MUDAD_REQUIREMENTS.MIN_NET_SALARY}`,
                suggestion: 'Review employee deductions and earnings',
            });
            isValid = false;
        } else if (ctx.netSalary > MUDAD_REQUIREMENTS.MAX_NET_SALARY) {
            issues.push({
                code: 'MUDAD_EXCESSIVE_NET_SALARY',
                severity: 'WARNING',
                message: 'Net salary is unusually high',
                messageAr: 'الراتب الصافي مرتفع بشكل غير عادي',
                field: 'netSalary',
                employeeCode: ctx.employeeCode,
                employeeName: ctx.employeeName,
                actual: ctx.netSalary,
                suggestion: 'Verify salary amount is correct',
            });
        }

        // 5. التحقق من الراتب الأساسي
        if (ctx.baseSalary <= 0) {
            issues.push({
                code: 'MUDAD_MISSING_BASE_SALARY',
                severity: 'WARNING',
                message: 'Base salary should be defined',
                messageAr: 'يُنصح بتعريف الراتب الأساسي',
                field: 'baseSalary',
                employeeCode: ctx.employeeCode,
                employeeName: ctx.employeeName,
                suggestion: 'Define base salary in employee contract',
            });
        }

        return isValid;
    }

    /**
     * التحقق من عدد الموظفين
     */
    private validateEmployeeCount(count: number, issues: ValidationIssue[]): void {
        if (count === 0) {
            issues.push({
                code: 'MUDAD_NO_EMPLOYEES',
                severity: 'ERROR',
                message: 'No employees found in payroll run',
                messageAr: 'لا يوجد موظفين في مسيرة الرواتب',
                suggestion: 'Ensure payroll run has processed payslips',
            });
        }
    }

    // ============================================
    // Format Validators
    // ============================================

    /**
     * التحقق من صحة IBAN السعودي
     * Saudi IBAN format: SA + 22 digits
     */
    private validateIBAN(iban: string): boolean {
        if (!iban) return false;

        // إزالة المسافات
        const cleanIban = iban.replace(/\s/g, '').toUpperCase();

        // التحقق من الطول
        if (cleanIban.length !== MUDAD_REQUIREMENTS.IBAN_MAX_LENGTH) {
            return false;
        }

        // التحقق من البادئة
        if (!cleanIban.startsWith(MUDAD_REQUIREMENTS.IBAN_PREFIX)) {
            return false;
        }

        // التحقق من أن الباقي أرقام
        const numbers = cleanIban.slice(2);
        return /^\d{22}$/.test(numbers);
    }

    /**
     * التحقق من صحة رقم الهوية/الإقامة
     * Must be exactly 10 digits
     */
    private validateNationalId(nationalId: string): boolean {
        if (!nationalId) return false;

        const clean = nationalId.trim();

        return (
            clean.length === MUDAD_REQUIREMENTS.NATIONAL_ID_MAX_LENGTH &&
            /^\d{10}$/.test(clean)
        );
    }

    /**
     * التحقق من رمز البنك
     */
    private validateBankCode(bankCode: string): boolean {
        if (!bankCode) return false;
        return MUDAD_REQUIREMENTS.VALID_BANK_CODES.includes(bankCode);
    }

    // ============================================
    // Helper Methods
    // ============================================

    /**
     * بناء نتيجة التحقق
     */
    private buildResult(
        payrollRunId: string,
        period: string,
        totalEmployees: number,
        totalAmount: number,
        issues: ValidationIssue[]
    ): MudadValidationResult {
        const errors = issues.filter(i => i.severity === 'ERROR');
        const warnings = issues.filter(i => i.severity === 'WARNING');
        const info = issues.filter(i => i.severity === 'INFO');

        const isValid = errors.length === 0;
        const readyForSubmission = errors.length === 0;
        const canProceed = errors.length === 0;

        return {
            isValid,
            canProceed,
            readyForSubmission,
            issues,
            summary: {
                errors: errors.length,
                warnings: warnings.length,
                info: info.length,
                totalEmployees,
                validEmployees: 0, // سيتم تحديثه في الدالة الرئيسية
                totalAmount,
            },
            validatedAt: new Date(),
            payrollRunId,
            period,
        };
    }

    /**
     * تسجيل نتيجة التحقق
     */
    private logValidationResult(payrollRunId: string, result: MudadValidationResult): void {
        const { summary } = result;

        if (!result.isValid) {
            this.logger.warn(
                `MUDAD validation failed for payroll ${payrollRunId}: ` +
                `${summary.errors} errors, ${summary.warnings} warnings`
            );
        } else if (summary.warnings > 0) {
            this.logger.log(
                `MUDAD validation passed with warnings for payroll ${payrollRunId}: ` +
                `${summary.warnings} warnings`
            );
        } else {
            this.logger.log(
                `MUDAD validation successful for payroll ${payrollRunId}: ` +
                `${summary.totalEmployees} employees, SAR ${summary.totalAmount.toFixed(2)}`
            );
        }
    }
}
