declare enum NotificationType {
    LATE_CHECK_IN = "LATE_CHECK_IN",
    EARLY_CHECK_OUT = "EARLY_CHECK_OUT",
    EARLY_CHECK_IN = "EARLY_CHECK_IN",
    LEAVE_APPROVED = "LEAVE_APPROVED",
    LEAVE_REJECTED = "LEAVE_REJECTED",
    SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY",
    GENERAL = "GENERAL"
}
export declare class BroadcastNotificationDto {
    type: NotificationType;
    title: string;
    body: string;
    userIds?: string[];
    data?: Record<string, any>;
}
export {};
