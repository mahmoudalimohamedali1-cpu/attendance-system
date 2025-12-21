/**
 * Policy Evaluation Context - Unified context for all policy types
 * Contains all possible event data that policies might need
 */
export interface PolicyEvaluationContext {
    // Employee basic info
    employee: {
        id: string;
        companyId: string;
        branchId?: string;
        departmentId?: string;
        jobTitleId?: string;
        basicSalary: number;
        hourlyRate?: number;
    };

    // Period info
    period: {
        year: number;
        month: number;
        startDate: Date;
        endDate: Date;
        workingDays: number;
    };

    // Attendance data (for OT, Late, Absence policies)
    attendance?: {
        otHours: number;           // Total overtime hours
        otHoursWeekday: number;    // Weekday OT hours
        otHoursWeekend: number;    // Weekend OT hours
        otHoursHoliday: number;    // Holiday OT hours
        lateMinutes: number;       // Total late minutes
        lateCount: number;         // Number of late arrivals
        absentDays: number;        // Unexcused absent days
        earlyDepartureMinutes: number;
        workingHours: number;      // Total working hours
        attendanceIds?: string[];  // For eventRef tracking
    };

    // Leave data
    leaves?: {
        paidDays: number;
        unpaidDays: number;
        sickDays: number;
        annualDays: number;
        leaveIds?: string[];       // For eventRef tracking
    };

    // Advances/Loans
    advances?: {
        installmentAmount: number;
        remainingBalance: number;
        advanceIds?: string[];
    };

    // Raises (for calculating mid-period adjustments)
    raises?: {
        hasActiveRaise: boolean;
        raiseAmount: number;
        effectiveDate?: Date;
        raiseId?: string;
    };

    // Manual inputs (from HR)
    manualInputs?: Record<string, number>;
}

/**
 * Result of policy rule evaluation
 */
export interface PolicyRuleResult {
    success: boolean;
    amount: number;
    units?: number;
    rate?: number;
    description: string;
    eventRef?: string;
}
