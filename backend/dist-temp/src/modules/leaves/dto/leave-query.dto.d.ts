declare enum LeaveType {
    ANNUAL = "ANNUAL",
    SICK = "SICK",
    PERSONAL = "PERSONAL",
    EMERGENCY = "EMERGENCY",
    WORK_FROM_HOME = "WORK_FROM_HOME",
    EARLY_LEAVE = "EARLY_LEAVE",
    OTHER = "OTHER"
}
declare enum LeaveStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    CANCELLED = "CANCELLED"
}
export declare class LeaveQueryDto {
    status?: LeaveStatus;
    type?: LeaveType;
    userId?: string;
    page?: number;
    limit?: number;
}
export {};
