"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor() {
        this.logger = new common_1.Logger(NotificationsService_1.name);
        this.notifications = new Map();
        this.preferences = new Map();
        this.typeLabels = {
            info: 'معلومات',
            warning: 'تحذير',
            urgent: 'عاجل',
            success: 'نجاح',
            reminder: 'تذكير',
            action_required: 'يتطلب إجراء',
        };
    }
    createNotification(userId, type, title, message, category, priority = 'medium', actionUrl, actionLabel) {
        const id = `NOTIF-${Date.now().toString(36).toUpperCase()}`;
        const notification = {
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
    getUserNotifications(userId, unreadOnly = false) {
        const userNotifications = [];
        for (const [, notif] of this.notifications) {
            if (notif.userId === userId) {
                if (unreadOnly && notif.read)
                    continue;
                userNotifications.push(notif);
            }
        }
        return userNotifications.sort((a, b) => {
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0)
                return priorityDiff;
            return b.createdAt.getTime() - a.createdAt.getTime();
        });
    }
    markAsRead(notificationId) {
        const notification = this.notifications.get(notificationId);
        if (!notification) {
            return { success: false, message: '❌ الإشعار غير موجود' };
        }
        notification.read = true;
        return { success: true, message: '✅ تم التحديد كمقروء' };
    }
    markAllAsRead(userId) {
        let count = 0;
        for (const [, notif] of this.notifications) {
            if (notif.userId === userId && !notif.read) {
                notif.read = true;
                count++;
            }
        }
        return count;
    }
    getStats(userId) {
        const userNotifications = this.getUserNotifications(userId);
        const stats = {
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
    getPreferences(userId) {
        return this.preferences.get(userId) || this.getDefaultPreferences(userId);
    }
    getDefaultPreferences(userId) {
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
    updatePreferences(userId, updates) {
        const current = this.getPreferences(userId);
        const updated = { ...current, ...updates };
        this.preferences.set(userId, updated);
        return updated;
    }
    clearOldNotifications(userId, daysOld = 30) {
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
    formatNotifications(userId) {
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
    formatTimeAgo(date) {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (days > 0)
            return `منذ ${days} يوم`;
        if (hours > 0)
            return `منذ ${hours} ساعة`;
        if (minutes > 0)
            return `منذ ${minutes} دقيقة`;
        return 'الآن';
    }
    formatStats(userId) {
        const stats = this.getStats(userId);
        let message = '📊 **إحصائيات الإشعارات:**\n\n';
        message += `📬 الإجمالي: ${stats.total}\n`;
        message += `🔔 غير مقروء: ${stats.unread}\n\n`;
        if (Object.keys(stats.byCategory).length > 0) {
            message += '**حسب الفئة:**\n';
            const categoryNames = {
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
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)()
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map