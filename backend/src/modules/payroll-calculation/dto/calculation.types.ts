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
 * إعدادات الحساب في السياسة أو الشركة
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

    // ========== إعدادات مطورة من PayrollSettings ==========
    payrollClosingDay: number;

    // حساب التوظيف وإنهاء الخدمات
    hireTerminationCalcBase: string;
    hireTerminationMethod: string;

    // حساب الإجازات غير المدفوعة
    unpaidLeaveCalcBase: string;
    unpaidLeaveMethod: string;
    splitUnpaidByClosingDate: boolean;

    // حساب ساعات العمل الإضافي
    overtimeCalcBase: string;
    overtimeMethod: string;

    // حساب بدل أيام الإجازة
    leaveAllowanceCalcBase: string;
    leaveAllowanceMethod: string;

    // إعدادات القسيمة
    showCompanyContributions: boolean;
    showClosingDateOnPayslip: boolean;
    deductAbsenceFromBasic: boolean;
    showActualAbsenceDays: boolean;

    // أرصدة الرواتب السلبية
    enableNegativeBalanceCarryover: boolean;
    settleNegativeAsTransaction: boolean;

    // إضافية
    roundSalaryToNearest: number;
    defaultWorkingDaysPerMonth: number;
    leaveDailyRateDivisor: number;

    // ========== الميزات الجديدة (1-10) ==========
    // معاملات الوقت الإضافي
    weekendOvertimeMultiplier: number;
    holidayOvertimeMultiplier: number;
    // بدل المناوبة الليلية
    nightShiftAllowancePercent: number;
    // حدود الخصومات
    maxDeductionPercent: number;
    minNetSalary: number;
    // القفل التلقائي
    autoLockDay: number;
    // العملة
    defaultCurrency: string;
    enableMultiCurrency: boolean;

    // ========== الميزات الجديدة (11-20) ==========
    // المكافآت
    enableBonusTracking: boolean;
    bonusCalculationMethod: string;
    // العمولات
    enableCommission: boolean;
    commissionCalculationBase: string;
    // البدلات
    enableAllowanceCategories: boolean;
    maxAllowancePercent: number;
    // الضرائب
    enableTaxCalculation: boolean;
    taxCalculationMethod: string;
    // السلفة
    enableSalaryAdvance: boolean;
    maxAdvancePercent: number;

    // ========== الميزات الجديدة (21-30) ==========
    // القروض
    enableLoanDeduction: boolean;
    maxLoanDeductionPercent: number;
    // سير العمل
    enableApprovalWorkflow: boolean;
    approvalLevels: number;
    // البنك
    enableBankTransfer: boolean;
    defaultBankCode: string;
    // الدفع بأثر رجعي
    enableRetroactivePay: boolean;
    retroactiveMonthsLimit: number;
    // نهاية الخدمة
    enableEosCalculation: boolean;
    eosCalculationMethod: string;

    // ========== الميزات الجديدة (31-40) ==========
    // التأمينات (GOSI)
    enableGosiCalculation: boolean;
    gosiEmployeePercent: number;
    gosiEmployerPercent: number;
    // صرف الإجازات
    enableVacationEncashment: boolean;
    vacationEncashmentMethod: string;
    // عقوبات الحضور
    enableAttendancePenalty: boolean;
    lateDeductionMethod: string;
    lateThresholdMinutes: number;
    absenceDeductionMethod: string;
    absenceProgressiveRate: number;
    // خصم الانصراف المبكر
    enableEarlyDeparturePenalty: boolean;
    earlyDepartureDeductionMethod: string;
    earlyDepartureThresholdMinutes: number;
    // الخصم التراكمي للتأخير
    enableCumulativeLateDeduction: boolean;
    lateCountForDayDeduction: number;
    // إعدادات GOSI المتقدمة
    gosiMaxSalary: number;
    enableSanedCalculation: boolean;
    sanedEmployeePercent: number;
    sanedEmployerPercent: number;
    hazardRatePercent: number;
    // قسيمة الراتب
    enablePayslipEmail: boolean;
    payslipLanguage: string;

    // ========== الميزات الجديدة (41-50) ==========
    // الحد الأقصى للوقت الإضافي
    enableOvertimeCap: boolean;
    maxOvertimeHoursPerMonth: number;
    // التوليد التلقائي
    enableAutoPayrollGeneration: boolean;
    autoPayrollGenerationDay: number;
    // التدقيق والتقريب
    enablePayrollAuditTrail: boolean;
    enableSalaryRounding: boolean;
    salaryRoundingMethod: string;
    // الميزانية والتكلفة
    enableDepartmentBudget: boolean;
    enableCostCenterTracking: boolean;
    // التصدير
    defaultPayrollExportFormat: string;

    // ========== إعدادات الإجازة المرضية (51-55) ==========
    enableSickLeaveDeduction: boolean;
    sickLeavePartialPayPercent: number;
    sickLeaveFullPayDays: number;
    sickLeavePartialPayDays: number;
    sickLeaveUnpaidDays: number;

    // ========== إعدادات طريقة الحساب (56-58) ==========
    dailyWorkingHours: number;
    workingDaysPerWeek: number;
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

    // قيم افتراضية من موديل PayrollSettings
    payrollClosingDay: 25,
    hireTerminationCalcBase: 'CALENDAR_DAYS',
    hireTerminationMethod: 'EXCLUDE_WEEKENDS',
    unpaidLeaveCalcBase: 'ACTUAL_WORKING_DAYS',
    unpaidLeaveMethod: 'BASED_ON_SHIFTS',
    splitUnpaidByClosingDate: false,
    overtimeCalcBase: 'ACTUAL_WORKING_DAYS',
    overtimeMethod: 'BASED_ON_SHIFTS',
    leaveAllowanceCalcBase: 'CALENDAR_DAYS',
    leaveAllowanceMethod: 'BASIC_PLUS_HOUSING',
    showCompanyContributions: true,
    showClosingDateOnPayslip: true,
    deductAbsenceFromBasic: true,
    showActualAbsenceDays: false,
    enableNegativeBalanceCarryover: false,
    settleNegativeAsTransaction: false,
    roundSalaryToNearest: 0,
    defaultWorkingDaysPerMonth: 30,
    leaveDailyRateDivisor: 30,

    // الميزات الجديدة (1-10)
    weekendOvertimeMultiplier: 2.0,
    holidayOvertimeMultiplier: 2.0,
    nightShiftAllowancePercent: 0,
    maxDeductionPercent: 50,
    minNetSalary: 0,
    autoLockDay: 0,
    defaultCurrency: 'SAR',
    enableMultiCurrency: false,

    // الميزات الجديدة (11-20)
    enableBonusTracking: true,
    bonusCalculationMethod: 'FIXED',
    enableCommission: false,
    commissionCalculationBase: 'SALES',
    enableAllowanceCategories: true,
    maxAllowancePercent: 100,
    enableTaxCalculation: false,
    taxCalculationMethod: 'EXEMPT',
    enableSalaryAdvance: true,
    maxAdvancePercent: 50,

    // الميزات الجديدة (21-30)
    enableLoanDeduction: true,
    maxLoanDeductionPercent: 30,
    enableApprovalWorkflow: false,
    approvalLevels: 1,
    enableBankTransfer: true,
    defaultBankCode: '',
    enableRetroactivePay: true,
    retroactiveMonthsLimit: 3,
    enableEosCalculation: true,
    eosCalculationMethod: 'SAUDI_LABOR_LAW',

    // الميزات الجديدة (31-40)
    enableGosiCalculation: true,
    gosiEmployeePercent: 9.75,
    gosiEmployerPercent: 11.75,
    enableVacationEncashment: true,
    vacationEncashmentMethod: 'ON_TERMINATION',
    enableAttendancePenalty: true,
    lateDeductionMethod: 'PER_MINUTE',
    lateThresholdMinutes: 120,
    absenceDeductionMethod: 'DAILY_RATE',
    absenceProgressiveRate: 1.0,
    // خصم الانصراف المبكر
    enableEarlyDeparturePenalty: false,
    earlyDepartureDeductionMethod: 'PER_MINUTE',
    earlyDepartureThresholdMinutes: 120,
    // الخصم التراكمي للتأخير
    enableCumulativeLateDeduction: false,
    lateCountForDayDeduction: 3,
    // إعدادات GOSI المتقدمة
    gosiMaxSalary: 45000,
    enableSanedCalculation: true,
    sanedEmployeePercent: 0.75,
    sanedEmployerPercent: 0.75,
    hazardRatePercent: 2.0,
    enablePayslipEmail: false,
    payslipLanguage: 'AR',

    // الميزات الجديدة (41-50)
    enableOvertimeCap: false,
    maxOvertimeHoursPerMonth: 50,
    enableAutoPayrollGeneration: false,
    autoPayrollGenerationDay: 25,
    enablePayrollAuditTrail: true,
    enableSalaryRounding: false,
    salaryRoundingMethod: 'NEAREST',
    enableDepartmentBudget: false,
    enableCostCenterTracking: false,
    defaultPayrollExportFormat: 'EXCEL',

    // إعدادات الإجازة المرضية (51-55)
    enableSickLeaveDeduction: true,
    sickLeavePartialPayPercent: 75,
    sickLeaveFullPayDays: 30,
    sickLeavePartialPayDays: 60,
    sickLeaveUnpaidDays: 30,

    // إعدادات طريقة الحساب (56-58)
    dailyWorkingHours: 8,
    workingDaysPerWeek: 5,
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
    deferredDeductions?: number; // ✅ الخصومات المرحلة للشهر القادم (تجاوز سقف 50%)
    originalDeductionsBeforeCap?: number; // ✅ الخصومات الأصلية قبل تطبيق السقف

    // تتبع الحساب (للشفافية)
    calculationTrace: CalculationTraceItem[];

    // نتائج السياسات (للربط الديناميكي مع PayslipLines)
    policyLines?: PolicyPayrollLine[];
}

export interface CalculationTraceItem {
    step: string;
    description: string;
    formula: string;
    result: number;
}

/**
 * نتيجة حساب سياسة - للربط الديناميكي بين السياسة والـ Payslip
 * Extended for Audit, WPS, GOSI compliance
 */
export interface PolicyPayrollLine {
    // معرف المكوّن الناتج من السياسة
    componentId: string;
    componentCode: string;
    componentName: string;

    // نوع الناتج (استحقاق/خصم)
    sign: 'EARNING' | 'DEDUCTION';

    // مساهمة صاحب العمل (لا تخصم من صافي الراتب)
    isEmployerContribution?: boolean;

    // المبلغ المحسوب
    amount: number;

    // 🔥 Audit fields
    descriptionAr: string;          // سبب السطر: "خصم تأخير - سياسة كذا"
    units?: number;                 // OT hours, late minutes, absent days
    rate?: number;                  // multiplier (e.g., 1.5x)

    // 🔥 مصدر الحساب (للتتبع)
    source: {
        policyId: string;
        policyCode: string;
        ruleId: string;
        ruleCode: string;
        eventRef?: string;          // attendanceId, leaveId, etc.
    };

    // 🔥 Component flags (from SalaryComponent)
    taxable?: boolean;
    gosiEligible?: boolean;
    wpsIncluded?: boolean;

    // 🔥 Loan payment tracking data (for payroll deduction processing)
    _loanPaymentData?: {
        advanceRequestId: string;
        amount: number;
        paymentType: string;
        periodMonth: number;
        periodYear: number;
    };
}
