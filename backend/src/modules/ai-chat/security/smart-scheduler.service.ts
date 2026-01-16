import { Injectable, Logger } from '@nestjs/common';

/**
 * 📅 Smart Scheduler Service
 * Implements ideas #46-50: Intelligent scheduling
 * 
 * Features:
 * - Optimal meeting times
 * - Workload balancing
 * - Focus time blocks
 * - Calendar analytics
 */

export interface TimeSlot {
    start: Date;
    end: Date;
    available: boolean;
    score: number; // 0-100, higher is better
    reason?: string;
}

export interface MeetingSuggestion {
    slot: TimeSlot;
    attendees: string[];
    allAvailable: boolean;
    conflictCount: number;
    recommendation: string;
}

export interface FocusTimeBlock {
    id: string;
    userId: string;
    title: string;
    start: Date;
    end: Date;
    recurring: boolean;
    protected: boolean;
}

export interface CalendarAnalytics {
    totalMeetings: number;
    meetingHours: number;
    focusHours: number;
    meetingFreeDay: string;
    busiestDay: string;
    avgMeetingDuration: number;
    backToBackCount: number;
}

export interface WorkloadDistribution {
    day: string;
    dayAr: string;
    meetingHours: number;
    focusHours: number;
    totalHours: number;
    status: 'light' | 'balanced' | 'heavy' | 'overloaded';
}

@Injectable()
export class SmartSchedulerService {
    private readonly logger = new Logger(SmartSchedulerService.name);

    // Focus time blocks storage
    private focusBlocks: Map<string, FocusTimeBlock> = new Map();

    // Days in Arabic
    private readonly daysAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    /**
     * 🎯 Find optimal meeting time
     */
    findOptimalTime(
        duration: number, // minutes
        attendees: string[],
        preferredDays: number[] = [0, 1, 2, 3, 4] // Sun-Thu
    ): MeetingSuggestion[] {
        const suggestions: MeetingSuggestion[] = [];
        const now = new Date();

        // Generate time slots for next 5 days
        for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
            const date = new Date(now);
            date.setDate(date.getDate() + dayOffset);

            if (!preferredDays.includes(date.getDay())) continue;

            // Morning slots (9-12)
            for (let hour = 9; hour <= 11; hour++) {
                const slot = this.createTimeSlot(date, hour, duration);
                suggestions.push(this.evaluateSlot(slot, attendees));
            }

            // Afternoon slots (14-16)
            for (let hour = 14; hour <= 16; hour++) {
                const slot = this.createTimeSlot(date, hour, duration);
                suggestions.push(this.evaluateSlot(slot, attendees));
            }
        }

        // Sort by score
        return suggestions
            .filter(s => s.allAvailable || s.conflictCount < 2)
            .sort((a, b) => b.slot.score - a.slot.score)
            .slice(0, 5);
    }

    private createTimeSlot(date: Date, hour: number, duration: number): TimeSlot {
        const start = new Date(date);
        start.setHours(hour, 0, 0, 0);
        const end = new Date(start.getTime() + duration * 60000);

        // Calculate score based on time
        let score = 70;
        if (hour >= 9 && hour <= 11) score += 20; // Morning preference
        if (hour === 10) score += 10; // 10 AM is prime time
        if (date.getDay() !== 4) score += 5; // Not Thursday
        if (duration <= 60) score += 5; // Shorter meetings are better

        return { start, end, available: true, score };
    }

    private evaluateSlot(slot: TimeSlot, attendees: string[]): MeetingSuggestion {
        // Simulate availability check
        const conflictCount = Math.floor(Math.random() * (attendees.length + 1));
        const allAvailable = conflictCount === 0;

        // Adjust score based on conflicts
        slot.score = Math.max(0, slot.score - conflictCount * 15);
        slot.available = allAvailable;

        let recommendation: string;
        if (allAvailable) {
            recommendation = 'وقت مثالي - الجميع متاحون';
        } else if (conflictCount === 1) {
            recommendation = 'جيد - شخص واحد غير متاح';
        } else {
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

    /**
     * 🎯 Create focus time block
     */
    createFocusTime(
        userId: string,
        title: string,
        start: Date,
        duration: number, // minutes
        recurring: boolean = false
    ): FocusTimeBlock {
        const id = `FOCUS-${Date.now().toString(36).toUpperCase()}`;
        const end = new Date(start.getTime() + duration * 60000);

        const block: FocusTimeBlock = {
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

    /**
     * 📊 Get calendar analytics
     */
    getCalendarAnalytics(userId: string): CalendarAnalytics {
        // Generate mock analytics
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

    /**
     * 📊 Get workload distribution
     */
    getWorkloadDistribution(userId: string): WorkloadDistribution[] {
        const distribution: WorkloadDistribution[] = [];

        for (let i = 0; i < 5; i++) { // Sun-Thu
            const meetingHours = 1 + Math.floor(Math.random() * 5);
            const focusHours = 8 - meetingHours;
            const totalHours = meetingHours + focusHours;

            let status: WorkloadDistribution['status'];
            if (meetingHours <= 2) status = 'light';
            else if (meetingHours <= 4) status = 'balanced';
            else if (meetingHours <= 6) status = 'heavy';
            else status = 'overloaded';

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

    /**
     * 💡 Get scheduling recommendations
     */
    getRecommendations(userId: string): string[] {
        const analytics = this.getCalendarAnalytics(userId);
        const recommendations: string[] = [];

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

    /**
     * 📊 Format meeting suggestions
     */
    formatMeetingSuggestions(suggestions: MeetingSuggestion[]): string {
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

    /**
     * 📊 Format calendar analytics
     */
    formatCalendarAnalytics(userId: string): string {
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

    /**
     * 📊 Format workload distribution
     */
    formatWorkloadDistribution(userId: string): string {
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
}
