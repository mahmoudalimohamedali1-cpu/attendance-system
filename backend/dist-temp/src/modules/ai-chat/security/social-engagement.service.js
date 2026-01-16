"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SocialEngagementService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialEngagementService = void 0;
const common_1 = require("@nestjs/common");
let SocialEngagementService = SocialEngagementService_1 = class SocialEngagementService {
    constructor() {
        this.logger = new common_1.Logger(SocialEngagementService_1.name);
        this.posts = new Map();
        this.polls = new Map();
        this.anniversaries = [
            { userId: '1', userName: 'أحمد محمد', type: 'work', date: new Date(), years: 5, department: 'الهندسة' },
            { userId: '2', userName: 'سارة عبدالله', type: 'birthday', date: new Date(), department: 'الموارد البشرية' },
            { userId: '3', userName: 'خالد عمر', type: 'work', date: new Date(), years: 3, department: 'المبيعات' },
        ];
    }
    getTodayCelebrations() {
        const today = new Date();
        const todayStr = `${today.getMonth()}-${today.getDate()}`;
        const all = this.anniversaries.filter(a => {
            const dateStr = `${a.date.getMonth()}-${a.date.getDate()}`;
            return dateStr === todayStr;
        });
        return {
            birthdays: all.filter(a => a.type === 'birthday'),
            workAnniversaries: all.filter(a => a.type === 'work'),
        };
    }
    getUpcomingCelebrations(days = 7) {
        const now = new Date();
        const upcoming = [];
        for (let i = 0; i <= days; i++) {
            const checkDate = new Date(now);
            checkDate.setDate(checkDate.getDate() + i);
            const dateStr = `${checkDate.getMonth()}-${checkDate.getDate()}`;
            for (const ann of this.anniversaries) {
                const annDateStr = `${ann.date.getMonth()}-${ann.date.getDate()}`;
                if (annDateStr === dateStr) {
                    upcoming.push({ ...ann, date: checkDate });
                }
            }
        }
        return upcoming;
    }
    createPost(authorId, authorName, content, type = 'update') {
        const id = `POST-${Date.now().toString(36).toUpperCase()}`;
        const typeNames = {
            update: 'تحديث',
            achievement: 'إنجاز',
            milestone: 'إنجاز مهم',
            announcement: 'إعلان',
            poll: 'استطلاع',
        };
        const post = {
            id,
            authorId,
            authorName,
            type,
            typeAr: typeNames[type],
            content,
            likes: 0,
            comments: 0,
            createdAt: new Date(),
            pinned: false,
        };
        this.posts.set(id, post);
        return post;
    }
    likePost(postId) {
        const post = this.posts.get(postId);
        if (!post) {
            return { success: false, likes: 0 };
        }
        post.likes++;
        return { success: true, likes: post.likes };
    }
    createPoll(createdBy, question, questionAr, options, daysToExpire = 7) {
        const id = `POLL-${Date.now().toString(36).toUpperCase()}`;
        const poll = {
            id,
            question,
            questionAr,
            options: options.map((text, i) => ({ id: `opt-${i}`, text, votes: 0 })),
            createdBy,
            expiresAt: new Date(Date.now() + daysToExpire * 24 * 60 * 60 * 1000),
            totalVotes: 0,
            anonymous: true,
        };
        this.polls.set(id, poll);
        return poll;
    }
    votePoll(pollId, optionId) {
        const poll = this.polls.get(pollId);
        if (!poll) {
            return { success: false, message: '❌ الاستطلاع غير موجود' };
        }
        if (new Date() > poll.expiresAt) {
            return { success: false, message: '❌ انتهى الاستطلاع' };
        }
        const option = poll.options.find(o => o.id === optionId);
        if (!option) {
            return { success: false, message: '❌ الخيار غير موجود' };
        }
        option.votes++;
        poll.totalVotes++;
        return { success: true, message: '✅ تم تسجيل صوتك!' };
    }
    getSpotlight() {
        return {
            userId: '1',
            userName: 'أحمد محمد',
            department: 'الهندسة',
            role: 'مطور أول',
            achievements: [
                'قاد مشروع تحويل النظام الجديد',
                'حصل على شهادة AWS',
                'ساهم في تدريب 5 موظفين جدد',
            ],
            funFacts: [
                'يحب لعب كرة القدم',
                'يقرأ كتاباً كل شهر',
            ],
            quote: 'النجاح يبدأ بخطوة واحدة',
            startDate: new Date('2020-01-15'),
            spotlightDate: new Date(),
        };
    }
    getFeed(limit = 10) {
        const allPosts = Array.from(this.posts.values());
        return allPosts
            .sort((a, b) => {
            if (a.pinned !== b.pinned)
                return a.pinned ? -1 : 1;
            return b.createdAt.getTime() - a.createdAt.getTime();
        })
            .slice(0, limit);
    }
    formatCelebrations() {
        const { birthdays, workAnniversaries } = this.getTodayCelebrations();
        if (birthdays.length === 0 && workAnniversaries.length === 0) {
            const upcoming = this.getUpcomingCelebrations(7);
            if (upcoming.length === 0) {
                return '🎉 لا توجد احتفالات قريبة';
            }
            let message = '📅 **الاحتفالات القادمة:**\n\n';
            for (const ann of upcoming.slice(0, 5)) {
                const emoji = ann.type === 'birthday' ? '🎂' : '🎊';
                const dateStr = ann.date.toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'short' });
                message += `${emoji} **${ann.userName}** - ${dateStr}\n`;
                if (ann.years)
                    message += `   ${ann.years} سنوات في الشركة\n`;
                message += '\n';
            }
            return message;
        }
        let message = '🎉 **احتفالات اليوم:**\n\n';
        if (birthdays.length > 0) {
            message += '🎂 **أعياد الميلاد:**\n';
            for (const b of birthdays) {
                message += `• ${b.userName} (${b.department})\n`;
            }
            message += '\n';
        }
        if (workAnniversaries.length > 0) {
            message += '🎊 **ذكرى الانضمام:**\n';
            for (const w of workAnniversaries) {
                message += `• ${w.userName} - ${w.years} سنوات\n`;
            }
        }
        return message;
    }
    formatSpotlight() {
        const spotlight = this.getSpotlight();
        let message = '🌟 **موظف الأسبوع:**\n\n';
        message += `👤 **${spotlight.userName}**\n`;
        message += `📍 ${spotlight.department} | ${spotlight.role}\n\n`;
        message += `🏆 **الإنجازات:**\n`;
        for (const ach of spotlight.achievements) {
            message += `• ${ach}\n`;
        }
        message += `\n💬 "${spotlight.quote}"`;
        return message;
    }
    formatPoll(poll) {
        let message = `📊 **${poll.questionAr}**\n\n`;
        const maxVotes = Math.max(...poll.options.map(o => o.votes), 1);
        for (const option of poll.options) {
            const percentage = poll.totalVotes > 0
                ? Math.round((option.votes / poll.totalVotes) * 100)
                : 0;
            const barLength = Math.round((option.votes / maxVotes) * 10);
            const bar = '█'.repeat(barLength) + '░'.repeat(10 - barLength);
            message += `${option.text}\n`;
            message += `${bar} ${percentage}% (${option.votes})\n\n`;
        }
        message += `👥 ${poll.totalVotes} صوت`;
        return message;
    }
};
exports.SocialEngagementService = SocialEngagementService;
exports.SocialEngagementService = SocialEngagementService = SocialEngagementService_1 = __decorate([
    (0, common_1.Injectable)()
], SocialEngagementService);
//# sourceMappingURL=social-engagement.service.js.map