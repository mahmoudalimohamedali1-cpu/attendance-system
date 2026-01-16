"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var EmergencyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyService = void 0;
const common_1 = require("@nestjs/common");
let EmergencyService = EmergencyService_1 = class EmergencyService {
    constructor() {
        this.logger = new common_1.Logger(EmergencyService_1.name);
        this.contacts = [
            { id: '1', name: 'Security Control Room', nameAr: 'غرفة التحكم الأمني', type: 'internal', phone: '1111', available24h: true, priority: 1 },
            { id: '2', name: 'Medical Emergency', nameAr: 'الطوارئ الطبية', type: 'internal', phone: '2222', available24h: true, priority: 1 },
            { id: '3', name: 'HR Emergency', nameAr: 'طوارئ الموارد البشرية', type: 'internal', phone: '3333', available24h: false, priority: 2 },
            { id: '4', name: 'Civil Defense', nameAr: 'الدفاع المدني', type: 'government', phone: '998', available24h: true, priority: 1 },
            { id: '5', name: 'Police', nameAr: 'الشرطة', type: 'government', phone: '999', available24h: true, priority: 1 },
            { id: '6', name: 'Ambulance', nameAr: 'الإسعاف', type: 'government', phone: '997', available24h: true, priority: 1 },
            { id: '7', name: 'IT Emergency', nameAr: 'طوارئ تقنية المعلومات', type: 'internal', phone: '4444', available24h: false, priority: 3 },
        ];
        this.alerts = new Map();
        this.incidents = new Map();
    }
    getContacts(type) {
        let contacts = this.contacts;
        if (type) {
            contacts = contacts.filter(c => c.type === type);
        }
        return contacts.sort((a, b) => a.priority - b.priority);
    }
    createAlert(type, severity, title, message, instructions, hoursToExpire = 24) {
        const id = `ALERT-${Date.now().toString(36).toUpperCase()}`;
        const typeNames = {
            fire: 'حريق',
            medical: 'طوارئ طبية',
            security: 'أمني',
            weather: 'طقس',
            other: 'أخرى',
        };
        const alert = {
            id,
            type,
            typeAr: typeNames[type],
            severity,
            title,
            message,
            instructions,
            active: true,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + hoursToExpire * 60 * 60 * 1000),
        };
        this.alerts.set(id, alert);
        return alert;
    }
    getActiveAlerts() {
        const now = new Date();
        const active = [];
        for (const [, alert] of this.alerts) {
            if (alert.active && (!alert.expiresAt || alert.expiresAt > now)) {
                active.push(alert);
            }
        }
        return active.sort((a, b) => {
            const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        });
    }
    reportIncident(reporterId, reporterName, type, description, location, severity) {
        const id = `INC-${Date.now().toString(36).toUpperCase()}`;
        const typeNames = {
            accident: 'حادث',
            security: 'أمني',
            harassment: 'تحرش',
            safety: 'سلامة',
            other: 'أخرى',
        };
        const incident = {
            id,
            reporterId,
            reporterName,
            type,
            typeAr: typeNames[type],
            description,
            location,
            severity,
            status: 'reported',
            createdAt: new Date(),
        };
        this.incidents.set(id, incident);
        return incident;
    }
    getEvacuationPlan(building = 'المبنى الرئيسي') {
        return {
            building,
            floor: 'جميع الطوابق',
            assemblyPoint: 'ساحة المواقف الشمالية',
            routes: [
                { from: 'الطابق الأرضي', to: 'المخرج الرئيسي', instructions: 'اتجه يميناً ثم مباشرة للمخرج' },
                { from: 'الطابق الأول', to: 'سلم الطوارئ', instructions: 'اتجه للممر ثم يساراً' },
                { from: 'الطابق الثاني', to: 'سلم الطوارئ', instructions: 'اتبع إشارات الخروج الخضراء' },
            ],
            wardens: [
                { name: 'محمد السيد', phone: '0501234567', area: 'الطابق الأرضي' },
                { name: 'أحمد علي', phone: '0507654321', area: 'الطابق الأول' },
            ],
        };
    }
    formatContacts() {
        let message = '🚨 **أرقام الطوارئ:**\n\n';
        const internal = this.getContacts('internal');
        const government = this.getContacts('government');
        message += '🏢 **داخلية:**\n';
        for (const c of internal) {
            const h24 = c.available24h ? ' (24/7)' : '';
            message += `📞 ${c.nameAr}: **${c.phone}**${h24}\n`;
        }
        message += '\n🏛️ **حكومية:**\n';
        for (const c of government) {
            message += `📞 ${c.nameAr}: **${c.phone}**\n`;
        }
        return message;
    }
    formatAlerts() {
        const alerts = this.getActiveAlerts();
        if (alerts.length === 0) {
            return '✅ لا توجد تنبيهات نشطة حالياً';
        }
        let message = '🚨 **التنبيهات النشطة:**\n\n';
        for (const alert of alerts) {
            const severityEmoji = {
                low: '🟢',
                medium: '🟡',
                high: '🟠',
                critical: '🔴',
            }[alert.severity];
            message += `${severityEmoji} **${alert.title}** (${alert.typeAr})\n`;
            message += `${alert.message}\n`;
            if (alert.instructions.length > 0) {
                message += '📋 التعليمات:\n';
                for (const inst of alert.instructions) {
                    message += `• ${inst}\n`;
                }
            }
            message += '\n';
        }
        return message;
    }
    formatEvacuationPlan() {
        const plan = this.getEvacuationPlan();
        let message = `🏃 **خطة الإخلاء - ${plan.building}**\n\n`;
        message += `📍 نقطة التجمع: **${plan.assemblyPoint}**\n\n`;
        message += '🚪 **مسارات الإخلاء:**\n';
        for (const route of plan.routes) {
            message += `• من ${route.from}: ${route.instructions}\n`;
        }
        message += '\n👷 **مسؤولو السلامة:**\n';
        for (const warden of plan.wardens) {
            message += `• ${warden.name} (${warden.area}): ${warden.phone}\n`;
        }
        message += '\n⚠️ في حالة الطوارئ:\n';
        message += '1. حافظ على هدوئك\n';
        message += '2. اتبع تعليمات مسؤول السلامة\n';
        message += '3. لا تستخدم المصاعد\n';
        message += '4. توجه لنقطة التجمع';
        return message;
    }
    formatIncidentConfirmation(incident) {
        const severityEmoji = { low: '🟢', medium: '🟡', high: '🔴' }[incident.severity];
        let message = `✅ **تم تسجيل البلاغ #${incident.id}**\n\n`;
        message += `${severityEmoji} النوع: ${incident.typeAr}\n`;
        message += `📍 الموقع: ${incident.location}\n`;
        message += `📝 الوصف: ${incident.description.substring(0, 100)}...\n\n`;
        message += '⏳ سيتم التواصل معك قريباً';
        return message;
    }
};
exports.EmergencyService = EmergencyService;
exports.EmergencyService = EmergencyService = EmergencyService_1 = __decorate([
    (0, common_1.Injectable)()
], EmergencyService);
//# sourceMappingURL=emergency.service.js.map