declare enum LeaveType {
    ANNUAL = "ANNUAL",
    SICK = "SICK",
    PERSONAL = "PERSONAL",
    EMERGENCY = "EMERGENCY",
    NEW_BABY = "NEW_BABY",
    MARRIAGE = "MARRIAGE",
    BEREAVEMENT = "BEREAVEMENT",
    HAJJ = "HAJJ",
    EXAM = "EXAM",
    WORK_MISSION = "WORK_MISSION",
    UNPAID = "UNPAID",
    EARLY_LEAVE = "EARLY_LEAVE",
    OTHER = "OTHER"
}
export interface LeaveAttachment {
    originalName: string;
    filename: string;
    path?: string;
    url: string;
    size?: number;
    mimeType?: string;
}
export declare class CreateLeaveRequestDto {
    type: LeaveType;
    startDate: string;
    endDate: string;
    reason?: string;
    notes?: string;
    attachments?: LeaveAttachment[];
}
export {};
