"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SmartFeaturesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartFeaturesService = void 0;
const common_1 = require("@nestjs/common");
let SmartFeaturesService = SmartFeaturesService_1 = class SmartFeaturesService {
    constructor() {
        this.logger = new common_1.Logger(SmartFeaturesService_1.name);
        this.moodPatterns = {
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
        this.badgeDefinitions = [
            { id: 'streak_7', name: '7-Day Streak', nameAr: 'سلسلة 7 أيام', icon: '🔥', earnedAt: new Date(), description: '7 أيام حضور متتالية' },
            { id: 'streak_30', name: '30-Day Streak', nameAr: 'سلسلة 30 يوم', icon: '⭐', earnedAt: new Date(), description: '30 يوم حضور متتالي' },
            { id: 'early_bird', name: 'Early Bird', nameAr: 'الطائر المبكر', icon: '🌅', earnedAt: new Date(), description: 'حضور مبكر 10 مرات' },
            { id: 'punctual', name: 'Punctuality King', nameAr: 'ملك الانضباط', icon: '👑', earnedAt: new Date(), description: 'لا تأخير لمدة شهر' },
            { id: 'helper', name: 'Helping Hand', nameAr: 'يد العون', icon: '🤝', earnedAt: new Date(), description: 'ساعد 5 زملاء' },
            { id: 'learner', name: 'Quick Learner', nameAr: 'سريع التعلم', icon: '📚', earnedAt: new Date(), description: 'أكمل 3 دورات' },
            { id: 'innovator', name: 'Innovator', nameAr: 'المبتكر', icon: '💡', earnedAt: new Date(), description: 'قدم فكرة تحسين' },
            { id: 'team_player', name: 'Team Player', nameAr: 'روح الفريق', icon: '🏆', earnedAt: new Date(), description: 'تعاون مع 3 أقسام' },
        ];
    }
    analyzeMood(message) {
        let detectedMood = 'neutral';
        let highestConfidence = 0;
        for (const [mood, patterns] of Object.entries(this.moodPatterns)) {
            for (const pattern of patterns) {
                if (pattern.test(message)) {
                    const confidence = 0.7 + Math.random() * 0.2;
                    if (confidence > highestConfidence) {
                        highestConfidence = confidence;
                        detectedMood = mood;
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
    getToneForMood(mood) {
        const tones = {
            happy: 'enthusiastic',
            stressed: 'calm_supportive',
            tired: 'gentle_brief',
            frustrated: 'empathetic_solution',
            neutral: 'professional_friendly',
        };
        return tones[mood] || 'professional_friendly';
    }
    getGreetingForMood(mood) {
        const hour = new Date().getHours();
        const timeGreeting = hour < 12 ? 'صباح الخير' : hour < 17 ? 'مساء الخير' : 'مساء النور';
        const greetings = {
            happy: `${timeGreeting}! 🌟 سعيد إنك بخير`,
            stressed: `${timeGreeting} 💙 خذ نفس عميق، كيف أقدر أساعدك؟`,
            tired: `${timeGreeting} 🌸 الله يعطيك العافية، خليني أخفف عليك`,
            frustrated: `${timeGreeting} 🤝 فاهم إحساسك، خليني أساعدك نحل المشكلة`,
            neutral: `${timeGreeting}! 👋 كيف أقدر أخدمك اليوم؟`,
        };
        return greetings[mood] || greetings.neutral;
    }
    getPersonalizedPrompt(userName = 'المستخدم') {
        const hour = new Date().getHours();
        const timeGreeting = hour < 12 ? 'صباح الخير' : hour < 17 ? 'مساء الخير' : 'مساء النور';
        const suggestions = this.getSmartSuggestions(hour);
        return {
            greeting: `${timeGreeting} ${userName}! 👋`,
            pendingItems: [],
            suggestions,
        };
    }
    getSmartSuggestions(hour) {
        if (hour < 10) {
            return ['تسجيل الحضور', 'جدول اليوم', 'طلبات معلقة'];
        }
        else if (hour < 14) {
            return ['تقرير الحضور', 'طلب إجازة', 'الموظفين'];
        }
        else if (hour < 17) {
            return ['ملخص اليوم', 'المهام المتبقية', 'تسجيل الانصراف'];
        }
        else {
            return ['تسجيل الانصراف', 'ساعات العمل', 'غداً'];
        }
    }
    getPrayerTimes() {
        const now = new Date();
        const month = now.getMonth();
        const times = this.getSeasonalPrayerTimes(month);
        const nextPrayer = this.getNextPrayer(times);
        return {
            ...times,
            nextPrayer,
        };
    }
    getSeasonalPrayerTimes(month) {
        if (month >= 10 || month <= 2) {
            return { fajr: '05:15', dhuhr: '12:00', asr: '15:00', maghrib: '17:30', isha: '19:00' };
        }
        return { fajr: '04:00', dhuhr: '12:15', asr: '15:30', maghrib: '18:45', isha: '20:15' };
    }
    getNextPrayer(times) {
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
    getPrayerReminder() {
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
    calculateStreak(attendanceDays, punctualDays) {
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
    calculateBadges(attendanceStreak, punctualityStreak) {
        const earned = [];
        if (attendanceStreak >= 7) {
            earned.push(this.badgeDefinitions.find(b => b.id === 'streak_7'));
        }
        if (attendanceStreak >= 30) {
            earned.push(this.badgeDefinitions.find(b => b.id === 'streak_30'));
        }
        if (punctualityStreak >= 20) {
            earned.push(this.badgeDefinitions.find(b => b.id === 'punctual'));
        }
        return earned.filter(Boolean);
    }
    calculatePoints(attendance, punctuality, badges) {
        return (attendance * 10) + (punctuality * 5) + (badges * 50);
    }
    formatStreakMessage(streak) {
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
    getAllBadges() {
        return this.badgeDefinitions;
    }
};
exports.SmartFeaturesService = SmartFeaturesService;
exports.SmartFeaturesService = SmartFeaturesService = SmartFeaturesService_1 = __decorate([
    (0, common_1.Injectable)()
], SmartFeaturesService);
//# sourceMappingURL=smart-features.service.js.map