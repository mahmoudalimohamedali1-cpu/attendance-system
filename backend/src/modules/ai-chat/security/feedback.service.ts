import { Injectable, Logger } from '@nestjs/common';

/**
 * 💬 Feedback Service
 * Implements ideas #87, #114: Innovation points & Anonymous feedback
 * 
 * Features:
 * - Anonymous feedback
 * - Suggestion box
 * - Innovation ideas
 * - Recognition system
 */

export interface Feedback {
    id: string;
    userId?: string; // Optional for anonymous
    type: 'suggestion' | 'complaint' | 'recognition' | 'innovation' | 'question';
    typeAr: string;
    content: string;
    category: 'workplace' | 'management' | 'process' | 'benefits' | 'other';
    anonymous: boolean;
    status: 'new' | 'reviewed' | 'implemented' | 'closed';
    createdAt: Date;
    response?: string;
    respondedAt?: Date;
    votes?: number;
}

export interface Recognition {
    id: string;
    fromUserId: string;
    fromUserName: string;
    toUserId: string;
    toUserName: string;
    message: string;
    category: 'teamwork' | 'innovation' | 'customer' | 'leadership' | 'above_beyond';
    categoryAr: string;
    createdAt: Date;
    likes: number;
}

export interface InnovationIdea {
    id: string;
    userId: string;
    userName: string;
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    effort: 'low' | 'medium' | 'high';
    status: 'new' | 'under_review' | 'approved' | 'in_progress' | 'implemented' | 'rejected';
    votes: number;
    points: number;
    createdAt: Date;
}

@Injectable()
export class FeedbackService {
    private readonly logger = new Logger(FeedbackService.name);

    // In-memory storage
    private feedbacks: Map<string, Feedback> = new Map();
    private recognitions: Map<string, Recognition> = new Map();
    private ideas: Map<string, InnovationIdea> = new Map();

    // Type names
    private readonly typeNames: Record<Feedback['type'], string> = {
        suggestion: 'اقتراح',
        complaint: 'شكوى',
        recognition: 'تقدير',
        innovation: 'فكرة إبداعية',
        question: 'سؤال',
    };

    // Recognition categories
    private readonly recognitionCategories: Record<Recognition['category'], string> = {
        teamwork: 'روح الفريق 🤝',
        innovation: 'الابتكار 💡',
        customer: 'خدمة العملاء ⭐',
        leadership: 'القيادة 👑',
        above_beyond: 'تفوق في العمل 🚀',
    };

    /**
     * 📝 Submit feedback
     */
    submitFeedback(
        content: string,
        type: Feedback['type'],
        category: Feedback['category'],
        userId?: string,
        anonymous: boolean = false
    ): { success: boolean; feedback?: Feedback; message: string } {
        const feedbackId = `FB-${Date.now().toString(36).toUpperCase()}`;

        const feedback: Feedback = {
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

    /**
     * 🌟 Send recognition (kudos)
     */
    sendRecognition(
        fromUserId: string,
        fromUserName: string,
        toUserId: string,
        toUserName: string,
        message: string,
        category: Recognition['category']
    ): { success: boolean; recognition?: Recognition; message: string } {
        if (fromUserId === toUserId) {
            return { success: false, message: '❌ لا يمكنك تقدير نفسك!' };
        }

        const recognitionId = `REC-${Date.now().toString(36).toUpperCase()}`;

        const recognition: Recognition = {
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

    /**
     * 💡 Submit innovation idea
     */
    submitIdea(
        userId: string,
        userName: string,
        title: string,
        description: string,
        impact: InnovationIdea['impact'],
        effort: InnovationIdea['effort']
    ): { success: boolean; idea?: InnovationIdea; message: string } {
        const ideaId = `IDEA-${Date.now().toString(36).toUpperCase()}`;

        // Calculate initial points based on impact/effort ratio
        const impactScore = { low: 1, medium: 2, high: 3 }[impact];
        const effortScore = { low: 3, medium: 2, high: 1 }[effort];
        const points = impactScore * effortScore * 10;

        const idea: InnovationIdea = {
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

    private getImpactAr(impact: InnovationIdea['impact']): string {
        return { low: 'منخفض', medium: 'متوسط', high: 'عالي' }[impact];
    }

    private getEffortAr(effort: InnovationIdea['effort']): string {
        return { low: 'قليل', medium: 'متوسط', high: 'كبير' }[effort];
    }

    /**
     * 👍 Vote for idea
     */
    voteForIdea(ideaId: string): { success: boolean; message: string } {
        const idea = this.ideas.get(ideaId);
        if (!idea) {
            return { success: false, message: '❌ الفكرة غير موجودة' };
        }

        idea.votes++;
        idea.points += 5; // 5 points per vote

        return {
            success: true,
            message: `👍 تم التصويت!\n\n📊 الأصوات: ${idea.votes}\n🎯 النقاط: ${idea.points}`,
        };
    }

    /**
     * 📋 Get recent recognitions (wall of fame)
     */
    getWallOfFame(limit: number = 5): Recognition[] {
        const allRecognitions = Array.from(this.recognitions.values());
        return allRecognitions
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, limit);
    }

    /**
     * 📊 Format wall of fame as message
     */
    formatWallOfFame(): string {
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

    /**
     * 💡 Get top ideas
     */
    getTopIdeas(limit: number = 5): InnovationIdea[] {
        const allIdeas = Array.from(this.ideas.values());
        return allIdeas
            .filter(i => i.status !== 'rejected')
            .sort((a, b) => b.votes - a.votes)
            .slice(0, limit);
    }

    /**
     * 📊 Format top ideas as message
     */
    formatTopIdeas(): string {
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

    /**
     * 📊 Get user's feedback stats
     */
    getUserStats(userId: string): { suggestions: number; recognitionsSent: number; recognitionsReceived: number; ideas: number } {
        let suggestions = 0;
        let recognitionsSent = 0;
        let recognitionsReceived = 0;
        let ideasCount = 0;

        for (const [, feedback] of this.feedbacks) {
            if (feedback.userId === userId) suggestions++;
        }

        for (const [, rec] of this.recognitions) {
            if (rec.fromUserId === userId) recognitionsSent++;
            if (rec.toUserId === userId) recognitionsReceived++;
        }

        for (const [, idea] of this.ideas) {
            if (idea.userId === userId) ideasCount++;
        }

        return { suggestions, recognitionsSent, recognitionsReceived, ideas: ideasCount };
    }
}
