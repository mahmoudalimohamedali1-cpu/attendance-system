import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
    Decimal,
    toDecimal,
    toNumber,
    toFixed,
    add,
    sub,
    mul,
    div,
    abs,
    isPositive,
    isNegative,
    isZero,
    ZERO,
} from '../../common/utils/decimal.util';

/**
 * 🔍 Payroll Validation Service
 * خدمة التحقق من صحة الرواتب قبل الإغلاق
 *
 * تتحقق من:
 * - تطابق الأرصدة (Earnings = Deductions + Net)
 * - عدم وجود قيم غير منطقية
 * - اكتمال بيانات الموظفين
 * - صحة حسابات GOSI
 * - عدم وجود تكرارات
 * - الحدود القصوى والدنيا
 */

export interface ValidationIssue {
    code: string;
    severity: 'ERROR' | 'WARNING' | 'INFO';
    employeeId?: string;
    employeeName?: string;
    field?: string;
    message: string;
    messageAr: string;
    expectedValue?: string;
    actualValue?: string;
    suggestion?: string;
}

export interface PayrollValidationResult {
    isValid: boolean;
    canProceed: boolean; // يمكن المتابعة رغم التحذيرات
    runId: string;
    periodId: string;
    summary: {
        totalPayslips: number;
        validPayslips: number;
        invalidPayslips: number;
        errors: number;
        warnings: number;
        infos: number;
    };
    balanceCheck: {
        totalGross: number;
        totalDeductions: number;
        totalNet: number;
        isBalanced: boolean;
        variance: number;
    };
    issues: ValidationIssue[];
    employeeIssues: Record<string, ValidationIssue[]>;
    validatedAt: Date;
}

export interface ValidationOptions {
    strictMode?: boolean; // يمنع المتابعة مع أي تحذير
    skipBalanceCheck?: boolean;
    skipGosiValidation?: boolean;
    skipDuplicateCheck?: boolean;
    tolerancePercent?: number; // نسبة التفاوت المسموحة
    maxSalaryThreshold?: number; // الحد الأقصى للراتب
    minSalaryThreshold?: number; // الحد الأدنى للراتب
}

// الثوابت القانونية
const LEGAL_CONSTANTS = {
    MIN_WAGE_SAUDI: 4000, // الحد الأدنى للأجور للسعوديين
    MIN_WAGE_NON_SAUDI: 0, // لا يوجد حد أدنى لغير السعوديين
    MAX_GOSI_BASE: 45000, // الحد الأقصى لقاعدة التأمينات
    GOSI_EMPLOYEE_RATE: 0.0975, // 9.75%
    GOSI_EMPLOYER_RATE: 0.1175, // 11.75%
    MAX_DEDUCTION_PERCENT: 50, // الحد الأقصى للخصومات (نظام العمل)
    VARIANCE_TOLERANCE: 0.01, // تفاوت 1 هللة
};

@Injectable()
export class PayrollValidationService {
    private readonly logger = new Logger(PayrollValidationService.name);

    constructor(private prisma: PrismaService) {}

    /**
     * 🔍 التحقق الشامل من صحة مسير الرواتب
     */
    async validatePayrollRun(
        runId: string,
        companyId: string,
        options: ValidationOptions = {}
    ): Promise<PayrollValidationResult> {
        const {
            strictMode = false,
            skipBalanceCheck = false,
            skipGosiValidation = false,
            skipDuplicateCheck = false,
            tolerancePercent = 0.01,
            maxSalaryThreshold = 500000,
            minSalaryThreshold = 0,
        } = options;

        const issues: ValidationIssue[] = [];
        const employeeIssues: Record<string, ValidationIssue[]> = {};

        // جلب بيانات المسير
        const run = await this.prisma.payrollRun.findFirst({
            where: { id: runId, companyId },
            include: {
                period: true,
                payslips: {
                    include: {
                        employee: true,
                        lines: {
                            include: { component: true }
                        }
                    }
                }
            }
        });

        if (!run) {
            return this.createErrorResult(runId, 'RUN_NOT_FOUND', 'مسير الرواتب غير موجود');
        }

        // حساب المجاميع
        let totalGross = ZERO;
        let totalDeductions = ZERO;
        let totalNet = ZERO;
        let validPayslips = 0;
        let invalidPayslips = 0;

        // ======== التحقق من كل قسيمة ========
        for (const payslip of run.payslips) {
            const employeeId = payslip.employeeId;
            const employeeName = `${payslip.employee.firstName} ${payslip.employee.lastName}`;
            const payslipIssues: ValidationIssue[] = [];

            // 1️⃣ التحقق من القيم الأساسية
            const gross = toDecimal(payslip.grossSalary);
            const deductions = toDecimal(payslip.totalDeductions);
            const net = toDecimal(payslip.netSalary);
            const base = toDecimal(payslip.baseSalary);

            totalGross = add(totalGross, gross);
            totalDeductions = add(totalDeductions, deductions);
            totalNet = add(totalNet, net);

            // 2️⃣ التحقق من تطابق المعادلة: Gross - Deductions = Net
            if (!skipBalanceCheck) {
                const expectedNet = sub(gross, deductions);
                const variance = abs(sub(expectedNet, net));
                const toleranceAmount = mul(gross, toDecimal(tolerancePercent));

                if (variance.gt(toleranceAmount) && variance.gt(toDecimal(LEGAL_CONSTANTS.VARIANCE_TOLERANCE))) {
                    payslipIssues.push({
                        code: 'BALANCE_MISMATCH',
                        severity: 'ERROR',
                        employeeId,
                        employeeName,
                        field: 'netSalary',
                        message: `Net salary doesn't match: Expected ${toFixed(expectedNet)}, Got ${toFixed(net)}`,
                        messageAr: `الراتب الصافي لا يتطابق: المتوقع ${toFixed(expectedNet)}، الفعلي ${toFixed(net)}`,
                        expectedValue: toFixed(expectedNet),
                        actualValue: toFixed(net),
                    });
                }
            }

            // 3️⃣ التحقق من القيم السالبة
            if (isNegative(gross)) {
                payslipIssues.push({
                    code: 'NEGATIVE_GROSS',
                    severity: 'ERROR',
                    employeeId,
                    employeeName,
                    field: 'grossSalary',
                    message: `Negative gross salary: ${toFixed(gross)}`,
                    messageAr: `إجمالي الراتب سالب: ${toFixed(gross)}`,
                    actualValue: toFixed(gross),
                });
            }

            if (isNegative(net)) {
                payslipIssues.push({
                    code: 'NEGATIVE_NET',
                    severity: 'WARNING',
                    employeeId,
                    employeeName,
                    field: 'netSalary',
                    message: `Negative net salary: ${toFixed(net)}`,
                    messageAr: `الراتب الصافي سالب: ${toFixed(net)}`,
                    actualValue: toFixed(net),
                    suggestion: 'يجب مراجعة الخصومات أو تسجيل كدين على الموظف',
                });
            }

            // 4️⃣ التحقق من الحد الأدنى للأجور
            const minWage = payslip.employee.isSaudi
                ? LEGAL_CONSTANTS.MIN_WAGE_SAUDI
                : LEGAL_CONSTANTS.MIN_WAGE_NON_SAUDI;

            if (toNumber(base) < minWage && minWage > 0) {
                payslipIssues.push({
                    code: 'BELOW_MIN_WAGE',
                    severity: 'WARNING',
                    employeeId,
                    employeeName,
                    field: 'baseSalary',
                    message: `Base salary below minimum wage: ${toFixed(base)} < ${minWage}`,
                    messageAr: `الراتب الأساسي أقل من الحد الأدنى: ${toFixed(base)} < ${minWage}`,
                    expectedValue: minWage.toString(),
                    actualValue: toFixed(base),
                });
            }

            // 5️⃣ التحقق من الحدود القصوى
            if (toNumber(gross) > maxSalaryThreshold) {
                payslipIssues.push({
                    code: 'EXCEEDS_MAX_SALARY',
                    severity: 'WARNING',
                    employeeId,
                    employeeName,
                    field: 'grossSalary',
                    message: `Gross salary exceeds threshold: ${toFixed(gross)} > ${maxSalaryThreshold}`,
                    messageAr: `إجمالي الراتب يتجاوز الحد الأقصى: ${toFixed(gross)} > ${maxSalaryThreshold}`,
                    actualValue: toFixed(gross),
                    suggestion: 'يرجى التأكد من صحة المبلغ',
                });
            }

            // 6️⃣ التحقق من نسبة الخصومات
            if (isPositive(gross)) {
                const deductionPercent = toNumber(div(deductions, gross)) * 100;
                if (deductionPercent > LEGAL_CONSTANTS.MAX_DEDUCTION_PERCENT) {
                    payslipIssues.push({
                        code: 'EXCESSIVE_DEDUCTIONS',
                        severity: 'WARNING',
                        employeeId,
                        employeeName,
                        field: 'totalDeductions',
                        message: `Deductions exceed ${LEGAL_CONSTANTS.MAX_DEDUCTION_PERCENT}%: ${deductionPercent.toFixed(1)}%`,
                        messageAr: `الخصومات تتجاوز ${LEGAL_CONSTANTS.MAX_DEDUCTION_PERCENT}%: ${deductionPercent.toFixed(1)}%`,
                        actualValue: `${deductionPercent.toFixed(1)}%`,
                        suggestion: 'قد يخالف هذا نظام العمل المادة 91',
                    });
                }
            }

            // 7️⃣ التحقق من GOSI
            if (!skipGosiValidation && payslip.employee.isSaudi) {
                const gosiLine = payslip.lines.find(l =>
                    l.component?.code === 'GOSI' || l.component?.code === 'GOSI-EMPLOYEE'
                );

                if (gosiLine) {
                    const gosiBase = Math.min(toNumber(base), LEGAL_CONSTANTS.MAX_GOSI_BASE);
                    const expectedGosi = gosiBase * LEGAL_CONSTANTS.GOSI_EMPLOYEE_RATE;
                    const actualGosi = toNumber(toDecimal(gosiLine.amount));
                    const gosiVariance = Math.abs(expectedGosi - actualGosi);

                    if (gosiVariance > 1) { // تفاوت أكثر من 1 ريال
                        payslipIssues.push({
                            code: 'GOSI_MISMATCH',
                            severity: 'WARNING',
                            employeeId,
                            employeeName,
                            field: 'gosiDeduction',
                            message: `GOSI deduction mismatch: Expected ${expectedGosi.toFixed(2)}, Got ${actualGosi}`,
                            messageAr: `خصم التأمينات لا يتطابق: المتوقع ${expectedGosi.toFixed(2)}، الفعلي ${actualGosi}`,
                            expectedValue: expectedGosi.toFixed(2),
                            actualValue: actualGosi.toString(),
                        });
                    }
                } else if (toNumber(base) >= LEGAL_CONSTANTS.MIN_WAGE_SAUDI) {
                    payslipIssues.push({
                        code: 'MISSING_GOSI',
                        severity: 'WARNING',
                        employeeId,
                        employeeName,
                        field: 'gosiDeduction',
                        message: 'Saudi employee missing GOSI deduction',
                        messageAr: 'موظف سعودي بدون خصم تأمينات',
                        suggestion: 'يجب التأكد من تفعيل التأمينات للموظفين السعوديين',
                    });
                }
            }

            // 8️⃣ التحقق من تطابق خطوط القسيمة مع المجاميع
            const linesEarnings = payslip.lines
                .filter(l => l.sign === 'EARNING')
                .reduce((sum, l) => add(sum, toDecimal(l.amount)), ZERO);

            const linesDeductions = payslip.lines
                .filter(l => l.sign === 'DEDUCTION')
                .reduce((sum, l) => add(sum, toDecimal(l.amount)), ZERO);

            const linesGrossVariance = abs(sub(linesEarnings, gross));
            if (linesGrossVariance.gt(toDecimal(1))) {
                payslipIssues.push({
                    code: 'LINES_GROSS_MISMATCH',
                    severity: 'WARNING',
                    employeeId,
                    employeeName,
                    field: 'lines',
                    message: `Sum of earning lines (${toFixed(linesEarnings)}) doesn't match gross (${toFixed(gross)})`,
                    messageAr: `مجموع خطوط الاستحقاقات (${toFixed(linesEarnings)}) لا يتطابق مع الإجمالي (${toFixed(gross)})`,
                });
            }

            const linesDeductionsVariance = abs(sub(linesDeductions, deductions));
            if (linesDeductionsVariance.gt(toDecimal(1))) {
                payslipIssues.push({
                    code: 'LINES_DEDUCTIONS_MISMATCH',
                    severity: 'WARNING',
                    employeeId,
                    employeeName,
                    field: 'lines',
                    message: `Sum of deduction lines (${toFixed(linesDeductions)}) doesn't match total (${toFixed(deductions)})`,
                    messageAr: `مجموع خطوط الخصومات (${toFixed(linesDeductions)}) لا يتطابق مع الإجمالي (${toFixed(deductions)})`,
                });
            }

            // 9️⃣ التحقق من وجود بيانات بنكية
            const hasBankAccount = !!(payslip.employee as any).bankAccountNumber ||
                                   !!(payslip.employee as any).iban;
            if (!hasBankAccount && toNumber(net) > 0) {
                payslipIssues.push({
                    code: 'MISSING_BANK_ACCOUNT',
                    severity: 'INFO',
                    employeeId,
                    employeeName,
                    field: 'bankAccount',
                    message: 'Employee has no bank account on file',
                    messageAr: 'الموظف ليس لديه حساب بنكي مسجل',
                    suggestion: 'قد يواجه مشكلة في تصدير WPS',
                });
            }

            // تجميع النتائج
            if (payslipIssues.length > 0) {
                employeeIssues[employeeId] = payslipIssues;
                issues.push(...payslipIssues);
            }

            if (payslipIssues.some(i => i.severity === 'ERROR')) {
                invalidPayslips++;
            } else {
                validPayslips++;
            }
        }

        // ======== التحقق على مستوى المسير ككل ========

        // 🔟 التحقق من عدم وجود تكرارات
        if (!skipDuplicateCheck) {
            const employeeIds = run.payslips.map(p => p.employeeId);
            const duplicates = employeeIds.filter((id, index) => employeeIds.indexOf(id) !== index);

            if (duplicates.length > 0) {
                const uniqueDuplicates = [...new Set(duplicates)];
                issues.push({
                    code: 'DUPLICATE_EMPLOYEES',
                    severity: 'ERROR',
                    message: `Found ${uniqueDuplicates.length} duplicate employee(s) in payroll run`,
                    messageAr: `تم العثور على ${uniqueDuplicates.length} موظف مكرر في المسير`,
                    actualValue: uniqueDuplicates.join(', '),
                });
            }
        }

        // 1️⃣1️⃣ التحقق من تطابق المجاميع الكلية
        if (!skipBalanceCheck) {
            const expectedTotalNet = sub(totalGross, totalDeductions);
            const totalVariance = abs(sub(expectedTotalNet, totalNet));

            if (totalVariance.gt(toDecimal(1))) { // تفاوت أكثر من 1 ريال
                issues.push({
                    code: 'TOTAL_BALANCE_MISMATCH',
                    severity: 'ERROR',
                    message: `Total balance mismatch: Gross(${toFixed(totalGross)}) - Deductions(${toFixed(totalDeductions)}) = ${toFixed(expectedTotalNet)}, but Total Net = ${toFixed(totalNet)}`,
                    messageAr: `تفاوت في المجاميع الكلية: الإجمالي(${toFixed(totalGross)}) - الخصومات(${toFixed(totalDeductions)}) = ${toFixed(expectedTotalNet)}، لكن الصافي الكلي = ${toFixed(totalNet)}`,
                    expectedValue: toFixed(expectedTotalNet),
                    actualValue: toFixed(totalNet),
                });
            }
        }

        // 1️⃣2️⃣ التحقق من عدم وجود مسير مدفوع لنفس الفترة
        const existingPaidRun = await this.prisma.payrollRun.findFirst({
            where: {
                periodId: run.periodId,
                companyId,
                status: 'PAID',
                id: { not: runId }
            }
        });

        if (existingPaidRun) {
            issues.push({
                code: 'PERIOD_ALREADY_PAID',
                severity: 'ERROR',
                message: `Period already has a paid payroll run (ID: ${existingPaidRun.id})`,
                messageAr: `الفترة لديها بالفعل مسير رواتب مدفوع (ID: ${existingPaidRun.id})`,
                actualValue: existingPaidRun.id,
            });
        }

        // ======== تجميع النتائج النهائية ========
        const errors = issues.filter(i => i.severity === 'ERROR').length;
        const warnings = issues.filter(i => i.severity === 'WARNING').length;
        const infos = issues.filter(i => i.severity === 'INFO').length;

        const isValid = errors === 0;
        const canProceed = strictMode ? (errors === 0 && warnings === 0) : (errors === 0);

        const balanceCheck = {
            totalGross: toNumber(totalGross),
            totalDeductions: toNumber(totalDeductions),
            totalNet: toNumber(totalNet),
            isBalanced: abs(sub(sub(totalGross, totalDeductions), totalNet)).lte(toDecimal(1)),
            variance: toNumber(abs(sub(sub(totalGross, totalDeductions), totalNet))),
        };

        this.logger.log(
            `Payroll validation completed for run ${runId}: ` +
            `${errors} errors, ${warnings} warnings, ${infos} info. ` +
            `Valid: ${isValid}, Can Proceed: ${canProceed}`
        );

        return {
            isValid,
            canProceed,
            runId,
            periodId: run.periodId,
            summary: {
                totalPayslips: run.payslips.length,
                validPayslips,
                invalidPayslips,
                errors,
                warnings,
                infos,
            },
            balanceCheck,
            issues,
            employeeIssues,
            validatedAt: new Date(),
        };
    }

    /**
     * 🔍 التحقق السريع قبل الإغلاق
     */
    async quickValidateBeforeClose(
        runId: string,
        companyId: string
    ): Promise<{ canClose: boolean; criticalIssues: string[] }> {
        const result = await this.validatePayrollRun(runId, companyId, {
            strictMode: false,
            skipGosiValidation: true,
        });

        const criticalIssues = result.issues
            .filter(i => i.severity === 'ERROR')
            .map(i => i.messageAr);

        return {
            canClose: result.canProceed,
            criticalIssues,
        };
    }

    /**
     * 🔍 التحقق من موظف واحد
     */
    async validateEmployeePayslip(
        payslipId: string,
        companyId: string
    ): Promise<{ isValid: boolean; issues: ValidationIssue[] }> {
        const payslip = await this.prisma.payslip.findFirst({
            where: { id: payslipId, companyId },
            include: {
                employee: true,
                lines: { include: { component: true } }
            }
        });

        if (!payslip) {
            return {
                isValid: false,
                issues: [{
                    code: 'PAYSLIP_NOT_FOUND',
                    severity: 'ERROR',
                    message: 'Payslip not found',
                    messageAr: 'قسيمة الراتب غير موجودة',
                }]
            };
        }

        // تنفيذ نفس التحققات على قسيمة واحدة
        const issues: ValidationIssue[] = [];
        const gross = toDecimal(payslip.grossSalary);
        const deductions = toDecimal(payslip.totalDeductions);
        const net = toDecimal(payslip.netSalary);

        // التحقق من التطابق
        const expectedNet = sub(gross, deductions);
        if (abs(sub(expectedNet, net)).gt(toDecimal(0.01))) {
            issues.push({
                code: 'BALANCE_MISMATCH',
                severity: 'ERROR',
                message: `Net salary mismatch`,
                messageAr: `الراتب الصافي لا يتطابق مع المعادلة`,
                expectedValue: toFixed(expectedNet),
                actualValue: toFixed(net),
            });
        }

        return {
            isValid: issues.filter(i => i.severity === 'ERROR').length === 0,
            issues,
        };
    }

    /**
     * 📊 الحصول على تقرير التحقق
     */
    async getValidationReport(
        runId: string,
        companyId: string
    ): Promise<{
        validation: PayrollValidationResult;
        recommendations: string[];
        statistics: {
            averageSalary: number;
            medianSalary: number;
            highestSalary: number;
            lowestSalary: number;
            totalEmployees: number;
            saudiEmployees: number;
            nonSaudiEmployees: number;
        };
    }> {
        const validation = await this.validatePayrollRun(runId, companyId);

        // جلب الإحصائيات
        const payslips = await this.prisma.payslip.findMany({
            where: { runId, companyId },
            include: { employee: true }
        });

        const salaries = payslips.map(p => toNumber(toDecimal(p.netSalary)));
        const sortedSalaries = [...salaries].sort((a, b) => a - b);

        const statistics = {
            averageSalary: salaries.length > 0 ? salaries.reduce((a, b) => a + b, 0) / salaries.length : 0,
            medianSalary: salaries.length > 0 ? sortedSalaries[Math.floor(sortedSalaries.length / 2)] : 0,
            highestSalary: Math.max(...salaries, 0),
            lowestSalary: Math.min(...salaries.filter(s => s > 0), 0),
            totalEmployees: payslips.length,
            saudiEmployees: payslips.filter(p => p.employee.isSaudi).length,
            nonSaudiEmployees: payslips.filter(p => !p.employee.isSaudi).length,
        };

        // توصيات بناءً على المشاكل
        const recommendations: string[] = [];

        if (validation.issues.some(i => i.code === 'MISSING_BANK_ACCOUNT')) {
            recommendations.push('يرجى التأكد من إدخال البيانات البنكية لجميع الموظفين قبل تصدير WPS');
        }

        if (validation.issues.some(i => i.code === 'BELOW_MIN_WAGE')) {
            recommendations.push('يوجد موظفون سعوديون بأجور أقل من الحد الأدنى - يرجى المراجعة');
        }

        if (validation.issues.some(i => i.code === 'EXCESSIVE_DEDUCTIONS')) {
            recommendations.push('بعض الموظفين لديهم خصومات تتجاوز 50% من الراتب - قد يخالف نظام العمل');
        }

        if (validation.issues.some(i => i.code === 'MISSING_GOSI')) {
            recommendations.push('يوجد موظفون سعوديون بدون خصم تأمينات - يرجى مراجعة إعدادات GOSI');
        }

        return {
            validation,
            recommendations,
            statistics,
        };
    }

    /**
     * إنشاء نتيجة خطأ
     */
    private createErrorResult(
        runId: string,
        code: string,
        message: string
    ): PayrollValidationResult {
        return {
            isValid: false,
            canProceed: false,
            runId,
            periodId: '',
            summary: {
                totalPayslips: 0,
                validPayslips: 0,
                invalidPayslips: 0,
                errors: 1,
                warnings: 0,
                infos: 0,
            },
            balanceCheck: {
                totalGross: 0,
                totalDeductions: 0,
                totalNet: 0,
                isBalanced: false,
                variance: 0,
            },
            issues: [{
                code,
                severity: 'ERROR',
                message,
                messageAr: message,
            }],
            employeeIssues: {},
            validatedAt: new Date(),
        };
    }
}
