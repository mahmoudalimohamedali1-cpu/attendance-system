"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var DailyBriefingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailyBriefingService = void 0;
const common_1 = require("@nestjs/common");
let DailyBriefingService = DailyBriefingService_1 = class DailyBriefingService {
    constructor() {
        this.logger = new common_1.Logger(DailyBriefingService_1.name);
        this.announcements = new Map();
        this.weatherConditions = {
            sunny: { conditionAr: 'مشمس', icon: '☀️' },
            cloudy: { conditionAr: 'غائم', icon: '☁️' },
            rainy: { conditionAr: 'ممطر', icon: '🌧️' },
            hot: { conditionAr: 'حار', icon: '🔥' },
            mild: { conditionAr: 'معتدل', icon: '🌤️' },
        };
        this.dailyTips = [
            '💡 ابدأ يومك بأهم مهمة',
            '💡 خذ استراحة كل 90 دقيقة',
            '💡 اشرب ماء كافي خلال اليوم',
            '💡 رتب مكتبك لزيادة التركيز',
            '💡 تواصل مع زميل لم تتحدث معه منذ فترة',
            '💡 اكتب 3 إنجازات لهذا اليوم',
            '💡 راجع أهدافك الأسبوعية',
            '💡 خذ مشي قصير بعد الغداء',
        ];
    }
    generateBriefing(userId, userName, isManager = false) {
        const now = new Date();
        const hour = now.getHours();
        let greeting;
        if (hour < 12) {
            greeting = `صباح الخير ${userName}! ☀️`;
        }
        else if (hour < 17) {
            greeting = `مساء الخير ${userName}! 🌤️`;
        }
        else {
            greeting = `مساء النور ${userName}! 🌙`;
        }
        const briefing = {
            userId,
            userName,
            date: now,
            greeting,
            weather: this.getWeather('الرياض'),
            attendance: this.generateAttendanceSummary(isManager),
            tasks: this.generateTasksSummary(),
            meetings: this.generateMeetingsSummary(),
            announcements: this.getActiveAnnouncements(),
            birthdays: this.getTodayBirthdays(),
            tip: this.getRandomTip(),
        };
        return briefing;
    }
    getWeather(city) {
        const month = new Date().getMonth();
        let condition;
        let temperature;
        if (month >= 5 && month <= 8) {
            condition = 'hot';
            temperature = 38 + Math.floor(Math.random() * 8);
        }
        else if (month >= 11 || month <= 2) {
            condition = 'mild';
            temperature = 18 + Math.floor(Math.random() * 8);
        }
        else {
            condition = 'sunny';
            temperature = 28 + Math.floor(Math.random() * 8);
        }
        return {
            city,
            temperature,
            condition,
            ...this.weatherConditions[condition],
        };
    }
    generateAttendanceSummary(isManager) {
        if (!isManager) {
            return { present: 0, absent: 0, late: 0, onLeave: 0, percentagePresent: 0 };
        }
        const total = 25;
        const present = 20 + Math.floor(Math.random() * 3);
        const absent = Math.floor(Math.random() * 2);
        const late = Math.floor(Math.random() * 3);
        const onLeave = total - present - absent;
        return {
            present,
            absent,
            late,
            onLeave,
            percentagePresent: Math.round((present / total) * 100),
        };
    }
    generateTasksSummary() {
        return {
            total: 8 + Math.floor(Math.random() * 5),
            completed: 3 + Math.floor(Math.random() * 3),
            pending: 3 + Math.floor(Math.random() * 3),
            overdue: Math.floor(Math.random() * 2),
            dueToday: 1 + Math.floor(Math.random() * 2),
        };
    }
    generateMeetingsSummary() {
        const meetings = [];
        const count = Math.floor(Math.random() * 3) + 1;
        const titles = ['اجتماع الفريق', 'متابعة المشروع', 'مراجعة الأداء', 'تخطيط الأسبوع'];
        const times = ['09:00', '11:00', '14:00', '16:00'];
        for (let i = 0; i < count; i++) {
            meetings.push({
                title: titles[i % titles.length],
                time: times[i],
                attendees: 3 + Math.floor(Math.random() * 5),
                type: Math.random() > 0.5 ? 'virtual' : 'in_person',
            });
        }
        return meetings;
    }
    getActiveAnnouncements() {
        const now = new Date();
        const active = [];
        for (const [, ann] of this.announcements) {
            if (!ann.expiresAt || ann.expiresAt > now) {
                active.push(ann);
            }
        }
        return active.sort((a, b) => b.priority - a.priority).slice(0, 3);
    }
    getTodayBirthdays() {
        const birthdays = ['أحمد محمد', 'سارة عبدالله'];
        return Math.random() > 0.7 ? birthdays : [];
    }
    getRandomTip() {
        return this.dailyTips[Math.floor(Math.random() * this.dailyTips.length)];
    }
    createAnnouncement(title, titleAr, content, type, priority = 1, expiresAt) {
        const id = `ANN-${Date.now().toString(36).toUpperCase()}`;
        const typeNames = {
            info: 'معلومات',
            urgent: 'عاجل',
            celebration: 'احتفال',
            reminder: 'تذكير',
        };
        const announcement = {
            id,
            title,
            titleAr,
            content,
            type,
            typeAr: typeNames[type],
            createdAt: new Date(),
            expiresAt,
            priority,
        };
        this.announcements.set(id, announcement);
        return announcement;
    }
    formatBriefing(briefing, isManager = false) {
        let message = `📰 **${briefing.greeting}**\n\n`;
        message += `📅 ${briefing.date.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n`;
        if (briefing.weather) {
            message += `${briefing.weather.icon} ${briefing.weather.city}: ${briefing.weather.temperature}°C ${briefing.weather.conditionAr}\n\n`;
        }
        if (isManager && briefing.attendance.present > 0) {
            message += `👥 **حضور الفريق:**\n`;
            message += `   ✅ حاضر: ${briefing.attendance.present} (${briefing.attendance.percentagePresent}%)\n`;
            if (briefing.attendance.late > 0)
                message += `   ⏰ متأخر: ${briefing.attendance.late}\n`;
            if (briefing.attendance.absent > 0)
                message += `   ❌ غائب: ${briefing.attendance.absent}\n`;
            if (briefing.attendance.onLeave > 0)
                message += `   🏖️ إجازة: ${briefing.attendance.onLeave}\n`;
            message += '\n';
        }
        message += `📋 **مهامك:**\n`;
        message += `   📊 المجموع: ${briefing.tasks.total} | ✅ مكتمل: ${briefing.tasks.completed}\n`;
        if (briefing.tasks.dueToday > 0)
            message += `   ⚡ مستحق اليوم: ${briefing.tasks.dueToday}\n`;
        if (briefing.tasks.overdue > 0)
            message += `   ⚠️ متأخر: ${briefing.tasks.overdue}\n`;
        message += '\n';
        if (briefing.meetings.length > 0) {
            message += `📅 **اجتماعات اليوم:**\n`;
            for (const meeting of briefing.meetings) {
                const typeIcon = meeting.type === 'virtual' ? '💻' : '🏢';
                message += `   ${typeIcon} ${meeting.time} - ${meeting.title}\n`;
            }
            message += '\n';
        }
        if (briefing.announcements.length > 0) {
            message += `📢 **إعلانات:**\n`;
            for (const ann of briefing.announcements) {
                const typeIcon = { info: 'ℹ️', urgent: '🚨', celebration: '🎉', reminder: '🔔' }[ann.type];
                message += `   ${typeIcon} ${ann.titleAr}\n`;
            }
            message += '\n';
        }
        if (briefing.birthdays.length > 0) {
            message += `🎂 **أعياد ميلاد اليوم:** ${briefing.birthdays.join(', ')}\n\n`;
        }
        message += `\n${briefing.tip}`;
        return message;
    }
    formatAnnouncements() {
        const active = this.getActiveAnnouncements();
        if (active.length === 0) {
            return '📢 لا توجد إعلانات حالياً';
        }
        let message = '📢 **الإعلانات:**\n\n';
        for (const ann of active) {
            const typeIcon = { info: 'ℹ️', urgent: '🚨', celebration: '🎉', reminder: '🔔' }[ann.type];
            message += `${typeIcon} **${ann.titleAr}**\n`;
            message += `${ann.content}\n\n`;
        }
        return message;
    }
};
exports.DailyBriefingService = DailyBriefingService;
exports.DailyBriefingService = DailyBriefingService = DailyBriefingService_1 = __decorate([
    (0, common_1.Injectable)()
], DailyBriefingService);
//# sourceMappingURL=daily-briefing.service.js.map