export declare enum CalculationMethod {
    CALENDAR_DAYS = "CALENDAR_DAYS",
    WORKING_DAYS = "WORKING_DAYS",
    FIXED_30 = "FIXED_30"
}
export declare enum OvertimeSource {
    BASIC_ONLY = "BASIC_ONLY",
    BASIC_PLUS_ALLOWANCES = "BASIC_PLUS_ALLOWANCES"
}
export interface CalculationSettings {
    calculationMethod: CalculationMethod;
    overtimeSource: OvertimeSource;
    overtimeMultiplier: number;
    fullDayAbsenceDeduction: boolean;
    gracePeriodMinutes: number;
    deductionPriority: string[];
    carryOverDeductions: boolean;
    payrollClosingDay: number;
    hireTerminationCalcBase: string;
    hireTerminationMethod: string;
    unpaidLeaveCalcBase: string;
    unpaidLeaveMethod: string;
    splitUnpaidByClosingDate: boolean;
    overtimeCalcBase: string;
    overtimeMethod: string;
    leaveAllowanceCalcBase: string;
    leaveAllowanceMethod: string;
    showCompanyContributions: boolean;
    showClosingDateOnPayslip: boolean;
    deductAbsenceFromBasic: boolean;
    showActualAbsenceDays: boolean;
    enableNegativeBalanceCarryover: boolean;
    settleNegativeAsTransaction: boolean;
    roundSalaryToNearest: number;
    defaultWorkingDaysPerMonth: number;
    leaveDailyRateDivisor: number;
}
export declare const DEFAULT_CALCULATION_SETTINGS: CalculationSettings;
export interface EmployeePayrollCalculation {
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
    calculationTrace: CalculationTraceItem[];
    policyLines?: PolicyPayrollLine[];
}
export interface CalculationTraceItem {
    step: string;
    description: string;
    formula: string;
    result: number;
}
export interface PolicyPayrollLine {
    componentId: string;
    componentCode: string;
    componentName: string;
    sign: 'EARNING' | 'DEDUCTION';
    isEmployerContribution?: boolean;
    amount: number;
    descriptionAr: string;
    units?: number;
    rate?: number;
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
        amount: number;
        paymentType: string;
        periodMonth: number;
        periodYear: number;
    };
}
