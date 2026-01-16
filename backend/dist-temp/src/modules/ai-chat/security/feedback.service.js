"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var FeedbackService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedbackService = void 0;
const common_1 = require("@nestjs/common");
let FeedbackService = FeedbackService_1 = class FeedbackService {
    constructor() {
        this.logger = new common_1.Logger(FeedbackService_1.name);
        this.feedbacks = new Map();
        this.recognitions = new Map();
        this.ideas = new Map();
        this.typeNames = {
            suggestion: 'اقتراح',
            complaint: 'شكوى',
            recognition: 'تقدير',
            innovation: 'فكرة إبداعية',
            question: 'سؤال',
        };
        this.recognitionCategories = {
            teamwork: 'روح الفريق 🤝',
            innovation: 'الابتكار 💡',
            customer: 'خدمة العملاء ⭐',
            leadership: 'القيادة 👑',
            above_beyond: 'تفوق في العمل 🚀',
        };
    }
    submitFeedback(content, type, category, userId, anonymous = false) {
        const feedbackId = `FB-${Date.now().toString(36).toUpperCase()}`;
        const feedback = {
            id: feedbackId,
            userId: anonymous ? undefined : userId,
            type,
            typeAr: this.typeNames[type],
            content,
            category,
            anonymous,
            status: 'new',
            createdAt: new Date(),
            votes: 0,
        };
        this.feedbacks.set(feedbackId, feedback);
        return {
            success: true,
            feedback,
            message: `✅ **تم استلام ${feedback.typeAr}!**\n\n📋 الرقم: #${feedbackId}\n${anonymous ? '🔒 مجهول الهوية' : ''}\n\nشكراً لمشاركتك! 💚`,
        };
    }
    sendRecognition(fromUserId, fromUserName, toUserId, toUserName, message, category) {
        if (fromUserId === toUserId) {
            return { success: false, message: '❌ لا يمكنك تقدير نفسك!' };
        }
        const recognitionId = `REC-${Date.now().toString(36).toUpperCase()}`;
        const recognition = {
            id: recognitionId,
            fromUserId,
            fromUserName,
            toUserId,
            toUserName,
            message,
            category,
            categoryAr: this.recognitionCategories[category],
            createdAt: new Date(),
            likes: 0,
        };
        this.recognitions.set(recognitionId, recognition);
        return {
            success: true,
            recognition,
            message: `🌟 **تم إرسال التقدير!**\n\n${recognition.categoryAr}\n\n"${message}"\n\n← من ${fromUserName} إلى ${toUserName}`,
        };
    }
    submitIdea(userId, userName, title, description, impact, effort) {
        const ideaId = `IDEA-${Date.now().toString(36).toUpperCase()}`;
        const impactScore = { low: 1, medium: 2, high: 3 }[impact];
        const effortScore = { low: 3, medium: 2, high: 1 }[effort];
        const points = impactScore * effortScore * 10;
        const idea = {
            id: ideaId,
            userId,
            userName,
            title,
            description,
            impact,
            effort,
            status: 'new',
            votes: 0,
            points,
            createdAt: new Date(),
        };
        this.ideas.set(ideaId, idea);
        return {
            success: true,
            idea,
            message: `💡 **تم تقديم فكرتك!**\n\n📋 "${title}"\n📊 التأثير: ${this.getImpactAr(impact)}\n⚡ الجهد: ${this.getEffortAr(effort)}\n🎯 النقاط المبدئية: ${points}\n\nشكراً على إبداعك! 🚀`,
        };
    }
    getImpactAr(impact) {
        return { low: 'منخفض', medium: 'متوسط', high: 'عالي' }[impact];
    }
    getEffortAr(effort) {
        return { low: 'قليل', medium: 'متوسط', high: 'كبير' }[effort];
    }
    voteForIdea(ideaId) {
        const idea = this.ideas.get(ideaId);
        if (!idea) {
            return { success: false, message: '❌ الفكرة غير موجودة' };
        }
        idea.votes++;
        idea.points += 5;
        return {
            success: true,
            message: `👍 تم التصويت!\n\n📊 الأصوات: ${idea.votes}\n🎯 النقاط: ${idea.points}`,
        };
    }
    getWallOfFame(limit = 5) {
        const allRecognitions = Array.from(this.recognitions.values());
        return allRecognitions
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, limit);
    }
    formatWallOfFame() {
        const recognitions = this.getWallOfFame(5);
        if (recognitions.length === 0) {
            return '🌟 لوحة التقدير فارغة!\n\nكن أول من يقدر زميله!\nقل: "أقدر [اسم الزميل] على [السبب]"';
        }
        let message = '🏆 **لوحة التقدير:**\n\n';
        for (const rec of recognitions) {
            message += `${rec.categoryAr}\n`;
            message += `"${rec.message}"\n`;
            message += `← ${rec.fromUserName} → ${rec.toUserName}\n`;
            message += `❤️ ${rec.likes}\n\n`;
        }
        return message;
    }
    getTopIdeas(limit = 5) {
        const allIdeas = Array.from(this.ideas.values());
        return allIdeas
            .filter(i => i.status !== 'rejected')
            .sort((a, b) => b.votes - a.votes)
            .slice(0, limit);
    }
    formatTopIdeas() {
        const ideas = this.getTopIdeas(5);
        if (ideas.length === 0) {
            return '💡 صندوق الأفكار فارغ!\n\nشاركنا فكرتك الإبداعية!\nقل: "فكرة: [عنوان الفكرة]"';
        }
        let message = '💡 **أفضل الأفكار:**\n\n';
        for (let i = 0; i < ideas.length; i++) {
            const idea = ideas[i];
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '💡';
            message += `${medal} **${idea.title}**\n`;
            message += `   👤 ${idea.userName} | 👍 ${idea.votes} صوت | 🎯 ${idea.points} نقطة\n\n`;
        }
        message += '💡 قل "أصوت لـ [اسم الفكرة]" للتصويت';
        return message;
    }
    getUserStats(userId) {
        let suggestions = 0;
        let recognitionsSent = 0;
        let recognitionsReceived = 0;
        let ideasCount = 0;
        for (const [, feedback] of this.feedbacks) {
            if (feedback.userId === userId)
                suggestions++;
        }
        for (const [, rec] of this.recognitions) {
            if (rec.fromUserId === userId)
                recognitionsSent++;
            if (rec.toUserId === userId)
                recognitionsReceived++;
        }
        for (const [, idea] of this.ideas) {
            if (idea.userId === userId)
                ideasCount++;
        }
        return { suggestions, recognitionsSent, recognitionsReceived, ideas: ideasCount };
    }
};
exports.FeedbackService = FeedbackService;
exports.FeedbackService = FeedbackService = FeedbackService_1 = __decorate([
    (0, common_1.Injectable)()
], FeedbackService);
//# sourceMappingURL=feedback.service.js.map