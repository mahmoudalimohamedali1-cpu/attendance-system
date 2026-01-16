"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var WellnessService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WellnessService = void 0;
const common_1 = require("@nestjs/common");
let WellnessService = WellnessService_1 = class WellnessService {
    constructor() {
        this.logger = new common_1.Logger(WellnessService_1.name);
        this.wellnessTips = [
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
        this.stretchExercises = [
            'قف وتمدد للأعلى لـ 30 ثانية',
            'دور رقبتك ببطء يمين ويسار',
            'مد ذراعيك للأمام واضغط لـ 10 ثواني',
            'قف على أطراف أصابعك 10 مرات',
            'أدر كتفيك للخلف 10 مرات',
            'انحني للأمام وحاول لمس أصابع قدميك',
        ];
        this.mentalHealthResources = [
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
    }
    checkIn(userId, mood) {
        const moodMap = {
            great: 'ممتاز 🌟',
            good: 'جيد 😊',
            okay: 'عادي 😐',
            stressed: 'متوتر 😰',
            struggling: 'صعب 😔',
        };
        const checkIn = {
            userId,
            mood,
            moodAr: moodMap[mood],
            timestamp: new Date(),
        };
        if (mood === 'stressed' || mood === 'struggling') {
            checkIn.resources = this.mentalHealthResources;
        }
        return checkIn;
    }
    getBreakReminder(lastBreakMinutesAgo) {
        if (lastBreakMinutesAgo < 60) {
            return null;
        }
        const breakTypes = ['screen', 'stretch', 'walk', 'water'];
        const randomType = breakTypes[Math.floor(Math.random() * breakTypes.length)];
        const reminders = {
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
    calculateWorkLifeBalance(data) {
        const factors = [];
        let totalScore = 100;
        if (data.avgWeeklyHours > 45) {
            const deduction = Math.min(30, (data.avgWeeklyHours - 45) * 3);
            totalScore -= deduction;
            factors.push({
                name: 'ساعات العمل',
                score: 100 - deduction,
                recommendation: data.avgWeeklyHours > 50 ? 'حاول تقليل ساعات العمل' : undefined,
            });
        }
        else {
            factors.push({ name: 'ساعات العمل', score: 100 });
        }
        if (data.overtimeHours > 5) {
            const deduction = Math.min(20, data.overtimeHours * 2);
            totalScore -= deduction;
            factors.push({
                name: 'العمل الإضافي',
                score: 100 - deduction,
                recommendation: 'قلل من العمل الإضافي',
            });
        }
        else {
            factors.push({ name: 'العمل الإضافي', score: 100 });
        }
        const vacationRate = data.vacationDaysUsed / data.vacationDaysTotal;
        if (vacationRate < 0.5) {
            const deduction = Math.min(25, (0.5 - vacationRate) * 50);
            totalScore -= deduction;
            factors.push({
                name: 'استخدام الإجازات',
                score: 100 - deduction,
                recommendation: 'خذ إجازة للراحة',
            });
        }
        else {
            factors.push({ name: 'استخدام الإجازات', score: 100 });
        }
        if (data.weekendWorkDays > 0) {
            const deduction = Math.min(25, data.weekendWorkDays * 12);
            totalScore -= deduction;
            factors.push({
                name: 'العمل في عطلة نهاية الأسبوع',
                score: 100 - deduction,
                recommendation: 'احرص على الراحة في العطلة',
            });
        }
        else {
            factors.push({ name: 'عطلة نهاية الأسبوع', score: 100 });
        }
        let category;
        let categoryAr;
        if (totalScore >= 85) {
            category = 'excellent';
            categoryAr = 'ممتاز';
        }
        else if (totalScore >= 70) {
            category = 'good';
            categoryAr = 'جيد';
        }
        else if (totalScore >= 55) {
            category = 'fair';
            categoryAr = 'مقبول';
        }
        else if (totalScore >= 40) {
            category = 'poor';
            categoryAr = 'ضعيف';
        }
        else {
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
    getDailyTip() {
        return this.wellnessTips[Math.floor(Math.random() * this.wellnessTips.length)];
    }
    formatCheckInResponse(checkIn) {
        let message = `💚 شكراً لمشاركتك! حالتك: ${checkIn.moodAr}\n\n`;
        if (checkIn.mood === 'great' || checkIn.mood === 'good') {
            message += '✨ رائع! استمر في الحفاظ على طاقتك الإيجابية!';
        }
        else if (checkIn.mood === 'okay') {
            message += '🌸 يوم عادي لا بأس به. خذ استراحة قصيرة!';
        }
        else if (checkIn.mood === 'stressed') {
            message += '💙 نحن هنا لدعمك. إليك بعض المصادر:\n\n';
            for (const resource of checkIn.resources || []) {
                message += `• ${resource.titleAr}: ${resource.description}\n`;
            }
        }
        else {
            message += '❤️ نتمنى لك السلامة. لا تتردد في طلب المساعدة:\n\n';
            for (const resource of checkIn.resources || []) {
                message += `• ${resource.titleAr}: ${resource.description}\n`;
            }
        }
        return message;
    }
    formatWorkLifeBalance(balance) {
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
};
exports.WellnessService = WellnessService;
exports.WellnessService = WellnessService = WellnessService_1 = __decorate([
    (0, common_1.Injectable)()
], WellnessService);
//# sourceMappingURL=wellness.service.js.map