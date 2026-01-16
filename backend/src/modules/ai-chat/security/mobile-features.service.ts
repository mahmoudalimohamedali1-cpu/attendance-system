import { Injectable, Logger } from '@nestjs/common';

/**
 * 📱 Mobile Features Service
 * Implements remaining ideas: Mobile-specific features
 * 
 * Features:
 * - Push notification management
 * - Offline mode support
 * - Location check-in
 * - Quick actions
 */

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
        start: string; // HH:mm
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

@Injectable()
export class MobileFeaturesService {
    private readonly logger = new Logger(MobileFeaturesService.name);

    // User notification settings
    private notificationSettings: Map<string, PushNotificationSettings> = new Map();

    // Offline actions queue
    private offlineQueue: Map<string, OfflineAction> = new Map();

    // Quick actions
    private readonly quickActions: QuickAction[] = [
        { id: '1', icon: '⏰', name: 'Check In', nameAr: 'تسجيل حضور', command: 'check_in', order: 1, visible: true },
        { id: '2', icon: '🚪', name: 'Check Out', nameAr: 'تسجيل انصراف', command: 'check_out', order: 2, visible: true },
        { id: '3', icon: '🏖️', name: 'Leave Request', nameAr: 'طلب إجازة', command: 'leave', order: 3, visible: true },
        { id: '4', icon: '💰', name: 'Salary', nameAr: 'راتبي', command: 'salary', order: 4, visible: true },
        { id: '5', icon: '📅', name: 'My Schedule', nameAr: 'جدولي', command: 'schedule', order: 5, visible: true },
        { id: '6', icon: '📊', name: 'Attendance', nameAr: 'الحضور', command: 'attendance', order: 6, visible: true },
        { id: '7', icon: '🎯', name: 'Goals', nameAr: 'أهدافي', command: 'goals', order: 7, visible: false },
        { id: '8', icon: '🏆', name: 'Achievements', nameAr: 'إنجازاتي', command: 'achievements', order: 8, visible: false },
    ];

    /**
     * 🔔 Get notification settings
     */
    getNotificationSettings(userId: string): PushNotificationSettings {
        return this.notificationSettings.get(userId) || this.getDefaultSettings(userId);
    }

    private getDefaultSettings(userId: string): PushNotificationSettings {
        return {
            userId,
            enabled: true,
            channels: {
                attendance: true,
                leave: true,
                payroll: true,
                announcements: true,
                reminders: true,
                social: false,
            },
            quietHours: {
                enabled: true,
                start: '22:00',
                end: '07:00',
            },
            sound: true,
            vibration: true,
        };
    }

    /**
     * 🔔 Update notification settings
     */
    updateSettings(userId: string, updates: Partial<PushNotificationSettings>): PushNotificationSettings {
        const current = this.getNotificationSettings(userId);
        const updated = { ...current, ...updates };
        this.notificationSettings.set(userId, updated);
        return updated;
    }

    /**
     * 📴 Queue offline action
     */
    queueOfflineAction(
        userId: string,
        type: OfflineAction['type'],
        data: any
    ): OfflineAction {
        const id = `OFFLINE-${Date.now().toString(36).toUpperCase()}`;

        const action: OfflineAction = {
            id,
            userId,
            type,
            data,
            createdAt: new Date(),
            status: 'pending',
        };

        this.offlineQueue.set(id, action);
        return action;
    }

    /**
     * 🔄 Sync offline actions
     */
    syncOfflineActions(userId: string): { synced: number; failed: number } {
        const userActions = Array.from(this.offlineQueue.values())
            .filter(a => a.userId === userId && a.status === 'pending');

        let synced = 0;
        let failed = 0;

        for (const action of userActions) {
            // Simulate sync - 90% success rate
            if (Math.random() > 0.1) {
                action.status = 'synced';
                action.syncedAt = new Date();
                synced++;
            } else {
                action.status = 'failed';
                failed++;
            }
        }

        return { synced, failed };
    }

    /**
     * 📍 Process location check-in
     */
    processLocationCheckIn(
        userId: string,
        latitude: number,
        longitude: number,
        accuracy: number
    ): LocationCheckIn {
        // Simulate geofence check (office location)
        const officeLatitude = 24.7136;
        const officeLongitude = 46.6753;
        const maxDistance = 0.01; // ~1km

        const distance = Math.sqrt(
            Math.pow(latitude - officeLatitude, 2) +
            Math.pow(longitude - officeLongitude, 2)
        );

        const isWithinGeofence = distance <= maxDistance;

        return {
            userId,
            latitude,
            longitude,
            accuracy,
            timestamp: new Date(),
            location: isWithinGeofence ? 'داخل نطاق المكتب' : 'خارج نطاق المكتب',
            isWithinGeofence,
        };
    }

    /**
     * ⚡ Get quick actions
     */
    getQuickActions(showAll: boolean = false): QuickAction[] {
        if (showAll) {
            return this.quickActions.sort((a, b) => a.order - b.order);
        }
        return this.quickActions.filter(a => a.visible).sort((a, b) => a.order - b.order);
    }

    /**
     * 📊 Format notification settings
     */
    formatNotificationSettings(userId: string): string {
        const settings = this.getNotificationSettings(userId);

        let message = `🔔 **إعدادات الإشعارات:**\n\n`;
        message += `${settings.enabled ? '✅' : '❌'} الإشعارات ${settings.enabled ? 'مفعلة' : 'معطلة'}\n\n`;

        if (settings.enabled) {
            message += `**القنوات:**\n`;
            message += `${settings.channels.attendance ? '✅' : '⬜'} الحضور والانصراف\n`;
            message += `${settings.channels.leave ? '✅' : '⬜'} الإجازات\n`;
            message += `${settings.channels.payroll ? '✅' : '⬜'} الرواتب\n`;
            message += `${settings.channels.announcements ? '✅' : '⬜'} الإعلانات\n`;
            message += `${settings.channels.reminders ? '✅' : '⬜'} التذكيرات\n`;
            message += `${settings.channels.social ? '✅' : '⬜'} الاجتماعي\n\n`;

            if (settings.quietHours.enabled) {
                message += `🌙 وضع الصمت: ${settings.quietHours.start} - ${settings.quietHours.end}\n`;
            }

            message += `\n${settings.sound ? '🔊' : '🔇'} الصوت | ${settings.vibration ? '📳' : '📴'} الاهتزاز`;
        }

        return message;
    }

    /**
     * 📊 Format quick actions
     */
    formatQuickActions(): string {
        const actions = this.getQuickActions();

        let message = `⚡ **الإجراءات السريعة:**\n\n`;

        for (const action of actions) {
            message += `${action.icon} ${action.nameAr}\n`;
        }

        message += `\n💡 اضغط على أي إجراء للتنفيذ`;
        return message;
    }

    /**
     * 📊 Format sync status
     */
    formatSyncStatus(result: { synced: number; failed: number }): string {
        let message = `🔄 **حالة المزامنة:**\n\n`;
        message += `✅ تمت مزامنة: ${result.synced}\n`;

        if (result.failed > 0) {
            message += `❌ فشل: ${result.failed}\n\n`;
            message += `💡 جرب المزامنة مرة أخرى لاحقاً`;
        } else if (result.synced > 0) {
            message += `\n✅ تمت المزامنة بنجاح!`;
        } else {
            message += `\n📭 لا توجد عناصر للمزامنة`;
        }

        return message;
    }
}
