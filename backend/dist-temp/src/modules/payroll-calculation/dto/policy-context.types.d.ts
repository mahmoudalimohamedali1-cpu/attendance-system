export interface PolicyEvaluationContext {
    employee: {
        id: string;
        companyId: string;
        branchId?: string;
        departmentId?: string;
        jobTitleId?: string;
        basicSalary: number;
        hourlyRate?: number;
    };
    period: {
        year: number;
        month: number;
        startDate: Date;
        endDate: Date;
        workingDays: number;
    };
    attendance?: {
        otHours: number;
        otHoursWeekday: number;
        otHoursWeekend: number;
        otHoursHoliday: number;
        lateMinutes: number;
        lateCount: number;
        absentDays: number;
        earlyDepartureMinutes: number;
        workingHours: number;
        attendanceIds?: string[];
    };
    leaves?: {
        paidDays: number;
        unpaidDays: number;
        sickDays: number;
        annualDays: number;
        leaveIds?: string[];
    };
    advances?: {
        installmentAmount: number;
        remainingBalance: number;
        advanceIds?: string[];
    };
    raises?: {
        hasActiveRaise: boolean;
        raiseAmount: number;
        effectiveDate?: Date;
        raiseId?: string;
    };
    manualInputs?: Record<string, number>;
}
export interface PolicyRuleResult {
    success: boolean;
    amount: number;
    units?: number;
    rate?: number;
    description: string;
    eventRef?: string;
}
