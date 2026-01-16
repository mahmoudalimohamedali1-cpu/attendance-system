export interface Notification {
    id: string;
    userId: string;
    type: 'info' | 'warning' | 'urgent' | 'success' | 'reminder' | 'action_required';
    typeAr: string;
    title: string;
    message: string;
    category: 'attendance' | 'leave' | 'task' | 'meeting' | 'hr' | 'system' | 'social';
    priority: 'low' | 'medium' | 'high' | 'critical';
    read: boolean;
    actionUrl?: string;
    actionLabel?: string;
    createdAt: Date;
    expiresAt?: Date;
}
export interface NotificationPreferences {
    userId: string;
    channels: {
        inApp: boolean;
        email: boolean;
        sms: boolean;
        push: boolean;
    };
    quietHours: {
        enabled: boolean;
        start: string;
        end: string;
    };
    categories: Record<string, boolean>;
    frequency: 'instant' | 'hourly' | 'daily';
}
export interface NotificationStats {
    total: number;
    unread: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
}
export declare class NotificationsService {
    private readonly logger;
    private notifications;
    private preferences;
    private readonly typeLabels;
    createNotification(userId: string, type: Notification['type'], title: string, message: string, category: Notification['category'], priority?: Notification['priority'], actionUrl?: string, actionLabel?: string): Notification;
    getUserNotifications(userId: string, unreadOnly?: boolean): Notification[];
    markAsRead(notificationId: string): {
        success: boolean;
        message: string;
    };
    markAllAsRead(userId: string): number;
    getStats(userId: string): NotificationStats;
    getPreferences(userId: string): NotificationPreferences;
    private getDefaultPreferences;
    updatePreferences(userId: string, updates: Partial<NotificationPreferences>): NotificationPreferences;
    clearOldNotifications(userId: string, daysOld?: number): number;
    formatNotifications(userId: string): string;
    private formatTimeAgo;
    formatStats(userId: string): string;
}
