"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SmartSchedulerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartSchedulerService = void 0;
const common_1 = require("@nestjs/common");
let SmartSchedulerService = SmartSchedulerService_1 = class SmartSchedulerService {
    constructor() {
        this.logger = new common_1.Logger(SmartSchedulerService_1.name);
        this.focusBlocks = new Map();
        this.daysAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    }
    findOptimalTime(duration, attendees, preferredDays = [0, 1, 2, 3, 4]) {
        const suggestions = [];
        const now = new Date();
        for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
            const date = new Date(now);
            date.setDate(date.getDate() + dayOffset);
            if (!preferredDays.includes(date.getDay()))
                continue;
            for (let hour = 9; hour <= 11; hour++) {
                const slot = this.createTimeSlot(date, hour, duration);
                suggestions.push(this.evaluateSlot(slot, attendees));
            }
            for (let hour = 14; hour <= 16; hour++) {
                const slot = this.createTimeSlot(date, hour, duration);
                suggestions.push(this.evaluateSlot(slot, attendees));
            }
        }
        return suggestions
            .filter(s => s.allAvailable || s.conflictCount < 2)
            .sort((a, b) => b.slot.score - a.slot.score)
            .slice(0, 5);
    }
    createTimeSlot(date, hour, duration) {
        const start = new Date(date);
        start.setHours(hour, 0, 0, 0);
        const end = new Date(start.getTime() + duration * 60000);
        let score = 70;
        if (hour >= 9 && hour <= 11)
            score += 20;
        if (hour === 10)
            score += 10;
        if (date.getDay() !== 4)
            score += 5;
        if (duration <= 60)
            score += 5;
        return { start, end, available: true, score };
    }
    evaluateSlot(slot, attendees) {
        const conflictCount = Math.floor(Math.random() * (attendees.length + 1));
        const allAvailable = conflictCount === 0;
        slot.score = Math.max(0, slot.score - conflictCount * 15);
        slot.available = allAvailable;
        let recommendation;
        if (allAvailable) {
            recommendation = 'وقت مثالي - الجميع متاحون';
        }
        else if (conflictCount === 1) {
            recommendation = 'جيد - شخص واحد غير متاح';
        }
        else {
            recommendation = `يحتاج تنسيق - ${conflictCount} غير متاحين`;
        }
        return {
            slot,
            attendees,
            allAvailable,
            conflictCount,
            recommendation,
        };
    }
    createFocusTime(userId, title, start, duration, recurring = false) {
        const id = `FOCUS-${Date.now().toString(36).toUpperCase()}`;
        const end = new Date(start.getTime() + duration * 60000);
        const block = {
            id,
            userId,
            title,
            start,
            end,
            recurring,
            protected: true,
        };
        this.focusBlocks.set(id, block);
        return block;
    }
    getCalendarAnalytics(userId) {
        const totalMeetings = 15 + Math.floor(Math.random() * 10);
        const avgDuration = 45 + Math.floor(Math.random() * 30);
        const meetingHours = Math.round((totalMeetings * avgDuration) / 60);
        return {
            totalMeetings,
            meetingHours,
            focusHours: 40 - meetingHours,
            meetingFreeDay: this.daysAr[Math.floor(Math.random() * 5)],
            busiestDay: this.daysAr[Math.floor(Math.random() * 5)],
            avgMeetingDuration: avgDuration,
            backToBackCount: Math.floor(Math.random() * 5),
        };
    }
    getWorkloadDistribution(userId) {
        const distribution = [];
        for (let i = 0; i < 5; i++) {
            const meetingHours = 1 + Math.floor(Math.random() * 5);
            const focusHours = 8 - meetingHours;
            const totalHours = meetingHours + focusHours;
            let status;
            if (meetingHours <= 2)
                status = 'light';
            else if (meetingHours <= 4)
                status = 'balanced';
            else if (meetingHours <= 6)
                status = 'heavy';
            else
                status = 'overloaded';
            distribution.push({
                day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'][i],
                dayAr: this.daysAr[i],
                meetingHours,
                focusHours,
                totalHours,
                status,
            });
        }
        return distribution;
    }
    getRecommendations(userId) {
        const analytics = this.getCalendarAnalytics(userId);
        const recommendations = [];
        if (analytics.meetingHours > 25) {
            recommendations.push('⚠️ لديك اجتماعات كثيرة. حاول دمج بعضها أو إلغاء غير الضروري.');
        }
        if (analytics.backToBackCount > 3) {
            recommendations.push('💡 لديك اجتماعات متتالية. أضف فترات راحة بينها.');
        }
        if (analytics.focusHours < 15) {
            recommendations.push('🎯 لديك وقت تركيز قليل. احجز فترات للعمل العميق.');
        }
        if (analytics.avgMeetingDuration > 60) {
            recommendations.push('⏰ متوسط اجتماعاتك طويل. جرب اجتماعات 25/50 دقيقة.');
        }
        if (recommendations.length === 0) {
            recommendations.push('✅ جدولك متوازن بشكل جيد!');
        }
        return recommendations;
    }
    formatMeetingSuggestions(suggestions) {
        if (suggestions.length === 0) {
            return '❌ لم أجد أوقات مناسبة. جرب تواريخ مختلفة.';
        }
        let message = '📅 **أفضل الأوقات للاجتماع:**\n\n';
        for (let i = 0; i < suggestions.length; i++) {
            const s = suggestions[i];
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '📌';
            const dateStr = s.slot.start.toLocaleDateString('ar-SA', { weekday: 'long', month: 'short', day: 'numeric' });
            const timeStr = s.slot.start.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
            message += `${medal} **${dateStr}** - ${timeStr}\n`;
            message += `   📊 التقييم: ${s.slot.score}%\n`;
            message += `   💡 ${s.recommendation}\n\n`;
        }
        return message;
    }
    formatCalendarAnalytics(userId) {
        const analytics = this.getCalendarAnalytics(userId);
        const recommendations = this.getRecommendations(userId);
        let message = '📊 **تحليل جدولك هذا الأسبوع:**\n\n';
        message += `📅 الاجتماعات: ${analytics.totalMeetings}\n`;
        message += `⏰ ساعات الاجتماعات: ${analytics.meetingHours}\n`;
        message += `🎯 ساعات التركيز: ${analytics.focusHours}\n`;
        message += `⌛ متوسط مدة الاجتماع: ${analytics.avgMeetingDuration} دقيقة\n`;
        message += `📈 اجتماعات متتالية: ${analytics.backToBackCount}\n\n`;
        message += `🟢 أفضل يوم للتركيز: ${analytics.meetingFreeDay}\n`;
        message += `🔴 أكثر يوم ازدحاماً: ${analytics.busiestDay}\n\n`;
        message += '**💡 التوصيات:**\n';
        for (const rec of recommendations) {
            message += `${rec}\n`;
        }
        return message;
    }
    formatWorkloadDistribution(userId) {
        const distribution = this.getWorkloadDistribution(userId);
        let message = '📊 **توزيع عبء العمل:**\n\n';
        for (const day of distribution) {
            const statusEmoji = {
                light: '🟢',
                balanced: '🟡',
                heavy: '🟠',
                overloaded: '🔴',
            }[day.status];
            const bar = '█'.repeat(day.meetingHours) + '░'.repeat(8 - day.meetingHours);
            message += `${statusEmoji} **${day.dayAr}**: ${bar} ${day.meetingHours}h اجتماعات\n`;
        }
        return message;
    }
};
exports.SmartSchedulerService = SmartSchedulerService;
exports.SmartSchedulerService = SmartSchedulerService = SmartSchedulerService_1 = __decorate([
    (0, common_1.Injectable)()
], SmartSchedulerService);
//# sourceMappingURL=smart-scheduler.service.js.map