export interface MentalHealthCheckIn {
    userId: string;
    mood: 'great' | 'good' | 'okay' | 'stressed' | 'struggling';
    moodAr: string;
    timestamp: Date;
    resources?: WellnessResource[];
}
export interface WellnessResource {
    title: string;
    titleAr: string;
    type: 'article' | 'video' | 'exercise' | 'hotline';
    url?: string;
    description: string;
}
export interface BreakReminder {
    type: 'screen' | 'stretch' | 'walk' | 'water' | 'prayer';
    message: string;
    durationMinutes: number;
    exercise?: string;
}
export interface WorkLifeBalance {
    userId: string;
    score: number;
    category: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    categoryAr: string;
    factors: {
        name: string;
        score: number;
        recommendation?: string;
    }[];
}
export interface DailyWellnessTip {
    category: 'physical' | 'mental' | 'social' | 'nutrition' | 'sleep';
    tip: string;
    tipAr: string;
    icon: string;
}
export declare class WellnessService {
    private readonly logger;
    private readonly wellnessTips;
    private readonly stretchExercises;
    private readonly mentalHealthResources;
    checkIn(userId: string, mood: MentalHealthCheckIn['mood']): MentalHealthCheckIn;
    getBreakReminder(lastBreakMinutesAgo: number): BreakReminder | null;
    calculateWorkLifeBalance(data: {
        avgWeeklyHours: number;
        overtimeHours: number;
        vacationDaysUsed: number;
        vacationDaysTotal: number;
        weekendWorkDays: number;
        avgSleepHours?: number;
    }): WorkLifeBalance;
    getDailyTip(): DailyWellnessTip;
    formatCheckInResponse(checkIn: MentalHealthCheckIn): string;
    formatWorkLifeBalance(balance: WorkLifeBalance): string;
}
