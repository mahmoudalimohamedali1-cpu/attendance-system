import { Injectable, Logger } from '@nestjs/common';

/**
 * 📰 Daily Briefing Service
 * Implements idea #2: Personalized daily briefing
 * 
 * Features:
 * - Morning summary
 * - Key metrics overview
 * - Team updates
 * - Today's priorities
 */

export interface DailyBriefing {
    userId: string;
    userName: string;
    date: Date;
    greeting: string;
    weather?: WeatherInfo;
    attendance: AttendanceSummary;
    tasks: TasksSummary;
    meetings: MeetingSummary[];
    announcements: Announcement[];
    birthdays: string[];
    tip: string;
}

export interface WeatherInfo {
    city: string;
    temperature: number;
    condition: string;
    conditionAr: string;
    icon: string;
}

export interface AttendanceSummary {
    present: number;
    absent: number;
    late: number;
    onLeave: number;
    percentagePresent: number;
}

export interface TasksSummary {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    dueToday: number;
}

export interface MeetingSummary {
    title: string;
    time: string;
    attendees: number;
    type: 'in_person' | 'virtual';
}

export interface Announcement {
    id: string;
    title: string;
    titleAr: string;
    content: string;
    type: 'info' | 'urgent' | 'celebration' | 'reminder';
    typeAr: string;
    createdAt: Date;
    expiresAt?: Date;
    priority: number;
}

@Injectable()
export class DailyBriefingService {
    private readonly logger = new Logger(DailyBriefingService.name);

    // Announcements storage
    private announcements: Map<string, Announcement> = new Map();

    // Sample weather data
    private readonly weatherConditions: Record<string, { conditionAr: string; icon: string }> = {
        sunny: { conditionAr: 'مشمس', icon: '☀️' },
        cloudy: { conditionAr: 'غائم', icon: '☁️' },
        rainy: { conditionAr: 'ممطر', icon: '🌧️' },
        hot: { conditionAr: 'حار', icon: '🔥' },
        mild: { conditionAr: 'معتدل', icon: '🌤️' },
    };

    // Daily tips
    private readonly dailyTips: string[] = [
        '💡 ابدأ يومك بأهم مهمة',
        '💡 خذ استراحة كل 90 دقيقة',
        '💡 اشرب ماء كافي خلال اليوم',
        '💡 رتب مكتبك لزيادة التركيز',
        '💡 تواصل مع زميل لم تتحدث معه منذ فترة',
        '💡 اكتب 3 إنجازات لهذا اليوم',
        '💡 راجع أهدافك الأسبوعية',
        '💡 خذ مشي قصير بعد الغداء',
    ];

    /**
     * 📰 Generate daily briefing
     */
    generateBriefing(
        userId: string,
        userName: string,
        isManager: boolean = false
    ): DailyBriefing {
        const now = new Date();
        const hour = now.getHours();

        // Time-based greeting
        let greeting: string;
        if (hour < 12) {
            greeting = `صباح الخير ${userName}! ☀️`;
        } else if (hour < 17) {
            greeting = `مساء الخير ${userName}! 🌤️`;
        } else {
            greeting = `مساء النور ${userName}! 🌙`;
        }

        // Generate mock data
        const briefing: DailyBriefing = {
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

    private getWeather(city: string): WeatherInfo {
        const month = new Date().getMonth();
        let condition: string;
        let temperature: number;

        // Seasonal weather for Riyadh
        if (month >= 5 && month <= 8) {
            condition = 'hot';
            temperature = 38 + Math.floor(Math.random() * 8);
        } else if (month >= 11 || month <= 2) {
            condition = 'mild';
            temperature = 18 + Math.floor(Math.random() * 8);
        } else {
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

    private generateAttendanceSummary(isManager: boolean): AttendanceSummary {
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

    private generateTasksSummary(): TasksSummary {
        return {
            total: 8 + Math.floor(Math.random() * 5),
            completed: 3 + Math.floor(Math.random() * 3),
            pending: 3 + Math.floor(Math.random() * 3),
            overdue: Math.floor(Math.random() * 2),
            dueToday: 1 + Math.floor(Math.random() * 2),
        };
    }

    private generateMeetingsSummary(): MeetingSummary[] {
        const meetings: MeetingSummary[] = [];
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

    private getActiveAnnouncements(): Announcement[] {
        const now = new Date();
        const active: Announcement[] = [];

        for (const [, ann] of this.announcements) {
            if (!ann.expiresAt || ann.expiresAt > now) {
                active.push(ann);
            }
        }

        return active.sort((a, b) => b.priority - a.priority).slice(0, 3);
    }

    private getTodayBirthdays(): string[] {
        // Mock birthdays
        const birthdays = ['أحمد محمد', 'سارة عبدالله'];
        return Math.random() > 0.7 ? birthdays : [];
    }

    private getRandomTip(): string {
        return this.dailyTips[Math.floor(Math.random() * this.dailyTips.length)];
    }

    /**
     * 📢 Create announcement
     */
    createAnnouncement(
        title: string,
        titleAr: string,
        content: string,
        type: Announcement['type'],
        priority: number = 1,
        expiresAt?: Date
    ): Announcement {
        const id = `ANN-${Date.now().toString(36).toUpperCase()}`;

        const typeNames: Record<string, string> = {
            info: 'معلومات',
            urgent: 'عاجل',
            celebration: 'احتفال',
            reminder: 'تذكير',
        };

        const announcement: Announcement = {
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

    /**
     * 📊 Format briefing as message
     */
    formatBriefing(briefing: DailyBriefing, isManager: boolean = false): string {
        let message = `📰 **${briefing.greeting}**\n\n`;
        message += `📅 ${briefing.date.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n`;

        // Weather
        if (briefing.weather) {
            message += `${briefing.weather.icon} ${briefing.weather.city}: ${briefing.weather.temperature}°C ${briefing.weather.conditionAr}\n\n`;
        }

        // Attendance (managers only)
        if (isManager && briefing.attendance.present > 0) {
            message += `👥 **حضور الفريق:**\n`;
            message += `   ✅ حاضر: ${briefing.attendance.present} (${briefing.attendance.percentagePresent}%)\n`;
            if (briefing.attendance.late > 0) message += `   ⏰ متأخر: ${briefing.attendance.late}\n`;
            if (briefing.attendance.absent > 0) message += `   ❌ غائب: ${briefing.attendance.absent}\n`;
            if (briefing.attendance.onLeave > 0) message += `   🏖️ إجازة: ${briefing.attendance.onLeave}\n`;
            message += '\n';
        }

        // Tasks
        message += `📋 **مهامك:**\n`;
        message += `   📊 المجموع: ${briefing.tasks.total} | ✅ مكتمل: ${briefing.tasks.completed}\n`;
        if (briefing.tasks.dueToday > 0) message += `   ⚡ مستحق اليوم: ${briefing.tasks.dueToday}\n`;
        if (briefing.tasks.overdue > 0) message += `   ⚠️ متأخر: ${briefing.tasks.overdue}\n`;
        message += '\n';

        // Meetings
        if (briefing.meetings.length > 0) {
            message += `📅 **اجتماعات اليوم:**\n`;
            for (const meeting of briefing.meetings) {
                const typeIcon = meeting.type === 'virtual' ? '💻' : '🏢';
                message += `   ${typeIcon} ${meeting.time} - ${meeting.title}\n`;
            }
            message += '\n';
        }

        // Announcements
        if (briefing.announcements.length > 0) {
            message += `📢 **إعلانات:**\n`;
            for (const ann of briefing.announcements) {
                const typeIcon = { info: 'ℹ️', urgent: '🚨', celebration: '🎉', reminder: '🔔' }[ann.type];
                message += `   ${typeIcon} ${ann.titleAr}\n`;
            }
            message += '\n';
        }

        // Birthdays
        if (briefing.birthdays.length > 0) {
            message += `🎂 **أعياد ميلاد اليوم:** ${briefing.birthdays.join(', ')}\n\n`;
        }

        // Daily tip
        message += `\n${briefing.tip}`;

        return message;
    }

    /**
     * 📢 Format announcements
     */
    formatAnnouncements(): string {
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
}
