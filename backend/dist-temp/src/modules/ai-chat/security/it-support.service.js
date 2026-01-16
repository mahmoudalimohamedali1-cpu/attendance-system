"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ITSupportService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ITSupportService = void 0;
const common_1 = require("@nestjs/common");
let ITSupportService = ITSupportService_1 = class ITSupportService {
    constructor() {
        this.logger = new common_1.Logger(ITSupportService_1.name);
        this.tickets = new Map();
        this.issuePatterns = [
            { pattern: /لابتوب|كمبيوتر|شاشة|كيبورد|ماوس|طابعة/i, category: 'hardware', priority: 'medium' },
            { pattern: /برنامج|تطبيق|ويندوز|اوفيس|excel|word/i, category: 'software', priority: 'low' },
            { pattern: /انترنت|واي فاي|wifi|شبكة|بطيء/i, category: 'network', priority: 'high' },
            { pattern: /صلاحية|دخول|رقم سري|باسورد|password|login/i, category: 'access', priority: 'high' },
            { pattern: /ايميل|email|outlook|بريد/i, category: 'email', priority: 'medium' },
        ];
        this.categoryNames = {
            hardware: 'أجهزة',
            software: 'برامج',
            network: 'شبكة',
            access: 'صلاحيات',
            email: 'بريد إلكتروني',
            other: 'أخرى',
        };
        this.selfServiceSolutions = [
            {
                issue: 'slow_computer',
                issueAr: 'الكمبيوتر بطيء',
                steps: [
                    '1. أعد تشغيل الجهاز',
                    '2. أغلق البرامج غير المستخدمة',
                    '3. امسح الملفات المؤقتة (Disk Cleanup)',
                    '4. إذا استمرت المشكلة، افتح تذكرة',
                ],
            },
            {
                issue: 'forgot_password',
                issueAr: 'نسيت كلمة المرور',
                steps: [
                    '1. اذهب إلى صفحة تسجيل الدخول',
                    '2. اضغط "نسيت كلمة المرور"',
                    '3. أدخل بريدك الإلكتروني',
                    '4. راجع بريدك لرابط إعادة التعيين',
                ],
            },
            {
                issue: 'wifi_issues',
                issueAr: 'مشكلة في الواي فاي',
                steps: [
                    '1. أطفئ الواي فاي وأعد تشغيله',
                    '2. تأكد من كلمة مرور الشبكة',
                    '3. ابتعد عن مصادر التشويش',
                    '4. جرب إعادة تشغيل الراوتر',
                ],
            },
            {
                issue: 'printer_not_working',
                issueAr: 'الطابعة لا تعمل',
                steps: [
                    '1. تأكد من تشغيل الطابعة',
                    '2. تحقق من الاتصال (USB أو الشبكة)',
                    '3. تأكد من وجود ورق وحبر',
                    '4. أعد تثبيت الطابعة',
                ],
            },
            {
                issue: 'email_not_syncing',
                issueAr: 'البريد لا يتزامن',
                steps: [
                    '1. تحقق من اتصال الانترنت',
                    '2. أغلق Outlook وأعد فتحه',
                    '3. امسح ذاكرة التخزين المؤقت',
                    '4. تحقق من إعدادات الحساب',
                ],
            },
        ];
    }
    createTicket(userId, userName, message) {
        const selfService = this.findSelfServiceSolution(message);
        if (selfService) {
            return {
                success: true,
                message: `💡 **حل سريع: ${selfService.issueAr}**\n\n${selfService.steps.join('\n')}\n\n❓ هل تريد فتح تذكرة؟`,
                selfService,
            };
        }
        const { category, priority } = this.categorizeIssue(message);
        const ticketId = `IT-${Date.now().toString(36).toUpperCase()}`;
        const ticket = {
            id: ticketId,
            userId,
            userName,
            category,
            categoryAr: this.categoryNames[category],
            priority,
            description: message,
            status: 'open',
            createdAt: new Date(),
        };
        this.tickets.set(ticketId, ticket);
        return {
            success: true,
            ticket,
            message: `🎫 **تم فتح التذكرة #${ticketId}**\n\n📁 التصنيف: ${ticket.categoryAr}\n🔴 الأولوية: ${this.getPriorityAr(priority)}\n\n⏳ سيتم التواصل معك قريباً`,
        };
    }
    categorizeIssue(message) {
        for (const { pattern, category, priority } of this.issuePatterns) {
            if (pattern.test(message)) {
                return { category, priority };
            }
        }
        return { category: 'other', priority: 'low' };
    }
    findSelfServiceSolution(message) {
        const lowerMsg = message.toLowerCase();
        if (/بطيء|بطي|slow/.test(lowerMsg))
            return this.selfServiceSolutions[0];
        if (/نسيت|باسورد|password|كلمة.*مرور/.test(lowerMsg))
            return this.selfServiceSolutions[1];
        if (/واي.*فاي|wifi|انترنت/.test(lowerMsg))
            return this.selfServiceSolutions[2];
        if (/طابعة|printer/.test(lowerMsg))
            return this.selfServiceSolutions[3];
        if (/ايميل|بريد|outlook/.test(lowerMsg))
            return this.selfServiceSolutions[4];
        return null;
    }
    getPriorityAr(priority) {
        return { low: 'منخفضة', medium: 'متوسطة', high: 'عالية', critical: 'حرجة' }[priority];
    }
    getUserTickets(userId) {
        const userTickets = [];
        for (const [, ticket] of this.tickets) {
            if (ticket.userId === userId) {
                userTickets.push(ticket);
            }
        }
        return userTickets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    formatTickets(userId) {
        const tickets = this.getUserTickets(userId);
        if (tickets.length === 0) {
            return '📋 لا توجد تذاكر مفتوحة.\n\nللإبلاغ عن مشكلة:\n"لابتوبي معلق" أو "مشكلة في الانترنت"';
        }
        let message = '🎫 **تذاكرك:**\n\n';
        for (const ticket of tickets.slice(0, 5)) {
            const statusEmoji = { open: '🟡', in_progress: '🔵', resolved: '✅', closed: '⚫' }[ticket.status];
            message += `${statusEmoji} **#${ticket.id}** - ${ticket.categoryAr}\n`;
            message += `   ${ticket.description.substring(0, 50)}...\n\n`;
        }
        return message;
    }
    resolveTicket(ticketId, solution) {
        const ticket = this.tickets.get(ticketId);
        if (!ticket) {
            return { success: false, message: '❌ التذكرة غير موجودة' };
        }
        ticket.status = 'resolved';
        ticket.resolvedAt = new Date();
        ticket.solution = solution;
        return {
            success: true,
            message: `✅ تم حل التذكرة #${ticketId}\n\n💡 الحل: ${solution}`,
        };
    }
};
exports.ITSupportService = ITSupportService;
exports.ITSupportService = ITSupportService = ITSupportService_1 = __decorate([
    (0, common_1.Injectable)()
], ITSupportService);
//# sourceMappingURL=it-support.service.js.map