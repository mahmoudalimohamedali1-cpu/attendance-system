/**
 * طرق حساب الراتب اليومي
 */
export enum CalculationMethod {
    // الحساب بأيام الشهر الفعلية (28-31 يوم)
    CALENDAR_DAYS = 'CALENDAR_DAYS',

    // الحساب بأيام العمل الفعلية (مثلاً 22 يوم)
    WORKING_DAYS = 'WORKING_DAYS',

    // الحساب بـ 30 يوم ثابت
    FIXED_30 = 'FIXED_30',
}

/**
 * مصدر حساب الوقت الإضافي
 */
export enum OvertimeSource {
    // من الراتب الأساسي فقط
    BASIC_ONLY = 'BASIC_ONLY',

    // من الأساسي + البدلات
    BASIC_PLUS_ALLOWANCES = 'BASIC_PLUS_ALLOWANCES',
}

/**
 * إعدادات الحساب في السياسة
 */
export interface CalculationSettings {
    // طريقة حساب اليوم
    calculationMethod: CalculationMethod;

    // مصدر حساب الوقت الإضافي
    overtimeSource: OvertimeSource;

    // معامل الوقت الإضافي (مثلاً 1.5)
    overtimeMultiplier: number;

    // هل يخصم الغياب كاملاً؟
    fullDayAbsenceDeduction: boolean;

    // دقائق التأخير المسموحة قبل الخصم
    gracePeriodMinutes: number;

    // ترتيب الخصومات (الأول يخصم أول)
    deductionPriority: string[];

    // هل يتم ترحيل الخصومات لو الراتب مش كافي؟
    carryOverDeductions: boolean;
}

/**
 * الإعدادات الافتراضية
 */
export const DEFAULT_CALCULATION_SETTINGS: CalculationSettings = {
    calculationMethod: CalculationMethod.FIXED_30,
    overtimeSource: OvertimeSource.BASIC_ONLY,
    overtimeMultiplier: 1.5,
    fullDayAbsenceDeduction: true,
    gracePeriodMinutes: 15,
    deductionPriority: ['GOSI', 'LOAN', 'ABSENCE', 'LATE', 'PENALTY'],
    carryOverDeductions: false,
};

/**
 * نتيجة حساب الراتب لموظف
 */
export interface EmployeePayrollCalculation {
    employeeId: string;
    baseSalary: number;
    dailyRate: number;
    hourlyRate: number;

    // أيام العمل
    workingDays: number;
    presentDays: number;
    absentDays: number;

    // التأخير
    lateMinutes: number;
    lateDeduction: number;

    // الغياب
    absenceDeduction: number;

    // الوقت الإضافي
    overtimeHours: number;
    overtimeAmount: number;

    // الإجمالي
    grossSalary: number;
    totalDeductions: number;
    netSalary: number;

    // تتبع الحساب (للشفافية)
    calculationTrace: CalculationTraceItem[];
}

export interface CalculationTraceItem {
    step: string;
    description: string;
    formula: string;
    result: number;
}
