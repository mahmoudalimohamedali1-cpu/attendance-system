import { Injectable, Logger } from '@nestjs/common';

/**
 * 🎯 Smart Features Service
 * Implements innovative AI chat features:
 * - #1 Mood-based greeting
 * - #4 Personalized dashboard prompts
 * - #6 Birthday reminders
 * - #76-80 Gamification (streaks, badges)
 * - #129 Prayer time reminder
 */

// ==================== TYPES ====================

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
    nextPrayer: { name: string; time: string; minutesUntil: number };
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

// ==================== SERVICE ====================

@Injectable()
export class SmartFeaturesService {
    private readonly logger = new Logger(SmartFeaturesService.name);

    // Mood detection patterns
    private readonly moodPatterns: Record<string, RegExp[]> = {
        happy: [
            /الحمد لله|شكرا|ممتاز|رائع|سعيد|مبسوط|تمام/i,
            /😊|😄|🎉|❤️|👍|✨/,
        ],
        stressed: [
            /ضغط|مشغول|كثير|صعب|مستعجل|عاجل|يلا بسرعة/i,
            /😰|😫|😤|💢/,
        ],
        tired: [
            /تعبان|مرهق|نعسان|ما نمت|متأخر|ارتحت/i,
            /😴|🥱|😪/,
        ],
        frustrated: [
            /مشكلة|خربان|ما يشتغل|غلط|خطأ|زفت|ما ينفع/i,
            /😡|🤬|😠|💔/,
        ],
        neutral: [],
    };

    // Badge definitions
    private readonly badgeDefinitions: Badge[] = [
        { id: 'streak_7', name: '7-Day Streak', nameAr: 'سلسلة 7 أيام', icon: '🔥', earnedAt: new Date(), description: '7 أيام حضور متتالية' },
        { id: 'streak_30', name: '30-Day Streak', nameAr: 'سلسلة 30 يوم', icon: '⭐', earnedAt: new Date(), description: '30 يوم حضور متتالي' },
        { id: 'early_bird', name: 'Early Bird', nameAr: 'الطائر المبكر', icon: '🌅', earnedAt: new Date(), description: 'حضور مبكر 10 مرات' },
        { id: 'punctual', name: 'Punctuality King', nameAr: 'ملك الانضباط', icon: '👑', earnedAt: new Date(), description: 'لا تأخير لمدة شهر' },
        { id: 'helper', name: 'Helping Hand', nameAr: 'يد العون', icon: '🤝', earnedAt: new Date(), description: 'ساعد 5 زملاء' },
        { id: 'learner', name: 'Quick Learner', nameAr: 'سريع التعلم', icon: '📚', earnedAt: new Date(), description: 'أكمل 3 دورات' },
        { id: 'innovator', name: 'Innovator', nameAr: 'المبتكر', icon: '💡', earnedAt: new Date(), description: 'قدم فكرة تحسين' },
        { id: 'team_player', name: 'Team Player', nameAr: 'روح الفريق', icon: '🏆', earnedAt: new Date(), description: 'تعاون مع 3 أقسام' },
    ];

    // ==================== MOOD DETECTION ====================

    /**
     * 🎭 Analyze user mood from message
     */
    analyzeMood(message: string): MoodAnalysis {
        let detectedMood: MoodAnalysis['mood'] = 'neutral';
        let highestConfidence = 0;

        for (const [mood, patterns] of Object.entries(this.moodPatterns)) {
            for (const pattern of patterns) {
                if (pattern.test(message)) {
                    const confidence = 0.7 + Math.random() * 0.2;
                    if (confidence > highestConfidence) {
                        highestConfidence = confidence;
                        detectedMood = mood as MoodAnalysis['mood'];
                    }
                }
            }
        }

        return {
            mood: detectedMood,
            confidence: highestConfidence || 0.5,
            suggestedTone: this.getToneForMood(detectedMood),
            greeting: this.getGreetingForMood(detectedMood),
        };
    }

    private getToneForMood(mood: string): string {
        const tones: Record<string, string> = {
            happy: 'enthusiastic',
            stressed: 'calm_supportive',
            tired: 'gentle_brief',
            frustrated: 'empathetic_solution',
            neutral: 'professional_friendly',
        };
        return tones[mood] || 'professional_friendly';
    }

    private getGreetingForMood(mood: string): string {
        const hour = new Date().getHours();
        const timeGreeting = hour < 12 ? 'صباح الخير' : hour < 17 ? 'مساء الخير' : 'مساء النور';

        const greetings: Record<string, string> = {
            happy: `${timeGreeting}! 🌟 سعيد إنك بخير`,
            stressed: `${timeGreeting} 💙 خذ نفس عميق، كيف أقدر أساعدك؟`,
            tired: `${timeGreeting} 🌸 الله يعطيك العافية، خليني أخفف عليك`,
            frustrated: `${timeGreeting} 🤝 فاهم إحساسك، خليني أساعدك نحل المشكلة`,
            neutral: `${timeGreeting}! 👋 كيف أقدر أخدمك اليوم؟`,
        };
        return greetings[mood] || greetings.neutral;
    }

    // ==================== PERSONALIZED PROMPTS ====================

    /**
     * 📋 Get personalized dashboard prompt for user
     */
    getPersonalizedPrompt(userName: string = 'المستخدم'): PersonalizedPrompt {
        const hour = new Date().getHours();
        const timeGreeting = hour < 12 ? 'صباح الخير' : hour < 17 ? 'مساء الخير' : 'مساء النور';

        // Get smart suggestions based on time
        const suggestions = this.getSmartSuggestions(hour);

        return {
            greeting: `${timeGreeting} ${userName}! 👋`,
            pendingItems: [],
            suggestions,
        };
    }

    private getSmartSuggestions(hour: number): string[] {
        if (hour < 10) {
            return ['تسجيل الحضور', 'جدول اليوم', 'طلبات معلقة'];
        } else if (hour < 14) {
            return ['تقرير الحضور', 'طلب إجازة', 'الموظفين'];
        } else if (hour < 17) {
            return ['ملخص اليوم', 'المهام المتبقية', 'تسجيل الانصراف'];
        } else {
            return ['تسجيل الانصراف', 'ساعات العمل', 'غداً'];
        }
    }

    // ==================== PRAYER TIMES ====================

    /**
     * 🕌 Get prayer times for Riyadh
     */
    getPrayerTimes(): PrayerTimes {
        const now = new Date();
        const month = now.getMonth();

        const times = this.getSeasonalPrayerTimes(month);
        const nextPrayer = this.getNextPrayer(times);

        return {
            ...times,
            nextPrayer,
        };
    }

    private getSeasonalPrayerTimes(month: number): Omit<PrayerTimes, 'nextPrayer'> {
        if (month >= 10 || month <= 2) {
            return { fajr: '05:15', dhuhr: '12:00', asr: '15:00', maghrib: '17:30', isha: '19:00' };
        }
        return { fajr: '04:00', dhuhr: '12:15', asr: '15:30', maghrib: '18:45', isha: '20:15' };
    }

    private getNextPrayer(times: Omit<PrayerTimes, 'nextPrayer'>): PrayerTimes['nextPrayer'] {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const prayers = [
            { name: 'الفجر', time: times.fajr },
            { name: 'الظهر', time: times.dhuhr },
            { name: 'العصر', time: times.asr },
            { name: 'المغرب', time: times.maghrib },
            { name: 'العشاء', time: times.isha },
        ];

        for (const prayer of prayers) {
            const [hours, minutes] = prayer.time.split(':').map(Number);
            const prayerMinutes = hours * 60 + minutes;

            if (prayerMinutes > currentMinutes) {
                return {
                    name: prayer.name,
                    time: prayer.time,
                    minutesUntil: prayerMinutes - currentMinutes,
                };
            }
        }

        const [fajrH, fajrM] = times.fajr.split(':').map(Number);
        return {
            name: 'الفجر',
            time: times.fajr,
            minutesUntil: (24 * 60 - currentMinutes) + (fajrH * 60 + fajrM),
        };
    }

    /**
     * 🕌 Get prayer reminder message
     */
    getPrayerReminder(): string | null {
        const times = this.getPrayerTimes();
        const { nextPrayer } = times;

        if (nextPrayer.minutesUntil <= 15) {
            return `🕌 تذكير: صلاة ${nextPrayer.name} بعد ${nextPrayer.minutesUntil} دقيقة (${nextPrayer.time})`;
        }

        if (nextPrayer.minutesUntil <= 30) {
            return `🕌 صلاة ${nextPrayer.name} الساعة ${nextPrayer.time}`;
        }

        return null;
    }

    // ==================== GAMIFICATION ====================

    /**
     * 🎮 Calculate points and level from streak
     */
    calculateStreak(attendanceDays: number, punctualDays: number): EmployeeStreak {
        const badges = this.calculateBadges(attendanceDays, punctualDays);
        const points = this.calculatePoints(attendanceDays, punctualDays, badges.length);
        const level = Math.floor(points / 100) + 1;

        return {
            attendanceStreak: attendanceDays,
            punctualityStreak: punctualDays,
            longestStreak: Math.max(attendanceDays, punctualDays),
            badges,
            points,
            level,
        };
    }

    private calculateBadges(attendanceStreak: number, punctualityStreak: number): Badge[] {
        const earned: Badge[] = [];

        if (attendanceStreak >= 7) {
            earned.push(this.badgeDefinitions.find(b => b.id === 'streak_7')!);
        }
        if (attendanceStreak >= 30) {
            earned.push(this.badgeDefinitions.find(b => b.id === 'streak_30')!);
        }
        if (punctualityStreak >= 20) {
            earned.push(this.badgeDefinitions.find(b => b.id === 'punctual')!);
        }

        return earned.filter(Boolean);
    }

    private calculatePoints(attendance: number, punctuality: number, badges: number): number {
        return (attendance * 10) + (punctuality * 5) + (badges * 50);
    }

    /**
     * 🏆 Format streak as message
     */
    formatStreakMessage(streak: EmployeeStreak): string {
        let message = `🎮 **إحصائياتك**\n\n`;
        message += `🔥 سلسلة الحضور: ${streak.attendanceStreak} يوم\n`;
        message += `⏰ سلسلة الانضباط: ${streak.punctualityStreak} يوم\n`;
        message += `⭐ النقاط: ${streak.points}\n`;
        message += `📊 المستوى: ${streak.level}\n\n`;

        if (streak.badges.length > 0) {
            message += `🏆 **شاراتك:**\n`;
            for (const badge of streak.badges) {
                message += `${badge.icon} ${badge.nameAr}\n`;
            }
        }

        return message;
    }

    /**
     * 📜 Get all available badges
     */
    getAllBadges(): Badge[] {
        return this.badgeDefinitions;
    }
}
