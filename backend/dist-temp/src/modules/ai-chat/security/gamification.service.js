"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GamificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamificationService = void 0;
const common_1 = require("@nestjs/common");
let GamificationService = GamificationService_1 = class GamificationService {
    constructor() {
        this.logger = new common_1.Logger(GamificationService_1.name);
        this.questTemplates = [
            { title: 'Perfect Attendance', titleAr: 'حضور مثالي', description: 'حضر 5 أيام متتالية', type: 'weekly', target: 5, reward: 50 },
            { title: 'Early Bird', titleAr: 'الطائر المبكر', description: 'احضر قبل الوقت 3 مرات', type: 'weekly', target: 3, reward: 30 },
            { title: 'Helper', titleAr: 'المساعد', description: 'ساعد زميل في مهمة', type: 'daily', target: 1, reward: 10 },
            { title: 'Learner', titleAr: 'المتعلم', description: 'أكمل درس تدريبي', type: 'weekly', target: 1, reward: 40 },
            { title: 'Innovator', titleAr: 'المبتكر', description: 'قدم فكرة تحسين', type: 'monthly', target: 1, reward: 100 },
            { title: 'Team Player', titleAr: 'روح الفريق', description: 'شارك في نشاط جماعي', type: 'weekly', target: 1, reward: 25 },
        ];
        this.triviaQuestions = [
            { id: '1', question: 'متى تأسست الشركة؟', options: ['2010', '2015', '2018', '2020'], correctIndex: 1, category: 'company', points: 10 },
            { id: '2', question: 'كم يوم إجازة سنوية للموظف الجديد؟', options: ['15', '21', '25', '30'], correctIndex: 1, category: 'hr', points: 10 },
            { id: '3', question: 'ما هو رقم الطوارئ في السعودية؟', options: ['911', '999', '112', '100'], correctIndex: 0, category: 'safety', points: 5 },
            { id: '4', question: 'أي من التالي ليس من قيم الشركة؟', options: ['الابتكار', 'النزاهة', 'السرعة', 'التميز'], correctIndex: 2, category: 'company', points: 15 },
            { id: '5', question: 'كم ساعة عمل أسبوعية حسب نظام العمل؟', options: ['40', '45', '48', '50'], correctIndex: 2, category: 'hr', points: 10 },
        ];
        this.rewardItems = [
            { id: '1', name: 'Coffee Voucher', nameAr: 'قسيمة قهوة', description: 'قسيمة ستاربكس 50 ريال', cost: 100, category: 'voucher', available: true, icon: '☕' },
            { id: '2', name: 'Extra Break', nameAr: 'استراحة إضافية', description: '30 دقيقة استراحة إضافية', cost: 50, category: 'time_off', available: true, icon: '⏰' },
            { id: '3', name: 'Lunch Voucher', nameAr: 'قسيمة غداء', description: 'غداء مجاني في الكافتيريا', cost: 75, category: 'voucher', available: true, icon: '🍽️' },
            { id: '4', name: 'Company Mug', nameAr: 'كوب الشركة', description: 'كوب حراري بشعار الشركة', cost: 150, category: 'merchandise', available: true, icon: '🥤' },
            { id: '5', name: 'Late Start', nameAr: 'بداية متأخرة', description: 'ابدأ متأخر ساعة (مرة واحدة)', cost: 200, category: 'time_off', available: true, icon: '🌅' },
            { id: '6', name: 'Half Day Off', nameAr: 'نصف يوم إجازة', description: 'نصف يوم إجازة إضافية', cost: 500, category: 'time_off', available: true, icon: '🏖️' },
            { id: '7', name: 'Parking Spot', nameAr: 'موقف VIP', description: 'موقف VIP لأسبوع', cost: 300, category: 'experience', available: true, icon: '🚗' },
            { id: '8', name: 'Training Course', nameAr: 'دورة تدريبية', description: 'دورة مجانية من اختيارك', cost: 1000, category: 'experience', available: true, icon: '📚' },
        ];
        this.luckyDraws = [
            { id: '1', name: 'Weekly Draw', prize: 'iPhone 15', prizeAr: 'آيفون 15', entryCost: 50, drawDate: this.getNextFriday(), participants: 45 },
            { id: '2', name: 'Monthly Draw', prize: 'Full Day Off', prizeAr: 'يوم إجازة كامل', entryCost: 25, drawDate: this.getEndOfMonth(), participants: 120 },
        ];
    }
    getActiveQuests() {
        const now = new Date();
        return this.questTemplates.map((template, index) => ({
            ...template,
            id: `quest_${index}`,
            progress: Math.floor(Math.random() * template.target),
            completed: false,
            expiresAt: this.getQuestExpiry(template.type),
        }));
    }
    getQuestExpiry(type) {
        const now = new Date();
        switch (type) {
            case 'daily':
                return new Date(now.setHours(23, 59, 59, 999));
            case 'weekly':
                const nextSunday = new Date(now);
                nextSunday.setDate(now.getDate() + (7 - now.getDay()));
                return nextSunday;
            case 'monthly':
                return new Date(now.getFullYear(), now.getMonth() + 1, 0);
            default:
                return new Date(now.setDate(now.getDate() + 30));
        }
    }
    getTriviaQuestion() {
        return this.triviaQuestions[Math.floor(Math.random() * this.triviaQuestions.length)];
    }
    checkTriviaAnswer(questionId, answerIndex) {
        const question = this.triviaQuestions.find(q => q.id === questionId);
        if (!question) {
            return { correct: false, points: 0, message: '❌ سؤال غير موجود' };
        }
        const correct = question.correctIndex === answerIndex;
        return {
            correct,
            points: correct ? question.points : 0,
            message: correct ? `✅ إجابة صحيحة! +${question.points} نقطة` : '❌ إجابة خاطئة',
        };
    }
    getRewardStore() {
        return this.rewardItems.filter(item => item.available);
    }
    redeemReward(itemId, userPoints) {
        const item = this.rewardItems.find(i => i.id === itemId);
        if (!item) {
            return { success: false, message: '❌ المكافأة غير موجودة' };
        }
        if (!item.available) {
            return { success: false, message: '❌ المكافأة غير متاحة حالياً' };
        }
        if (userPoints < item.cost) {
            return { success: false, message: `❌ نقاطك غير كافية. تحتاج ${item.cost - userPoints} نقطة إضافية` };
        }
        return {
            success: true,
            message: `🎉 تم استبدال ${item.nameAr}! سيتم التواصل معك قريباً.`,
            remainingPoints: userPoints - item.cost,
        };
    }
    getLuckyDraws() {
        return this.luckyDraws;
    }
    enterLuckyDraw(drawId, userPoints) {
        const draw = this.luckyDraws.find(d => d.id === drawId);
        if (!draw) {
            return { success: false, message: '❌ السحب غير موجود' };
        }
        if (userPoints < draw.entryCost) {
            return { success: false, message: `❌ تحتاج ${draw.entryCost} نقطة للدخول` };
        }
        return {
            success: true,
            message: `🎫 تم تسجيلك في سحب ${draw.prizeAr}!\n\n📅 موعد السحب: ${draw.drawDate.toLocaleDateString('ar-SA')}\n👥 المشاركين: ${draw.participants + 1}`,
        };
    }
    formatQuests(quests) {
        let message = '🎯 **المهمات النشطة:**\n\n';
        for (const quest of quests) {
            const progressBar = this.getProgressBar(quest.progress, quest.target);
            const typeEmoji = { daily: '📅', weekly: '📆', monthly: '🗓️', special: '⭐' }[quest.type];
            message += `${typeEmoji} **${quest.titleAr}**\n`;
            message += `${progressBar} ${quest.progress}/${quest.target}\n`;
            message += `🎁 المكافأة: ${quest.reward} نقطة\n\n`;
        }
        return message;
    }
    getProgressBar(current, total) {
        const filled = Math.floor((current / total) * 10);
        const empty = 10 - filled;
        return '▓'.repeat(filled) + '░'.repeat(empty);
    }
    formatRewardStore() {
        let message = '🛒 **متجر المكافآت:**\n\n';
        for (const item of this.rewardItems.filter(i => i.available)) {
            message += `${item.icon} **${item.nameAr}** - ${item.cost} نقطة\n`;
            message += `   ${item.description}\n\n`;
        }
        message += '\n💡 قل "استبدل [اسم المكافأة]" للاستبدال';
        return message;
    }
    getNextFriday() {
        const now = new Date();
        const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
        return new Date(now.setDate(now.getDate() + daysUntilFriday));
    }
    getEndOfMonth() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
};
exports.GamificationService = GamificationService;
exports.GamificationService = GamificationService = GamificationService_1 = __decorate([
    (0, common_1.Injectable)()
], GamificationService);
//# sourceMappingURL=gamification.service.js.map