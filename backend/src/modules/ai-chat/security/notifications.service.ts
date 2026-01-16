import { Injectable, Logger } from '@nestjs/common';

/**
 * 🔔 Smart Notifications Service
 * Implements ideas #5, #26: Smart alerts & notifications
 * 
 * Features:
 * - Priority-based notifications
 * - Custom preferences
 * - Delivery scheduling
 * - Notification history
 */

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
        start: string; // "22:00"
        end: string;   // "07:00"
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

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    // Notifications storage
    private notifications: Map<string, Notification> = new Map();
    private preferences: Map<string, NotificationPreferences> = new Map();

    // Type labels
    private readonly typeLabels: Record<string, string> = {
        info: 'معلومات',
        warning: 'تحذير',
        urgent: 'عاجل',
        success: 'نجاح',
        reminder: 'تذكير',
        action_required: 'يتطلب إجراء',
    };

    /**
     * 🔔 Create notification
     */
    createNotification(
        userId: string,
        type: Notification['type'],
        title: string,
        message: string,
        category: Notification['category'],
        priority: Notification['priority'] = 'medium',
        actionUrl?: string,
        actionLabel?: string
    ): Notification {
        const id = `NOTIF-${Date.now().toString(36).toUpperCase()}`;

        const notification: Notification = {
            id,
            userId,
            type,
            typeAr: this.typeLabels[type],
            title,
            message,
            category,
            priority,
            read: false,
            actionUrl,
            actionLabel,
            createdAt: new Date(),
        };

        this.notifications.set(id, notification);
        return notification;
    }

    /**
     * 📋 Get user notifications
     */
    getUserNotifications(userId: string, unreadOnly: boolean = false): Notification[] {
        const userNotifications: Notification[] = [];

        for (const [, notif] of this.notifications) {
            if (notif.userId === userId) {
                if (unreadOnly && notif.read) continue;
                userNotifications.push(notif);
            }
        }

        // Sort by priority and date
        return userNotifications.sort((a, b) => {
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0) return priorityDiff;
            return b.createdAt.getTime() - a.createdAt.getTime();
        });
    }

    /**
     * ✅ Mark as read
     */
    markAsRead(notificationId: string): { success: boolean; message: string } {
        const notification = this.notifications.get(notificationId);
        if (!notification) {
            return { success: false, message: '❌ الإشعار غير موجود' };
        }

        notification.read = true;
        return { success: true, message: '✅ تم التحديد كمقروء' };
    }

    /**
     * ✅ Mark all as read
     */
    markAllAsRead(userId: string): number {
        let count = 0;
        for (const [, notif] of this.notifications) {
            if (notif.userId === userId && !notif.read) {
                notif.read = true;
                count++;
            }
        }
        return count;
    }

    /**
     * 📊 Get notification stats
     */
    getStats(userId: string): NotificationStats {
        const userNotifications = this.getUserNotifications(userId);

        const stats: NotificationStats = {
            total: userNotifications.length,
            unread: userNotifications.filter(n => !n.read).length,
            byType: {},
            byCategory: {},
        };

        for (const notif of userNotifications) {
            stats.byType[notif.type] = (stats.byType[notif.type] || 0) + 1;
            stats.byCategory[notif.category] = (stats.byCategory[notif.category] || 0) + 1;
        }

        return stats;
    }

    /**
     * ⚙️ Get/Set preferences
     */
    getPreferences(userId: string): NotificationPreferences {
        return this.preferences.get(userId) || this.getDefaultPreferences(userId);
    }

    private getDefaultPreferences(userId: string): NotificationPreferences {
        return {
            userId,
            channels: { inApp: true, email: true, sms: false, push: true },
            quietHours: { enabled: true, start: '22:00', end: '07:00' },
            categories: {
                attendance: true,
                leave: true,
                task: true,
                meeting: true,
                hr: true,
                system: true,
                social: true,
            },
            frequency: 'instant',
        };
    }

    updatePreferences(userId: string, updates: Partial<NotificationPreferences>): NotificationPreferences {
        const current = this.getPreferences(userId);
        const updated = { ...current, ...updates };
        this.preferences.set(userId, updated);
        return updated;
    }

    /**
     * 🧹 Clear old notifications
     */
    clearOldNotifications(userId: string, daysOld: number = 30): number {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - daysOld);

        let count = 0;
        for (const [id, notif] of this.notifications) {
            if (notif.userId === userId && notif.createdAt < cutoff) {
                this.notifications.delete(id);
                count++;
            }
        }

        return count;
    }

    /**
     * 📊 Format notifications as message
     */
    formatNotifications(userId: string): string {
        const notifications = this.getUserNotifications(userId).slice(0, 10);
        const stats = this.getStats(userId);

        if (notifications.length === 0) {
            return '🔔 لا توجد إشعارات جديدة';
        }

        let message = `🔔 **الإشعارات** (${stats.unread} غير مقروء)\n\n`;

        for (const notif of notifications.slice(0, 5)) {
            const readIcon = notif.read ? '○' : '●';
            const typeIcon = {
                info: 'ℹ️',
                warning: '⚠️',
                urgent: '🚨',
                success: '✅',
                reminder: '🔔',
                action_required: '📋',
            }[notif.type];

            message += `${readIcon} ${typeIcon} **${notif.title}**\n`;
            message += `   ${notif.message.substring(0, 60)}${notif.message.length > 60 ? '...' : ''}\n`;
            message += `   ⏱️ ${this.formatTimeAgo(notif.createdAt)}\n\n`;
        }

        if (notifications.length > 5) {
            message += `\n... و ${notifications.length - 5} إشعارات أخرى`;
        }

        return message;
    }

    private formatTimeAgo(date: Date): string {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `منذ ${days} يوم`;
        if (hours > 0) return `منذ ${hours} ساعة`;
        if (minutes > 0) return `منذ ${minutes} دقيقة`;
        return 'الآن';
    }

    /**
     * 📊 Format stats as message
     */
    formatStats(userId: string): string {
        const stats = this.getStats(userId);

        let message = '📊 **إحصائيات الإشعارات:**\n\n';
        message += `📬 الإجمالي: ${stats.total}\n`;
        message += `🔔 غير مقروء: ${stats.unread}\n\n`;

        if (Object.keys(stats.byCategory).length > 0) {
            message += '**حسب الفئة:**\n';
            const categoryNames: Record<string, string> = {
                attendance: 'الحضور',
                leave: 'الإجازات',
                task: 'المهام',
                meeting: 'الاجتماعات',
                hr: 'الموارد البشرية',
                system: 'النظام',
                social: 'اجتماعي',
            };
            for (const [cat, count] of Object.entries(stats.byCategory)) {
                message += `• ${categoryNames[cat] || cat}: ${count}\n`;
            }
        }

        return message;
    }
}
