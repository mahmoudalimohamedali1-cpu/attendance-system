export declare enum RaiseTypeDto {
    SALARY_INCREASE = "SALARY_INCREASE",
    ANNUAL_LEAVE_BONUS = "ANNUAL_LEAVE_BONUS",
    BUSINESS_TRIP = "BUSINESS_TRIP",
    BONUS = "BONUS",
    ALLOWANCE = "ALLOWANCE",
    OTHER = "OTHER"
}
export declare class CreateRaiseRequestDto {
    type: RaiseTypeDto;
    amount: number;
    effectiveMonth: string;
    notes?: string;
    attachments?: any[];
}
