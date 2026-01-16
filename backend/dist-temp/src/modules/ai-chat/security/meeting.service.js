"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MeetingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeetingService = void 0;
const common_1 = require("@nestjs/common");
let MeetingService = MeetingService_1 = class MeetingService {
    constructor() {
        this.logger = new common_1.Logger(MeetingService_1.name);
        this.meetings = new Map();
        this.rooms = [
            { id: '1', name: 'Conference Room A', nameAr: 'قاعة الاجتماعات أ', capacity: 10, floor: 2, amenities: ['projector', 'whiteboard', 'video_conferencing'], available: true },
            { id: '2', name: 'Meeting Room B', nameAr: 'غرفة الاجتماعات ب', capacity: 6, floor: 2, amenities: ['tv', 'whiteboard'], available: true },
            { id: '3', name: 'Boardroom', nameAr: 'غرفة مجلس الإدارة', capacity: 20, floor: 3, amenities: ['projector', 'video_conferencing', 'catering'], available: true },
            { id: '4', name: 'Huddle Space', nameAr: 'مساحة الاجتماعات السريعة', capacity: 4, floor: 1, amenities: ['tv'], available: true },
        ];
    }
    scheduleMeeting(userId, userName, request) {
        const parsed = this.parseRequest(request);
        if (!parsed.title || !parsed.startTime) {
            return {
                success: false,
                message: '❌ لم أستطع فهم تفاصيل الاجتماع.\n\nمثال: "رتب لي اجتماع مع الفريق غداً الساعة 10"',
            };
        }
        const meetingId = `MTG-${Date.now().toString(36).toUpperCase()}`;
        const meeting = {
            id: meetingId,
            title: parsed.title,
            organizer: userId,
            organizerName: userName,
            attendees: parsed.attendees || [],
            startTime: parsed.startTime,
            endTime: parsed.endTime || new Date(parsed.startTime.getTime() + 60 * 60 * 1000),
            room: parsed.room,
            type: parsed.type || 'in_person',
            status: 'scheduled',
        };
        this.meetings.set(meetingId, meeting);
        return {
            success: true,
            meeting,
            message: this.formatMeetingConfirmation(meeting),
        };
    }
    parseRequest(request) {
        const now = new Date();
        const result = {};
        const titleMatch = request.match(/اجتماع\s+(.*?)(?:\s+(?:غدا|يوم|الساعة|مع)|$)/i);
        result.title = titleMatch ? titleMatch[1].trim() || 'اجتماع' : 'اجتماع';
        const timeMatch = request.match(/الساعة\s*(\d{1,2})(?::(\d{2}))?/);
        if (timeMatch) {
            const hour = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2] || '0');
            result.startTime = new Date(now);
            result.startTime.setHours(hour, minutes, 0, 0);
        }
        if (/غدا|غداً/.test(request)) {
            if (!result.startTime)
                result.startTime = new Date(now);
            result.startTime.setDate(result.startTime.getDate() + 1);
        }
        else if (/بعد غد/.test(request)) {
            if (!result.startTime)
                result.startTime = new Date(now);
            result.startTime.setDate(result.startTime.getDate() + 2);
        }
        else if (!result.startTime) {
            result.startTime = new Date(now.getTime() + 60 * 60 * 1000);
        }
        const durationMatch = request.match(/(\d+)\s*(ساعة|ساعات|دقيقة|دقائق)/);
        if (durationMatch) {
            const value = parseInt(durationMatch[1]);
            const unit = durationMatch[2];
            const durationMs = unit.startsWith('ساع') ? value * 60 * 60 * 1000 : value * 60 * 1000;
            result.endTime = new Date(result.startTime.getTime() + durationMs);
        }
        if (/اونلاين|online|زوم|zoom|teams/.test(request)) {
            result.type = 'virtual';
        }
        return result;
    }
    formatMeetingConfirmation(meeting) {
        const dateStr = meeting.startTime.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = meeting.startTime.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        const endTimeStr = meeting.endTime.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        let message = `✅ **تم جدولة الاجتماع!**\n\n`;
        message += `📋 **${meeting.title}**\n`;
        message += `📅 ${dateStr}\n`;
        message += `⏰ ${timeStr} - ${endTimeStr}\n`;
        if (meeting.room) {
            const room = this.rooms.find(r => r.id === meeting.room);
            message += `📍 ${room?.nameAr || meeting.room}\n`;
        }
        if (meeting.type === 'virtual') {
            message += `💻 اجتماع افتراضي\n`;
        }
        message += `\n🔗 رقم الاجتماع: #${meeting.id}`;
        return message;
    }
    getAvailableRooms(startTime, endTime, minCapacity = 2) {
        return this.rooms.filter(room => room.capacity >= minCapacity);
    }
    getUserMeetings(userId) {
        const userMeetings = [];
        for (const [, meeting] of this.meetings) {
            if (meeting.organizer === userId || meeting.attendees.includes(userId)) {
                userMeetings.push(meeting);
            }
        }
        return userMeetings.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    }
    formatTodaySchedule(userId) {
        const meetings = this.getUserMeetings(userId);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const todayMeetings = meetings.filter(m => m.startTime >= today && m.startTime < tomorrow && m.status === 'scheduled');
        if (todayMeetings.length === 0) {
            return '📅 لا توجد اجتماعات مجدولة اليوم.\n\nقل "رتب لي اجتماع" لجدولة اجتماع جديد';
        }
        let message = '📅 **جدول اليوم:**\n\n';
        for (const meeting of todayMeetings) {
            const timeStr = meeting.startTime.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
            const typeEmoji = { in_person: '🏢', virtual: '💻', hybrid: '🔄' }[meeting.type];
            message += `${typeEmoji} **${timeStr}** - ${meeting.title}\n`;
            if (meeting.room) {
                const room = this.rooms.find(r => r.id === meeting.room);
                message += `   📍 ${room?.nameAr}\n`;
            }
            message += '\n';
        }
        return message;
    }
    cancelMeeting(meetingId, userId) {
        const meeting = this.meetings.get(meetingId);
        if (!meeting) {
            return { success: false, message: '❌ الاجتماع غير موجود' };
        }
        if (meeting.organizer !== userId) {
            return { success: false, message: '❌ لا يمكنك إلغاء اجتماع لم تنظمه' };
        }
        meeting.status = 'cancelled';
        return {
            success: true,
            message: `✅ تم إلغاء الاجتماع "${meeting.title}"`,
        };
    }
    formatAvailableRooms() {
        let message = '🏢 **القاعات المتاحة:**\n\n';
        for (const room of this.rooms) {
            const amenitiesAr = room.amenities.map(a => {
                const map = {
                    projector: 'بروجكتور',
                    whiteboard: 'سبورة',
                    video_conferencing: 'مؤتمرات الفيديو',
                    tv: 'شاشة',
                    catering: 'ضيافة',
                };
                return map[a] || a;
            });
            message += `📍 **${room.nameAr}**\n`;
            message += `   👥 السعة: ${room.capacity} | الطابق: ${room.floor}\n`;
            message += `   ✨ ${amenitiesAr.join(', ')}\n\n`;
        }
        return message;
    }
};
exports.MeetingService = MeetingService;
exports.MeetingService = MeetingService = MeetingService_1 = __decorate([
    (0, common_1.Injectable)()
], MeetingService);
//# sourceMappingURL=meeting.service.js.map