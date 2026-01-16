export declare class LeaveCalculationService {
    calculateRemainingLeaveDays(hireDate: Date, usedDays?: number): number;
    calculateEarnedLeaveDays(hireDate: Date, endDate?: Date): number;
    getYearsOfService(hireDate: Date, endDate?: Date): number;
    getCurrentAnnualAllowance(hireDate: Date): number;
    calculateRemainingLeaveDaysNoCarryover(hireDate: Date, usedDaysThisYear?: number): number;
    getStartOfCurrentYear(): Date;
    getEndOfCurrentYear(): Date;
}
