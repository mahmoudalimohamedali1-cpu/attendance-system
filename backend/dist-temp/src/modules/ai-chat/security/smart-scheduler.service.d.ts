export interface TimeSlot {
    start: Date;
    end: Date;
    available: boolean;
    score: number;
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
export declare class SmartSchedulerService {
    private readonly logger;
    private focusBlocks;
    private readonly daysAr;
    findOptimalTime(duration: number, attendees: string[], preferredDays?: number[]): MeetingSuggestion[];
    private createTimeSlot;
    private evaluateSlot;
    createFocusTime(userId: string, title: string, start: Date, duration: number, recurring?: boolean): FocusTimeBlock;
    getCalendarAnalytics(userId: string): CalendarAnalytics;
    getWorkloadDistribution(userId: string): WorkloadDistribution[];
    getRecommendations(userId: string): string[];
    formatMeetingSuggestions(suggestions: MeetingSuggestion[]): string;
    formatCalendarAnalytics(userId: string): string;
    formatWorkloadDistribution(userId: string): string;
}
