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
export declare class DailyBriefingService {
    private readonly logger;
    private announcements;
    private readonly weatherConditions;
    private readonly dailyTips;
    generateBriefing(userId: string, userName: string, isManager?: boolean): DailyBriefing;
    private getWeather;
    private generateAttendanceSummary;
    private generateTasksSummary;
    private generateMeetingsSummary;
    private getActiveAnnouncements;
    private getTodayBirthdays;
    private getRandomTip;
    createAnnouncement(title: string, titleAr: string, content: string, type: Announcement['type'], priority?: number, expiresAt?: Date): Announcement;
    formatBriefing(briefing: DailyBriefing, isManager?: boolean): string;
    formatAnnouncements(): string;
}
