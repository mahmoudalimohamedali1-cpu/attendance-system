"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MobileFeaturesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MobileFeaturesService = void 0;
const common_1 = require("@nestjs/common");
let MobileFeaturesService = MobileFeaturesService_1 = class MobileFeaturesService {
    constructor() {
        this.logger = new common_1.Logger(MobileFeaturesService_1.name);
        this.notificationSettings = new Map();
        this.offlineQueue = new Map();
        this.quickActions = [
            { id: '1', icon: '⏰', name: 'Check In', nameAr: 'تسجيل حضور', command: 'check_in', order: 1, visible: true },
            { id: '2', icon: '🚪', name: 'Check Out', nameAr: 'تسجيل انصراف', command: 'check_out', order: 2, visible: true },
            { id: '3', icon: '🏖️', name: 'Leave Request', nameAr: 'طلب إجازة', command: 'leave', order: 3, visible: true },
            { id: '4', icon: '💰', name: 'Salary', nameAr: 'راتبي', command: 'salary', order: 4, visible: true },
            { id: '5', icon: '📅', name: 'My Schedule', nameAr: 'جدولي', command: 'schedule', order: 5, visible: true },
            { id: '6', icon: '📊', name: 'Attendance', nameAr: 'الحضور', command: 'attendance', order: 6, visible: true },
            { id: '7', icon: '🎯', name: 'Goals', nameAr: 'أهدافي', command: 'goals', order: 7, visible: false },
            { id: '8', icon: '🏆', name: 'Achievements', nameAr: 'إنجازاتي', command: 'achievements', order: 8, visible: false },
        ];
    }
    getNotificationSettings(userId) {
        return this.notificationSettings.get(userId) || this.getDefaultSettings(userId);
    }
    getDefaultSettings(userId) {
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
    updateSettings(userId, updates) {
        const current = this.getNotificationSettings(userId);
        const updated = { ...current, ...updates };
        this.notificationSettings.set(userId, updated);
        return updated;
    }
    queueOfflineAction(userId, type, data) {
        const id = `OFFLINE-${Date.now().toString(36).toUpperCase()}`;
        const action = {
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
    syncOfflineActions(userId) {
        const userActions = Array.from(this.offlineQueue.values())
            .filter(a => a.userId === userId && a.status === 'pending');
        let synced = 0;
        let failed = 0;
        for (const action of userActions) {
            if (Math.random() > 0.1) {
                action.status = 'synced';
                action.syncedAt = new Date();
                synced++;
            }
            else {
                action.status = 'failed';
                failed++;
            }
        }
        return { synced, failed };
    }
    processLocationCheckIn(userId, latitude, longitude, accuracy) {
        const officeLatitude = 24.7136;
        const officeLongitude = 46.6753;
        const maxDistance = 0.01;
        const distance = Math.sqrt(Math.pow(latitude - officeLatitude, 2) +
            Math.pow(longitude - officeLongitude, 2));
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
    getQuickActions(showAll = false) {
        if (showAll) {
            return this.quickActions.sort((a, b) => a.order - b.order);
        }
        return this.quickActions.filter(a => a.visible).sort((a, b) => a.order - b.order);
    }
    formatNotificationSettings(userId) {
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
    formatQuickActions() {
        const actions = this.getQuickActions();
        let message = `⚡ **الإجراءات السريعة:**\n\n`;
        for (const action of actions) {
            message += `${action.icon} ${action.nameAr}\n`;
        }
        message += `\n💡 اضغط على أي إجراء للتنفيذ`;
        return message;
    }
    formatSyncStatus(result) {
        let message = `🔄 **حالة المزامنة:**\n\n`;
        message += `✅ تمت مزامنة: ${result.synced}\n`;
        if (result.failed > 0) {
            message += `❌ فشل: ${result.failed}\n\n`;
            message += `💡 جرب المزامنة مرة أخرى لاحقاً`;
        }
        else if (result.synced > 0) {
            message += `\n✅ تمت المزامنة بنجاح!`;
        }
        else {
            message += `\n📭 لا توجد عناصر للمزامنة`;
        }
        return message;
    }
};
exports.MobileFeaturesService = MobileFeaturesService;
exports.MobileFeaturesService = MobileFeaturesService = MobileFeaturesService_1 = __decorate([
    (0, common_1.Injectable)()
], MobileFeaturesService);
//# sourceMappingURL=mobile-features.service.js.map