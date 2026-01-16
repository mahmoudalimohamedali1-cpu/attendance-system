import { Injectable, Logger } from '@nestjs/common';

/**
 * 💚 Wellness Service
 * Implements ideas #101-125: Wellness & Support
 * 
 * Features:
 * - #101 Mental health check-in
 * - #103 Break reminder
 * - #104 Hydration reminder
 * - #109 Exercise planner
 * - #116 Work-life balance score
 */

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
    factors: { name: string; score: number; recommendation?: string }[];
}

export interface DailyWellnessTip {
    category: 'physical' | 'mental' | 'social' | 'nutrition' | 'sleep';
    tip: string;
    tipAr: string;
    icon: string;
}

@Injectable()
export class WellnessService {
    private readonly logger = new Logger(WellnessService.name);

    // Wellness tips database
    private readonly wellnessTips: DailyWellnessTip[] = [
        { category: 'physical', icon: '🚶', tip: 'Take a 10-minute walk', tipAr: 'خذ مشي 10 دقائق' },
        { category: 'physical', icon: '🧘', tip: 'Do 5 minutes of stretching', tipAr: 'تمارين إطالة لـ 5 دقائق' },
        { category: 'mental', icon: '🧠', tip: 'Practice deep breathing', tipAr: 'تمارين التنفس العميق' },
        { category: 'mental', icon: '📝', tip: 'Write 3 things you are grateful for', tipAr: 'اكتب 3 أشياء تشكر الله عليها' },
        { category: 'social', icon: '👋', tip: 'Say hello to a colleague', tipAr: 'سلم على زميل' },
        { category: 'social', icon: '☕', tip: 'Have coffee with a teammate', tipAr: 'اشرب قهوة مع زميل' },
        { category: 'nutrition', icon: '💧', tip: 'Drink a glass of water', tipAr: 'اشرب كوب ماء' },
        { category: 'nutrition', icon: '🍎', tip: 'Eat a healthy snack', tipAr: 'تناول وجبة خفيفة صحية' },
        { category: 'sleep', icon: '😴', tip: 'Aim for 7-8 hours of sleep', tipAr: 'احرص على 7-8 ساعات نوم' },
        { category: 'sleep', icon: '📱', tip: 'No screens 1 hour before bed', tipAr: 'لا شاشات قبل النوم بساعة' },
    ];

    // Break exercises
    private readonly stretchExercises = [
        'قف وتمدد للأعلى لـ 30 ثانية',
        'دور رقبتك ببطء يمين ويسار',
        'مد ذراعيك للأمام واضغط لـ 10 ثواني',
        'قف على أطراف أصابعك 10 مرات',
        'أدر كتفيك للخلف 10 مرات',
        'انحني للأمام وحاول لمس أصابع قدميك',
    ];

    // Mental health resources
    private readonly mentalHealthResources: WellnessResource[] = [
        {
            title: 'Breathing Exercise',
            titleAr: 'تمارين التنفس',
            type: 'exercise',
            description: 'تنفس 4 ثواني، احبس 4 ثواني، أخرج 4 ثواني'
        },
        {
            title: 'Crisis Hotline',
            titleAr: 'خط الدعم النفسي',
            type: 'hotline',
            url: 'tel:920033360',
            description: 'الخط الساخن للدعم النفسي - متاح 24/7'
        },
        {
            title: 'Quick Meditation',
            titleAr: 'تأمل سريع',
            type: 'exercise',
            description: 'أغمض عينيك وركز على تنفسك لدقيقتين'
        },
    ];

    /**
     * 🧠 Mental health check-in
     */
    checkIn(userId: string, mood: MentalHealthCheckIn['mood']): MentalHealthCheckIn {
        const moodMap: Record<string, string> = {
            great: 'ممتاز 🌟',
            good: 'جيد 😊',
            okay: 'عادي 😐',
            stressed: 'متوتر 😰',
            struggling: 'صعب 😔',
        };

        const checkIn: MentalHealthCheckIn = {
            userId,
            mood,
            moodAr: moodMap[mood],
            timestamp: new Date(),
        };

        // Add resources for stressed/struggling
        if (mood === 'stressed' || mood === 'struggling') {
            checkIn.resources = this.mentalHealthResources;
        }

        return checkIn;
    }

    /**
     * ⏰ Get break reminder
     */
    getBreakReminder(lastBreakMinutesAgo: number): BreakReminder | null {
        // Suggest break every 90 minutes
        if (lastBreakMinutesAgo < 60) {
            return null;
        }

        const breakTypes: BreakReminder['type'][] = ['screen', 'stretch', 'walk', 'water'];
        const randomType = breakTypes[Math.floor(Math.random() * breakTypes.length)];

        const reminders: Record<BreakReminder['type'], BreakReminder> = {
            screen: {
                type: 'screen',
                message: '👀 وقت راحة للعينين! انظر لشيء بعيد لـ 20 ثانية',
                durationMinutes: 1,
            },
            stretch: {
                type: 'stretch',
                message: '🧘 وقت التمدد!',
                durationMinutes: 3,
                exercise: this.stretchExercises[Math.floor(Math.random() * this.stretchExercises.length)],
            },
            walk: {
                type: 'walk',
                message: '🚶 خذ مشي قصير!',
                durationMinutes: 5,
            },
            water: {
                type: 'water',
                message: '💧 اشرب كوب ماء!',
                durationMinutes: 1,
            },
            prayer: {
                type: 'prayer',
                message: '🕌 وقت الصلاة',
                durationMinutes: 10,
            },
        };

        return reminders[randomType];
    }

    /**
     * 📊 Calculate work-life balance score
     */
    calculateWorkLifeBalance(data: {
        avgWeeklyHours: number;
        overtimeHours: number;
        vacationDaysUsed: number;
        vacationDaysTotal: number;
        weekendWorkDays: number;
        avgSleepHours?: number;
    }): WorkLifeBalance {
        const factors: WorkLifeBalance['factors'] = [];
        let totalScore = 100;

        // Working hours (max deduction: 30)
        if (data.avgWeeklyHours > 45) {
            const deduction = Math.min(30, (data.avgWeeklyHours - 45) * 3);
            totalScore -= deduction;
            factors.push({
                name: 'ساعات العمل',
                score: 100 - deduction,
                recommendation: data.avgWeeklyHours > 50 ? 'حاول تقليل ساعات العمل' : undefined,
            });
        } else {
            factors.push({ name: 'ساعات العمل', score: 100 });
        }

        // Overtime (max deduction: 20)
        if (data.overtimeHours > 5) {
            const deduction = Math.min(20, data.overtimeHours * 2);
            totalScore -= deduction;
            factors.push({
                name: 'العمل الإضافي',
                score: 100 - deduction,
                recommendation: 'قلل من العمل الإضافي',
            });
        } else {
            factors.push({ name: 'العمل الإضافي', score: 100 });
        }

        // Vacation usage (max deduction: 25)
        const vacationRate = data.vacationDaysUsed / data.vacationDaysTotal;
        if (vacationRate < 0.5) {
            const deduction = Math.min(25, (0.5 - vacationRate) * 50);
            totalScore -= deduction;
            factors.push({
                name: 'استخدام الإجازات',
                score: 100 - deduction,
                recommendation: 'خذ إجازة للراحة',
            });
        } else {
            factors.push({ name: 'استخدام الإجازات', score: 100 });
        }

        // Weekend work (max deduction: 25)
        if (data.weekendWorkDays > 0) {
            const deduction = Math.min(25, data.weekendWorkDays * 12);
            totalScore -= deduction;
            factors.push({
                name: 'العمل في عطلة نهاية الأسبوع',
                score: 100 - deduction,
                recommendation: 'احرص على الراحة في العطلة',
            });
        } else {
            factors.push({ name: 'عطلة نهاية الأسبوع', score: 100 });
        }

        // Determine category
        let category: WorkLifeBalance['category'];
        let categoryAr: string;
        if (totalScore >= 85) {
            category = 'excellent';
            categoryAr = 'ممتاز';
        } else if (totalScore >= 70) {
            category = 'good';
            categoryAr = 'جيد';
        } else if (totalScore >= 55) {
            category = 'fair';
            categoryAr = 'مقبول';
        } else if (totalScore >= 40) {
            category = 'poor';
            categoryAr = 'ضعيف';
        } else {
            category = 'critical';
            categoryAr = 'حرج';
        }

        return {
            userId: '',
            score: Math.max(0, Math.round(totalScore)),
            category,
            categoryAr,
            factors,
        };
    }

    /**
     * 💡 Get daily wellness tip
     */
    getDailyTip(): DailyWellnessTip {
        return this.wellnessTips[Math.floor(Math.random() * this.wellnessTips.length)];
    }

    /**
     * 📝 Format check-in response
     */
    formatCheckInResponse(checkIn: MentalHealthCheckIn): string {
        let message = `💚 شكراً لمشاركتك! حالتك: ${checkIn.moodAr}\n\n`;

        if (checkIn.mood === 'great' || checkIn.mood === 'good') {
            message += '✨ رائع! استمر في الحفاظ على طاقتك الإيجابية!';
        } else if (checkIn.mood === 'okay') {
            message += '🌸 يوم عادي لا بأس به. خذ استراحة قصيرة!';
        } else if (checkIn.mood === 'stressed') {
            message += '💙 نحن هنا لدعمك. إليك بعض المصادر:\n\n';
            for (const resource of checkIn.resources || []) {
                message += `• ${resource.titleAr}: ${resource.description}\n`;
            }
        } else {
            message += '❤️ نتمنى لك السلامة. لا تتردد في طلب المساعدة:\n\n';
            for (const resource of checkIn.resources || []) {
                message += `• ${resource.titleAr}: ${resource.description}\n`;
            }
        }

        return message;
    }

    /**
     * 📊 Format work-life balance score
     */
    formatWorkLifeBalance(balance: WorkLifeBalance): string {
        const categoryEmoji = {
            excellent: '🌟',
            good: '✅',
            fair: '😐',
            poor: '⚠️',
            critical: '🚨',
        }[balance.category];

        let message = `${categoryEmoji} **التوازن بين العمل والحياة: ${balance.categoryAr}**\n\n`;
        message += `📊 الدرجة: ${balance.score}/100\n\n`;
        message += `**التفاصيل:**\n`;

        for (const factor of balance.factors) {
            const emoji = factor.score >= 80 ? '✅' : factor.score >= 50 ? '⚠️' : '❌';
            message += `${emoji} ${factor.name}: ${factor.score}%\n`;
            if (factor.recommendation) {
                message += `   💡 ${factor.recommendation}\n`;
            }
        }

        return message;
    }
}
