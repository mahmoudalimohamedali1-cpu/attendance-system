export declare enum DecisionType {
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    DELAYED = "DELAYED"
}
export declare class ManagerDecisionDto {
    decision: DecisionType;
    notes?: string;
}
export declare class HRDecisionDto {
    decision: DecisionType;
    notes?: string;
    attachments?: any[];
}
