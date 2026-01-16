import { Injectable, Logger } from '@nestjs/common';

/**
 * 📅 Meeting & Calendar Service
 * Implements idea #16: Meeting scheduler
 * 
 * Features:
 * - Natural language meeting scheduling
 * - Room booking
 * - Conflict detection
 * - Meeting reminders
 */

export interface Meeting {
    id: string;
    title: string;
    organizer: string;
    organizerName: string;
    attendees: string[];
    startTime: Date;
    endTime: Date;
    room?: string;
    type: 'in_person' | 'virtual' | 'hybrid';
    link?: string;
    notes?: string;
    status: 'scheduled' | 'cancelled' | 'completed';
}

export interface MeetingRoom {
    id: string;
    name: string;
    nameAr: string;
    capacity: number;
    floor: number;
    amenities: string[];
    available: boolean;
}

export interface TimeSlot {
    start: Date;
    end: Date;
    available: boolean;
    conflict?: string;
}

@Injectable()
export class MeetingService {
    private readonly logger = new Logger(MeetingService.name);

    // In-memory storage
    private meetings: Map<string, Meeting> = new Map();

    // Meeting rooms
    private readonly rooms: MeetingRoom[] = [
        { id: '1', name: 'Conference Room A', nameAr: 'قاعة الاجتماعات أ', capacity: 10, floor: 2, amenities: ['projector', 'whiteboard', 'video_conferencing'], available: true },
        { id: '2', name: 'Meeting Room B', nameAr: 'غرفة الاجتماعات ب', capacity: 6, floor: 2, amenities: ['tv', 'whiteboard'], available: true },
        { id: '3', name: 'Boardroom', nameAr: 'غرفة مجلس الإدارة', capacity: 20, floor: 3, amenities: ['projector', 'video_conferencing', 'catering'], available: true },
        { id: '4', name: 'Huddle Space', nameAr: 'مساحة الاجتماعات السريعة', capacity: 4, floor: 1, amenities: ['tv'], available: true },
    ];

    /**
     * 📅 Schedule meeting from natural language
     */
    scheduleMeeting(
        userId: string,
        userName: string,
        request: string
    ): { success: boolean; meeting?: Meeting; message: string } {
        // Parse meeting details from request
        const parsed = this.parseRequest(request);

        if (!parsed.title || !parsed.startTime) {
            return {
                success: false,
                message: '❌ لم أستطع فهم تفاصيل الاجتماع.\n\nمثال: "رتب لي اجتماع مع الفريق غداً الساعة 10"',
            };
        }

        const meetingId = `MTG-${Date.now().toString(36).toUpperCase()}`;

        const meeting: Meeting = {
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

    private parseRequest(request: string): {
        title?: string;
        startTime?: Date;
        endTime?: Date;
        attendees?: string[];
        room?: string;
        type?: Meeting['type'];
    } {
        const now = new Date();
        const result: ReturnType<typeof this.parseRequest> = {};

        // Extract title
        const titleMatch = request.match(/اجتماع\s+(.*?)(?:\s+(?:غدا|يوم|الساعة|مع)|$)/i);
        result.title = titleMatch ? titleMatch[1].trim() || 'اجتماع' : 'اجتماع';

        // Extract time
        const timeMatch = request.match(/الساعة\s*(\d{1,2})(?::(\d{2}))?/);
        if (timeMatch) {
            const hour = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2] || '0');
            result.startTime = new Date(now);
            result.startTime.setHours(hour, minutes, 0, 0);
        }

        // Extract day
        if (/غدا|غداً/.test(request)) {
            if (!result.startTime) result.startTime = new Date(now);
            result.startTime.setDate(result.startTime.getDate() + 1);
        } else if (/بعد غد/.test(request)) {
            if (!result.startTime) result.startTime = new Date(now);
            result.startTime.setDate(result.startTime.getDate() + 2);
        } else if (!result.startTime) {
            result.startTime = new Date(now.getTime() + 60 * 60 * 1000); // Default: 1 hour from now
        }

        // Extract duration
        const durationMatch = request.match(/(\d+)\s*(ساعة|ساعات|دقيقة|دقائق)/);
        if (durationMatch) {
            const value = parseInt(durationMatch[1]);
            const unit = durationMatch[2];
            const durationMs = unit.startsWith('ساع') ? value * 60 * 60 * 1000 : value * 60 * 1000;
            result.endTime = new Date(result.startTime!.getTime() + durationMs);
        }

        // Extract type
        if (/اونلاين|online|زوم|zoom|teams/.test(request)) {
            result.type = 'virtual';
        }

        return result;
    }

    private formatMeetingConfirmation(meeting: Meeting): string {
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

    /**
     * 🏢 Get available rooms
     */
    getAvailableRooms(startTime: Date, endTime: Date, minCapacity: number = 2): MeetingRoom[] {
        // In production, check against actual bookings
        return this.rooms.filter(room => room.capacity >= minCapacity);
    }

    /**
     * 📋 Get user's meetings
     */
    getUserMeetings(userId: string): Meeting[] {
        const userMeetings: Meeting[] = [];
        for (const [, meeting] of this.meetings) {
            if (meeting.organizer === userId || meeting.attendees.includes(userId)) {
                userMeetings.push(meeting);
            }
        }
        return userMeetings.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    }

    /**
     * 📊 Format today's schedule
     */
    formatTodaySchedule(userId: string): string {
        const meetings = this.getUserMeetings(userId);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayMeetings = meetings.filter(m =>
            m.startTime >= today && m.startTime < tomorrow && m.status === 'scheduled'
        );

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

    /**
     * ❌ Cancel meeting
     */
    cancelMeeting(meetingId: string, userId: string): { success: boolean; message: string } {
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

    /**
     * 🏢 Format available rooms
     */
    formatAvailableRooms(): string {
        let message = '🏢 **القاعات المتاحة:**\n\n';

        for (const room of this.rooms) {
            const amenitiesAr = room.amenities.map(a => {
                const map: Record<string, string> = {
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
}
