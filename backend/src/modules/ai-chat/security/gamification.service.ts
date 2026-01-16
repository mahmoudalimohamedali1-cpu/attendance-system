import { Injectable, Logger } from '@nestjs/common';

/**
 * 🏆 Advanced Gamification Service
 * Implements ideas #81-100: Full Gamification
 * 
 * Features:
 * - #84 Weekly quests
 * - #85 Trivia competitions
 * - #88 Innovation points
 * - #99 Lucky draw
 * - #100 Reward store
 */

export interface Quest {
    id: string;
    title: string;
    titleAr: string;
    description: string;
    type: 'daily' | 'weekly' | 'monthly' | 'special';
    target: number;
    progress: number;
    reward: number;
    expiresAt: Date;
    completed: boolean;
}

export interface TriviaQuestion {
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    category: 'company' | 'hr' | 'safety' | 'general';
    points: number;
}

export interface RewardItem {
    id: string;
    name: string;
    nameAr: string;
    description: string;
    cost: number;
    category: 'voucher' | 'experience' | 'merchandise' | 'time_off';
    available: boolean;
    icon: string;
}

export interface LuckyDraw {
    id: string;
    name: string;
    prize: string;
    prizeAr: string;
    entryCost: number;
    drawDate: Date;
    participants: number;
}

export interface Leaderboard {
    period: 'daily' | 'weekly' | 'monthly' | 'alltime';
    entries: LeaderboardEntry[];
}

export interface LeaderboardEntry {
    rank: number;
    userId: string;
    userName: string;
    points: number;
    badges: number;
    streak: number;
}

@Injectable()
export class GamificationService {
    private readonly logger = new Logger(GamificationService.name);

    // Sample quests
    private readonly questTemplates: Omit<Quest, 'id' | 'progress' | 'completed' | 'expiresAt'>[] = [
        { title: 'Perfect Attendance', titleAr: 'حضور مثالي', description: 'حضر 5 أيام متتالية', type: 'weekly', target: 5, reward: 50 },
        { title: 'Early Bird', titleAr: 'الطائر المبكر', description: 'احضر قبل الوقت 3 مرات', type: 'weekly', target: 3, reward: 30 },
        { title: 'Helper', titleAr: 'المساعد', description: 'ساعد زميل في مهمة', type: 'daily', target: 1, reward: 10 },
        { title: 'Learner', titleAr: 'المتعلم', description: 'أكمل درس تدريبي', type: 'weekly', target: 1, reward: 40 },
        { title: 'Innovator', titleAr: 'المبتكر', description: 'قدم فكرة تحسين', type: 'monthly', target: 1, reward: 100 },
        { title: 'Team Player', titleAr: 'روح الفريق', description: 'شارك في نشاط جماعي', type: 'weekly', target: 1, reward: 25 },
    ];

    // Trivia questions bank
    private readonly triviaQuestions: TriviaQuestion[] = [
        { id: '1', question: 'متى تأسست الشركة؟', options: ['2010', '2015', '2018', '2020'], correctIndex: 1, category: 'company', points: 10 },
        { id: '2', question: 'كم يوم إجازة سنوية للموظف الجديد؟', options: ['15', '21', '25', '30'], correctIndex: 1, category: 'hr', points: 10 },
        { id: '3', question: 'ما هو رقم الطوارئ في السعودية؟', options: ['911', '999', '112', '100'], correctIndex: 0, category: 'safety', points: 5 },
        { id: '4', question: 'أي من التالي ليس من قيم الشركة؟', options: ['الابتكار', 'النزاهة', 'السرعة', 'التميز'], correctIndex: 2, category: 'company', points: 15 },
        { id: '5', question: 'كم ساعة عمل أسبوعية حسب نظام العمل؟', options: ['40', '45', '48', '50'], correctIndex: 2, category: 'hr', points: 10 },
    ];

    // Reward store items
    private readonly rewardItems: RewardItem[] = [
        { id: '1', name: 'Coffee Voucher', nameAr: 'قسيمة قهوة', description: 'قسيمة ستاربكس 50 ريال', cost: 100, category: 'voucher', available: true, icon: '☕' },
        { id: '2', name: 'Extra Break', nameAr: 'استراحة إضافية', description: '30 دقيقة استراحة إضافية', cost: 50, category: 'time_off', available: true, icon: '⏰' },
        { id: '3', name: 'Lunch Voucher', nameAr: 'قسيمة غداء', description: 'غداء مجاني في الكافتيريا', cost: 75, category: 'voucher', available: true, icon: '🍽️' },
        { id: '4', name: 'Company Mug', nameAr: 'كوب الشركة', description: 'كوب حراري بشعار الشركة', cost: 150, category: 'merchandise', available: true, icon: '🥤' },
        { id: '5', name: 'Late Start', nameAr: 'بداية متأخرة', description: 'ابدأ متأخر ساعة (مرة واحدة)', cost: 200, category: 'time_off', available: true, icon: '🌅' },
        { id: '6', name: 'Half Day Off', nameAr: 'نصف يوم إجازة', description: 'نصف يوم إجازة إضافية', cost: 500, category: 'time_off', available: true, icon: '🏖️' },
        { id: '7', name: 'Parking Spot', nameAr: 'موقف VIP', description: 'موقف VIP لأسبوع', cost: 300, category: 'experience', available: true, icon: '🚗' },
        { id: '8', name: 'Training Course', nameAr: 'دورة تدريبية', description: 'دورة مجانية من اختيارك', cost: 1000, category: 'experience', available: true, icon: '📚' },
    ];

    // Active lucky draws
    private readonly luckyDraws: LuckyDraw[] = [
        { id: '1', name: 'Weekly Draw', prize: 'iPhone 15', prizeAr: 'آيفون 15', entryCost: 50, drawDate: this.getNextFriday(), participants: 45 },
        { id: '2', name: 'Monthly Draw', prize: 'Full Day Off', prizeAr: 'يوم إجازة كامل', entryCost: 25, drawDate: this.getEndOfMonth(), participants: 120 },
    ];

    /**
     * 📋 Get active quests for user
     */
    getActiveQuests(): Quest[] {
        const now = new Date();
        return this.questTemplates.map((template, index) => ({
            ...template,
            id: `quest_${index}`,
            progress: Math.floor(Math.random() * template.target),
            completed: false,
            expiresAt: this.getQuestExpiry(template.type),
        }));
    }

    private getQuestExpiry(type: Quest['type']): Date {
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

    /**
     * ❓ Get trivia question
     */
    getTriviaQuestion(): TriviaQuestion {
        return this.triviaQuestions[Math.floor(Math.random() * this.triviaQuestions.length)];
    }

    /**
     * ✅ Check trivia answer
     */
    checkTriviaAnswer(questionId: string, answerIndex: number): { correct: boolean; points: number; message: string } {
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

    /**
     * 🛒 Get reward store
     */
    getRewardStore(): RewardItem[] {
        return this.rewardItems.filter(item => item.available);
    }

    /**
     * 🎁 Redeem reward
     */
    redeemReward(itemId: string, userPoints: number): { success: boolean; message: string; remainingPoints?: number } {
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

    /**
     * 🎰 Get lucky draws
     */
    getLuckyDraws(): LuckyDraw[] {
        return this.luckyDraws;
    }

    /**
     * 🎫 Enter lucky draw
     */
    enterLuckyDraw(drawId: string, userPoints: number): { success: boolean; message: string } {
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

    /**
     * 📊 Format quests as message
     */
    formatQuests(quests: Quest[]): string {
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

    private getProgressBar(current: number, total: number): string {
        const filled = Math.floor((current / total) * 10);
        const empty = 10 - filled;
        return '▓'.repeat(filled) + '░'.repeat(empty);
    }

    /**
     * 🛒 Format reward store as message
     */
    formatRewardStore(): string {
        let message = '🛒 **متجر المكافآت:**\n\n';

        for (const item of this.rewardItems.filter(i => i.available)) {
            message += `${item.icon} **${item.nameAr}** - ${item.cost} نقطة\n`;
            message += `   ${item.description}\n\n`;
        }

        message += '\n💡 قل "استبدل [اسم المكافأة]" للاستبدال';
        return message;
    }

    // Helper methods
    private getNextFriday(): Date {
        const now = new Date();
        const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
        return new Date(now.setDate(now.getDate() + daysUntilFriday));
    }

    private getEndOfMonth(): Date {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
}
