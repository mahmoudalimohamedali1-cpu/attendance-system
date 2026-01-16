export declare enum AdvanceType {
    BANK_TRANSFER = "BANK_TRANSFER",
    CASH = "CASH"
}
export declare class CreateAdvanceRequestDto {
    type: AdvanceType;
    amount: number;
    startDate: Date;
    endDate: Date;
    periodMonths: number;
    monthlyDeduction: number;
    notes?: string;
    attachments?: any[];
}
export declare class ManagerDecisionDto {
    decision: 'APPROVED' | 'REJECTED';
    notes?: string;
}
export declare class HrDecisionDto {
    decision: 'APPROVED' | 'REJECTED';
    approvedAmount?: number;
    approvedMonthlyDeduction?: number;
    notes?: string;
}
