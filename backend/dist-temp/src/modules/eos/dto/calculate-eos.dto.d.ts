export declare enum EosReason {
    RESIGNATION = "RESIGNATION",
    TERMINATION = "TERMINATION",
    END_OF_CONTRACT = "END_OF_CONTRACT",
    RETIREMENT = "RETIREMENT",
    DEATH = "DEATH"
}
export declare class CalculateEosDto {
    reason: EosReason;
    lastWorkingDay: string;
    overrideBaseSalary?: number;
    overrideRemainingLeaveDays?: number;
}
export interface EosBreakdown {
    employeeId: string;
    employeeName: string;
    hireDate: Date;
    lastWorkingDay: Date;
    yearsOfService: number;
    monthsOfService: number;
    daysOfService: number;
    totalDaysOfService: number;
    baseSalary: number;
    reason: EosReason;
    eosForFirst5Years: number;
    eosForRemaining: number;
    totalEos: number;
    eosAdjustmentFactor: number;
    adjustedEos: number;
    remainingLeaveDays: number;
    remainingLeaveDaysOverridden: boolean;
    leavePayout: number;
    outstandingLoans: number;
    netSettlement: number;
}
