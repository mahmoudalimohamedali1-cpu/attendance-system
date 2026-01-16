import { Injectable, Logger } from '@nestjs/common';

/**
 * 🔧 IT Support Service
 * Implements idea #23: IT ticket creator
 * 
 * Features:
 * - Auto-create IT tickets from chat
 * - Common issue detection
 * - Self-service solutions
 * - Ticket status tracking
 */

export interface ITTicket {
    id: string;
    userId: string;
    userName: string;
    category: 'hardware' | 'software' | 'network' | 'access' | 'email' | 'other';
    categoryAr: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    createdAt: Date;
    resolvedAt?: Date;
    solution?: string;
}

export interface SelfServiceSolution {
    issue: string;
    issueAr: string;
    steps: string[];
    videoUrl?: string;
}

@Injectable()
export class ITSupportService {
    private readonly logger = new Logger(ITSupportService.name);

    // In-memory tickets
    private tickets: Map<string, ITTicket> = new Map();

    // Issue patterns for auto-categorization
    private readonly issuePatterns: { pattern: RegExp; category: ITTicket['category']; priority: ITTicket['priority'] }[] = [
        { pattern: /لابتوب|كمبيوتر|شاشة|كيبورد|ماوس|طابعة/i, category: 'hardware', priority: 'medium' },
        { pattern: /برنامج|تطبيق|ويندوز|اوفيس|excel|word/i, category: 'software', priority: 'low' },
        { pattern: /انترنت|واي فاي|wifi|شبكة|بطيء/i, category: 'network', priority: 'high' },
        { pattern: /صلاحية|دخول|رقم سري|باسورد|password|login/i, category: 'access', priority: 'high' },
        { pattern: /ايميل|email|outlook|بريد/i, category: 'email', priority: 'medium' },
    ];

    // Category names in Arabic
    private readonly categoryNames: Record<ITTicket['category'], string> = {
        hardware: 'أجهزة',
        software: 'برامج',
        network: 'شبكة',
        access: 'صلاحيات',
        email: 'بريد إلكتروني',
        other: 'أخرى',
    };

    // Self-service solutions
    private readonly selfServiceSolutions: SelfServiceSolution[] = [
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

    /**
     * 🎫 Create IT ticket from message
     */
    createTicket(
        userId: string,
        userName: string,
        message: string
    ): { success: boolean; ticket?: ITTicket; message: string; selfService?: SelfServiceSolution } {
        // Try to find self-service solution first
        const selfService = this.findSelfServiceSolution(message);
        if (selfService) {
            return {
                success: true,
                message: `💡 **حل سريع: ${selfService.issueAr}**\n\n${selfService.steps.join('\n')}\n\n❓ هل تريد فتح تذكرة؟`,
                selfService,
            };
        }

        // Auto-categorize
        const { category, priority } = this.categorizeIssue(message);

        const ticketId = `IT-${Date.now().toString(36).toUpperCase()}`;

        const ticket: ITTicket = {
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

    private categorizeIssue(message: string): { category: ITTicket['category']; priority: ITTicket['priority'] } {
        for (const { pattern, category, priority } of this.issuePatterns) {
            if (pattern.test(message)) {
                return { category, priority };
            }
        }
        return { category: 'other', priority: 'low' };
    }

    private findSelfServiceSolution(message: string): SelfServiceSolution | null {
        const lowerMsg = message.toLowerCase();

        if (/بطيء|بطي|slow/.test(lowerMsg)) return this.selfServiceSolutions[0];
        if (/نسيت|باسورد|password|كلمة.*مرور/.test(lowerMsg)) return this.selfServiceSolutions[1];
        if (/واي.*فاي|wifi|انترنت/.test(lowerMsg)) return this.selfServiceSolutions[2];
        if (/طابعة|printer/.test(lowerMsg)) return this.selfServiceSolutions[3];
        if (/ايميل|بريد|outlook/.test(lowerMsg)) return this.selfServiceSolutions[4];

        return null;
    }

    private getPriorityAr(priority: ITTicket['priority']): string {
        return { low: 'منخفضة', medium: 'متوسطة', high: 'عالية', critical: 'حرجة' }[priority];
    }

    /**
     * 📋 Get user's tickets
     */
    getUserTickets(userId: string): ITTicket[] {
        const userTickets: ITTicket[] = [];
        for (const [, ticket] of this.tickets) {
            if (ticket.userId === userId) {
                userTickets.push(ticket);
            }
        }
        return userTickets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    /**
     * 📊 Format tickets as message
     */
    formatTickets(userId: string): string {
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

    /**
     * ✅ Resolve ticket
     */
    resolveTicket(ticketId: string, solution: string): { success: boolean; message: string } {
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
}
