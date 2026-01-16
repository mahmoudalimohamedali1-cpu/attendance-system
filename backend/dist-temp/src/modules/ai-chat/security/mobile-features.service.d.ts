export interface PushNotificationSettings {
    userId: string;
    enabled: boolean;
    channels: {
        attendance: boolean;
        leave: boolean;
        payroll: boolean;
        announcements: boolean;
        reminders: boolean;
        social: boolean;
    };
    quietHours: {
        enabled: boolean;
        start: string;
        end: string;
    };
    sound: boolean;
    vibration: boolean;
}
export interface OfflineAction {
    id: string;
    userId: string;
    type: 'check_in' | 'check_out' | 'leave_request' | 'expense';
    data: any;
    createdAt: Date;
    syncedAt?: Date;
    status: 'pending' | 'synced' | 'failed';
}
export interface LocationCheckIn {
    userId: string;
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: Date;
    location: string;
    isWithinGeofence: boolean;
}
export interface QuickAction {
    id: string;
    icon: string;
    name: string;
    nameAr: string;
    command: string;
    order: number;
    visible: boolean;
}
export interface DeviceInfo {
    deviceId: string;
    platform: 'ios' | 'android';
    version: string;
    pushToken?: string;
    lastActive: Date;
}
export declare class MobileFeaturesService {
    private readonly logger;
    private notificationSettings;
    private offlineQueue;
    private readonly quickActions;
    getNotificationSettings(userId: string): PushNotificationSettings;
    private getDefaultSettings;
    updateSettings(userId: string, updates: Partial<PushNotificationSettings>): PushNotificationSettings;
    queueOfflineAction(userId: string, type: OfflineAction['type'], data: any): OfflineAction;
    syncOfflineActions(userId: string): {
        synced: number;
        failed: number;
    };
    processLocationCheckIn(userId: string, latitude: number, longitude: number, accuracy: number): LocationCheckIn;
    getQuickActions(showAll?: boolean): QuickAction[];
    formatNotificationSettings(userId: string): string;
    formatQuickActions(): string;
    formatSyncStatus(result: {
        synced: number;
        failed: number;
    }): string;
}
