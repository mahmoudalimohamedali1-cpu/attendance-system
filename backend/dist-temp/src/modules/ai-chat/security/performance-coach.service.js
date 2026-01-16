"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PerformanceCoachService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceCoachService = void 0;
const common_1 = require("@nestjs/common");
let PerformanceCoachService = PerformanceCoachService_1 = class PerformanceCoachService {
    constructor() {
        this.logger = new common_1.Logger(PerformanceCoachService_1.name);
        this.goals = new Map();
        this.coachingTips = [
            {
                id: '1', category: 'productivity', categoryAr: 'الإنتاجية',
                title: 'تقنية البومودورو',
                content: 'اعمل 25 دقيقة ثم خذ استراحة 5 دقائق',
                actionItems: ['ضع مؤقت 25 دقيقة', 'ركز على مهمة واحدة', 'خذ استراحة قصيرة', 'كرر 4 مرات ثم استراحة طويلة'],
            },
            {
                id: '2', category: 'communication', categoryAr: 'التواصل',
                title: 'الاستماع الفعال',
                content: 'استمع للفهم وليس للرد',
                actionItems: ['اترك الشخص يكمل حديثه', 'أعد صياغة ما سمعته', 'اطرح أسئلة توضيحية', 'تجنب المقاطعة'],
            },
            {
                id: '3', category: 'leadership', categoryAr: 'القيادة',
                title: 'التفويض الفعال',
                content: 'فوض المهام بوضوح مع الدعم المناسب',
                actionItems: ['حدد المهمة بوضوح', 'اختر الشخص المناسب', 'قدم الموارد اللازمة', 'تابع بدون تدخل مفرط'],
            },
            {
                id: '4', category: 'technical', categoryAr: 'التقنية',
                title: 'التعلم المستمر',
                content: 'خصص وقت أسبوعي للتعلم والتطوير',
                actionItems: ['حدد مهارة جديدة للتعلم', 'خصص 2-3 ساعات أسبوعياً', 'طبق ما تعلمته', 'شارك معرفتك مع الفريق'],
            },
            {
                id: '5', category: 'wellbeing', categoryAr: 'الرفاهية',
                title: 'إدارة التوتر',
                content: 'تعرف على مثيرات التوتر وطرق التعامل معها',
                actionItems: ['مارس التنفس العميق', 'خذ فترات راحة منتظمة', 'مارس الرياضة', 'تحدث مع شخص موثوق'],
            },
        ];
        this.reviewCategories = [
            { name: 'quality', nameAr: 'جودة العمل', weight: 0.25 },
            { name: 'productivity', nameAr: 'الإنتاجية', weight: 0.20 },
            { name: 'teamwork', nameAr: 'العمل الجماعي', weight: 0.20 },
            { name: 'communication', nameAr: 'التواصل', weight: 0.15 },
            { name: 'initiative', nameAr: 'المبادرة', weight: 0.10 },
            { name: 'attendance', nameAr: 'الانضباط', weight: 0.10 },
        ];
    }
    createGoal(userId, title, description, type, target, unit, dueDate) {
        const id = `GOAL-${Date.now().toString(36).toUpperCase()}`;
        const typeNames = {
            objective: 'هدف',
            key_result: 'نتيجة رئيسية',
            task: 'مهمة',
            development: 'تطوير',
        };
        const goal = {
            id,
            userId,
            title,
            description,
            type,
            typeAr: typeNames[type],
            target,
            current: 0,
            unit,
            dueDate,
            status: 'not_started',
            statusAr: 'لم يبدأ',
            createdAt: new Date(),
        };
        this.goals.set(id, goal);
        return goal;
    }
    updateGoalProgress(goalId, newValue) {
        const goal = this.goals.get(goalId);
        if (!goal) {
            return { success: false, message: '❌ الهدف غير موجود' };
        }
        goal.current = newValue;
        const progress = (newValue / goal.target) * 100;
        if (progress >= 100) {
            goal.status = 'completed';
            goal.statusAr = 'مكتمل';
        }
        else if (progress > 0) {
            const daysRemaining = Math.ceil((goal.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const expectedProgress = ((Date.now() - goal.createdAt.getTime()) / (goal.dueDate.getTime() - goal.createdAt.getTime())) * 100;
            if (progress < expectedProgress - 20) {
                goal.status = 'at_risk';
                goal.statusAr = 'في خطر';
            }
            else {
                goal.status = 'in_progress';
                goal.statusAr = 'جاري';
            }
        }
        return {
            success: true,
            goal,
            message: `✅ تم تحديث "${goal.title}" (${Math.round(progress)}%)`,
        };
    }
    getUserGoals(userId) {
        const userGoals = [];
        for (const [, goal] of this.goals) {
            if (goal.userId === userId) {
                userGoals.push(goal);
            }
        }
        return userGoals.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    }
    getCoachingTip(category) {
        const tips = category
            ? this.coachingTips.filter(t => t.category === category)
            : this.coachingTips;
        return tips[Math.floor(Math.random() * tips.length)];
    }
    calculateOverallRating(categoryRatings) {
        let weightedSum = 0;
        let totalWeight = 0;
        for (const cr of categoryRatings) {
            const category = this.reviewCategories.find(c => c.name === cr.category);
            if (category) {
                weightedSum += cr.rating * category.weight;
                totalWeight += category.weight;
            }
        }
        return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;
    }
    formatGoals(userId) {
        const goals = this.getUserGoals(userId);
        if (goals.length === 0) {
            return '🎯 لا توجد أهداف مسجلة.\n\nقل "أضف هدف [العنوان]" لإضافة هدف جديد';
        }
        let message = '🎯 **أهدافك:**\n\n';
        for (const goal of goals) {
            const progress = Math.round((goal.current / goal.target) * 100);
            const statusEmoji = { not_started: '⬜', in_progress: '🔵', at_risk: '🟡', completed: '✅' }[goal.status];
            const progressBar = this.getProgressBar(progress);
            message += `${statusEmoji} **${goal.title}**\n`;
            message += `   ${progressBar} ${goal.current}/${goal.target} ${goal.unit} (${progress}%)\n`;
            message += `   📅 ${goal.dueDate.toLocaleDateString('ar-SA')}\n\n`;
        }
        return message;
    }
    getProgressBar(percent) {
        const filled = Math.floor(Math.min(100, percent) / 10);
        const empty = 10 - filled;
        return '▓'.repeat(filled) + '░'.repeat(empty);
    }
    formatCoachingTip(tip) {
        let message = `💡 **${tip.title}** (${tip.categoryAr})\n\n`;
        message += `${tip.content}\n\n`;
        message += `📋 **خطوات التطبيق:**\n`;
        for (let i = 0; i < tip.actionItems.length; i++) {
            message += `${i + 1}. ${tip.actionItems[i]}\n`;
        }
        return message;
    }
    formatPerformanceSummary(userId) {
        const goals = this.getUserGoals(userId);
        const completed = goals.filter(g => g.status === 'completed').length;
        const atRisk = goals.filter(g => g.status === 'at_risk').length;
        const inProgress = goals.filter(g => g.status === 'in_progress').length;
        let message = '📊 **ملخص الأداء:**\n\n';
        message += `🎯 إجمالي الأهداف: ${goals.length}\n`;
        message += `✅ مكتمل: ${completed}\n`;
        message += `🔵 جاري: ${inProgress}\n`;
        message += `🟡 في خطر: ${atRisk}\n\n`;
        const completionRate = goals.length > 0 ? Math.round((completed / goals.length) * 100) : 0;
        message += `📈 نسبة الإنجاز: ${completionRate}%\n`;
        const tip = this.getCoachingTip();
        message += `\n💡 نصيحة: ${tip.title}`;
        return message;
    }
};
exports.PerformanceCoachService = PerformanceCoachService;
exports.PerformanceCoachService = PerformanceCoachService = PerformanceCoachService_1 = __decorate([
    (0, common_1.Injectable)()
], PerformanceCoachService);
//# sourceMappingURL=performance-coach.service.js.map