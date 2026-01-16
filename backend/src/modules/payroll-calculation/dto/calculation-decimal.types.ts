/**
 * Decimal-Based Calculation Types
 * أنواع البيانات المعتمدة على Decimal للحسابات المالية
 *
 * هذا الملف يوفر أنواع بديلة تستخدم Decimal بدلاً من Number
 * لضمان الدقة في الحسابات المالية
 */

import { Decimal } from '@prisma/client/runtime/library';

/**
 * نتيجة حساب الراتب لموظف (نسخة Decimal)
 */
export interface EmployeePayrollCalculationDecimal {
    employeeId: string;
    baseSalary: Decimal;
    dailyRate: Decimal;
    hourlyRate: Decimal;

    // أيام العمل (تبقى number لأنها أعداد صحيحة)
    workingDays: number;
    presentDays: number;
    absentDays: number;

    // التأخير
    lateMinutes: number;  // عدد صحيح
    lateDeduction: Decimal;

    // الغياب
    absenceDeduction: Decimal;

    // الانصراف المبكر
    earlyDepartureMinutes: number;
    earlyDepartureDeduction: Decimal;

    // الوقت الإضافي
    overtimeHours: Decimal;
    overtimeAmount: Decimal;

    // الإجمالي
    grossSalary: Decimal;
    totalDeductions: Decimal;
    netSalary: Decimal;

    // معلومات إضافية للتتبع
    deductionsExceedLimit: boolean;
    excessDeductionAmount: Decimal;
    hasNegativeBalance: boolean;
    negativeBalanceAmount: Decimal;

    // تتبع الحساب (للشفافية)
    calculationTrace: CalculationTraceItemDecimal[];

    // نتائج السياسات
    policyLines: PolicyPayrollLineDecimal[];
}

/**
 * عنصر تتبع الحساب (نسخة Decimal)
 */
export interface CalculationTraceItemDecimal {
    step: string;
    description: string;
    formula: string;
    result: Decimal;
}

/**
 * سطر راتب من السياسة (نسخة Decimal)
 */
export interface PolicyPayrollLineDecimal {
    componentId: string;
    componentCode: string;
    componentName: string;
    sign: 'EARNING' | 'DEDUCTION' | 'INFO';
    isEmployerContribution?: boolean;
    amount: Decimal;
    descriptionAr: string;
    units?: Decimal;
    rate?: Decimal;
    source: {
        policyId: string;
        policyCode: string;
        ruleId: string;
        ruleCode: string;
        eventRef?: string;
    };
    taxable?: boolean;
    gosiEligible?: boolean;
    wpsIncluded?: boolean;
    _loanPaymentData?: {
        advanceRequestId: string;
        amount: Decimal;
        paymentType: string;
        periodMonth: number;
        periodYear: number;
    };
}

/**
 * سياق المتغيرات للمعادلات (نسخة Decimal)
 */
export interface FormulaContextDecimal {
    BASIC: Decimal;
    TOTAL: Decimal;
    GROSS: Decimal;
    HOUSING: Decimal;
    TRANSPORT: Decimal;
    OTHER_ALLOWANCES: Decimal;
    OT_HOURS: Decimal;
    OT_RATE: Decimal;
    OT_BASE: Decimal;
    GOSI_BASE: Decimal;
    EOS_BASE: Decimal;
    DAILY_RATE: Decimal;
    HOURLY_RATE: Decimal;
    MINUTE_RATE: Decimal;
    DAYS_WORKED: number;
    DAYS_ABSENT: number;
    LATE_MINUTES: number;
    DAYS_IN_MONTH: number;
    WORKING_DAYS: number;
    YEARS_OF_SERVICE: number;
    [key: string]: Decimal | number;
}

/**
 * بيانات الحضور الملخصة (نسخة Decimal للقيم المالية)
 */
export interface AttendanceSummaryDecimal {
    presentDays: number;
    absentDays: number;
    holidayWorkDays: number;
    lateMinutes: number;
    lateCount: number;
    earlyDepartureMinutes: number;
    overtimeHours: Decimal;
    holidayOvertimeHours: Decimal;
    weekendOvertimeHours: Decimal;
    nightShiftHours: Decimal;
    recordsCount: number;
}

/**
 * نتيجة حساب GOSI (نسخة Decimal)
 */
export interface GosiCalculationDecimal {
    employeeAmount: Decimal;
    employerAmount: Decimal;
    sanedEmployee: Decimal;
    sanedEmployer: Decimal;
    hazardRate: Decimal;
    gosiBase: Decimal;
    cappedBase: Decimal;
    isSaudi: boolean;
}

/**
 * نتيجة حساب الوقت الإضافي (نسخة Decimal)
 */
export interface OvertimeCalculationDecimal {
    regularHours: Decimal;
    weekendHours: Decimal;
    holidayHours: Decimal;
    totalHours: Decimal;
    regularAmount: Decimal;
    weekendAmount: Decimal;
    holidayAmount: Decimal;
    totalAmount: Decimal;
    hourlyRate: Decimal;
    wasCapped: boolean;
    originalHours: Decimal;
}

/**
 * نتيجة حساب الخصومات (نسخة Decimal)
 */
export interface DeductionCalculationDecimal {
    absenceDeduction: Decimal;
    lateDeduction: Decimal;
    earlyDepartureDeduction: Decimal;
    cumulativeLateDeduction: Decimal;
    totalAttendanceDeductions: Decimal;
}

/**
 * تحويل من Decimal types إلى Number types للتوافق مع الواجهات القديمة
 */
export function toNumberBasedCalculation(calc: EmployeePayrollCalculationDecimal): {
    employeeId: string;
    baseSalary: number;
    dailyRate: number;
    hourlyRate: number;
    workingDays: number;
    presentDays: number;
    absentDays: number;
    lateMinutes: number;
    lateDeduction: number;
    absenceDeduction: number;
    overtimeHours: number;
    overtimeAmount: number;
    grossSalary: number;
    totalDeductions: number;
    netSalary: number;
    calculationTrace: { step: string; description: string; formula: string; result: number }[];
    policyLines: any[];
} {
    return {
        employeeId: calc.employeeId,
        baseSalary: Number(calc.baseSalary.toFixed(2)),
        dailyRate: Number(calc.dailyRate.toFixed(2)),
        hourlyRate: Number(calc.hourlyRate.toFixed(2)),
        workingDays: calc.workingDays,
        presentDays: calc.presentDays,
        absentDays: calc.absentDays,
        lateMinutes: calc.lateMinutes,
        lateDeduction: Number(calc.lateDeduction.toFixed(2)),
        absenceDeduction: Number(calc.absenceDeduction.toFixed(2)),
        overtimeHours: Number(calc.overtimeHours.toFixed(2)),
        overtimeAmount: Number(calc.overtimeAmount.toFixed(2)),
        grossSalary: Number(calc.grossSalary.toFixed(2)),
        totalDeductions: Number(calc.totalDeductions.toFixed(2)),
        netSalary: Number(calc.netSalary.toFixed(2)),
        calculationTrace: calc.calculationTrace.map(t => ({
            step: t.step,
            description: t.description,
            formula: t.formula,
            result: Number(t.result.toFixed(2)),
        })),
        policyLines: calc.policyLines.map(pl => ({
            ...pl,
            amount: Number(pl.amount.toFixed(2)),
            units: pl.units ? Number(pl.units.toFixed(2)) : undefined,
            rate: pl.rate ? Number(pl.rate.toFixed(2)) : undefined,
            _loanPaymentData: pl._loanPaymentData ? {
                ...pl._loanPaymentData,
                amount: Number(pl._loanPaymentData.amount.toFixed(2)),
            } : undefined,
        })),
    };
}
