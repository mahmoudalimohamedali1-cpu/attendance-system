export interface MoodAnalysis {
    mood: 'happy' | 'neutral' | 'stressed' | 'tired' | 'frustrated';
    confidence: number;
    suggestedTone: string;
    greeting: string;
}
export interface PersonalizedPrompt {
    greeting: string;
    pendingItems: string[];
    suggestions: string[];
    celebrations?: string[];
    reminders?: string[];
}
export interface PrayerTimes {
    fajr: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
    nextPrayer: {
        name: string;
        time: string;
        minutesUntil: number;
    };
}
export interface EmployeeStreak {
    attendanceStreak: number;
    punctualityStreak: number;
    longestStreak: number;
    badges: Badge[];
    points: number;
    level: number;
}
export interface Badge {
    id: string;
    name: string;
    nameAr: string;
    icon: string;
    earnedAt: Date;
    description: string;
}
export interface ExpiringDocument {
    type: 'iqama' | 'passport' | 'license' | 'contract' | 'medical';
    typeAr: string;
    expiryDate: Date;
    daysRemaining: number;
    status: 'urgent' | 'warning' | 'ok';
    employeeName?: string;
}
export declare class SmartFeaturesService {
    private readonly logger;
    private readonly moodPatterns;
    private readonly badgeDefinitions;
    analyzeMood(message: string): MoodAnalysis;
    private getToneForMood;
    private getGreetingForMood;
    getPersonalizedPrompt(userName?: string): PersonalizedPrompt;
    private getSmartSuggestions;
    getPrayerTimes(): PrayerTimes;
    private getSeasonalPrayerTimes;
    private getNextPrayer;
    getPrayerReminder(): string | null;
    calculateStreak(attendanceDays: number, punctualDays: number): EmployeeStreak;
    private calculateBadges;
    private calculatePoints;
    formatStreakMessage(streak: EmployeeStreak): string;
    getAllBadges(): Badge[];
}
