export declare enum ViolationType {
    ATTENDANCE = "ATTENDANCE",
    BEHAVIOR = "BEHAVIOR",
    PERFORMANCE = "PERFORMANCE",
    POLICY_VIOLATION = "POLICY_VIOLATION",
    SAFETY = "SAFETY",
    HARASSMENT = "HARASSMENT",
    THEFT = "THEFT",
    CONFIDENTIALITY = "CONFIDENTIALITY",
    OTHER = "OTHER"
}
export declare class CreateCaseDto {
    employeeId: string;
    title: string;
    violationType?: ViolationType;
    incidentDate: string;
    incidentLocation: string;
    involvedParties?: any;
    description: string;
    retrospectiveReason?: string;
    attachments?: any[];
}
