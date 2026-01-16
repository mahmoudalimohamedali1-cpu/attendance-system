import { Injectable, Logger } from '@nestjs/common';

/**
 * 🤖 HR Assistant Service
 * Implements ideas #30-38: HR automation
 * 
 * Features:
 * - Benefits enrollment
 * - Leave balance inquiries
 * - Payslip requests
 * - HR FAQ
 */

export interface BenefitsInfo {
    type: string;
    typeAr: string;
    category: 'health' | 'insurance' | 'allowance' | 'leave' | 'other';
    description: string;
    eligibility: string;
    value?: string;
    enrolled: boolean;
}

export interface LeaveBalance {
    type: string;
    typeAr: string;
    total: number;
    used: number;
    pending: number;
    available: number;
    expiresAt?: Date;
}

export interface PayslipSummary {
    period: string;
    grossSalary: number;
    deductions: { name: string; amount: number }[];
    additions: { name: string; amount: number }[];
    netSalary: number;
    paymentDate: Date;
}

export interface HRFaq {
    question: string;
    questionAr: string;
    answer: string;
    answerAr: string;
    category: string;
}

@Injectable()
export class HRAssistantService {
    private readonly logger = new Logger(HRAssistantService.name);

    // Benefits catalog
    private readonly benefits: BenefitsInfo[] = [
        { type: 'medical', typeAr: 'التأمين الطبي', category: 'health', description: 'تغطية طبية شاملة للموظف وعائلته', eligibility: 'جميع الموظفين بعد فترة التجربة', value: 'فئة ب', enrolled: true },
        { type: 'dental', typeAr: 'تأمين الأسنان', category: 'health', description: 'تغطية علاجات الأسنان', eligibility: 'جميع الموظفين', value: 'حتى 5000 ر.س سنوياً', enrolled: true },
        { type: 'life', typeAr: 'التأمين على الحياة', category: 'insurance', description: 'تأمين على الحياة بقيمة 24 راتب', eligibility: 'جميع الموظفين', value: '24 راتب', enrolled: true },
        { type: 'housing', typeAr: 'بدل السكن', category: 'allowance', description: 'بدل سكن شهري', eligibility: 'جميع الموظفين', value: '25% من الراتب', enrolled: true },
        { type: 'transport', typeAr: 'بدل النقل', category: 'allowance', description: 'بدل مواصلات شهري', eligibility: 'جميع الموظفين', value: '500 ر.س', enrolled: true },
        { type: 'education', typeAr: 'دعم التعليم', category: 'other', description: 'دعم لتعليم الأبناء', eligibility: 'الموظفون بعد سنة', value: 'حتى 15000 ر.س سنوياً', enrolled: false },
        { type: 'gym', typeAr: 'عضوية النادي', category: 'other', description: 'عضوية نادي رياضي', eligibility: 'جميع الموظفين', value: 'خصم 50%', enrolled: false },
    ];

    // Leave types
    private readonly leaveTypes: { type: string; typeAr: string; days: number }[] = [
        { type: 'annual', typeAr: 'سنوية', days: 21 },
        { type: 'sick', typeAr: 'مرضية', days: 30 },
        { type: 'emergency', typeAr: 'طارئة', days: 5 },
        { type: 'marriage', typeAr: 'زواج', days: 5 },
        { type: 'paternity', typeAr: 'أبوة', days: 3 },
        { type: 'bereavement', typeAr: 'وفاة', days: 5 },
        { type: 'hajj', typeAr: 'حج', days: 15 },
    ];

    // HR FAQs
    private readonly faqs: HRFaq[] = [
        { question: 'working hours', questionAr: 'ساعات العمل', answer: '8 AM to 5 PM, Sunday to Thursday', answerAr: '8 صباحاً إلى 5 مساءً، الأحد إلى الخميس', category: 'general' },
        { question: 'probation', questionAr: 'فترة التجربة', answer: '3 months', answerAr: '3 شهور', category: 'contracts' },
        { question: 'notice period', questionAr: 'فترة الإشعار', answer: '30 days for employees, 60 days for managers', answerAr: '30 يوم للموظفين، 60 يوم للمديرين', category: 'contracts' },
        { question: 'salary day', questionAr: 'يوم الراتب', answer: '27th of each month', answerAr: '27 من كل شهر', category: 'payroll' },
        { question: 'overtime', questionAr: 'العمل الإضافي', answer: '150% for regular, 200% for holidays', answerAr: '150% للعادي، 200% للإجازات', category: 'payroll' },
    ];

    /**
     * 🎁 Get employee benefits
     */
    getBenefits(includeUnenrolled: boolean = true): BenefitsInfo[] {
        if (includeUnenrolled) {
            return this.benefits;
        }
        return this.benefits.filter(b => b.enrolled);
    }

    /**
     * 📅 Get leave balances
     */
    getLeaveBalances(yearsOfService: number = 2): LeaveBalance[] {
        return this.leaveTypes.map(lt => {
            // Adjust annual leave based on service
            const total = lt.type === 'annual' && yearsOfService >= 5 ? 30 : lt.days;
            const used = Math.floor(Math.random() * (total * 0.6));
            const pending = Math.floor(Math.random() * 3);

            return {
                type: lt.type,
                typeAr: lt.typeAr,
                total,
                used,
                pending,
                available: Math.max(0, total - used - pending),
            };
        });
    }

    /**
     * 💰 Get payslip summary
     */
    getPayslipSummary(salary: number = 10000): PayslipSummary {
        const deductions = [
            { name: 'التأمينات الاجتماعية', amount: Math.round(salary * 0.0975) },
            { name: 'ضريبة الدخل', amount: 0 }, // No income tax in KSA
        ];

        const additions = [
            { name: 'بدل السكن', amount: Math.round(salary * 0.25) },
            { name: 'بدل النقل', amount: 500 },
        ];

        const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
        const totalAdditions = additions.reduce((sum, a) => sum + a.amount, 0);

        return {
            period: new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' }),
            grossSalary: salary + totalAdditions,
            deductions,
            additions,
            netSalary: salary + totalAdditions - totalDeductions,
            paymentDate: new Date(new Date().getFullYear(), new Date().getMonth(), 27),
        };
    }

    /**
     * ❓ Answer HR FAQ
     */
    answerFaq(query: string): { found: boolean; answer?: string; category?: string } {
        const normalized = query.toLowerCase();

        for (const faq of this.faqs) {
            if (normalized.includes(faq.question) || query.includes(faq.questionAr)) {
                return {
                    found: true,
                    answer: `❓ **${faq.questionAr}**\n\n${faq.answerAr}`,
                    category: faq.category,
                };
            }
        }

        return { found: false };
    }

    /**
     * 📊 Format benefits
     */
    formatBenefits(): string {
        let message = '🎁 **مزايا الموظفين:**\n\n';

        const categories: Record<string, string> = {
            health: 'الصحة',
            insurance: 'التأمين',
            allowance: 'البدلات',
            leave: 'الإجازات',
            other: 'أخرى',
        };

        const grouped = this.benefits.reduce((acc, b) => {
            if (!acc[b.category]) acc[b.category] = [];
            acc[b.category].push(b);
            return acc;
        }, {} as Record<string, BenefitsInfo[]>);

        for (const [category, benefits] of Object.entries(grouped)) {
            message += `**${categories[category]}:**\n`;
            for (const benefit of benefits) {
                const status = benefit.enrolled ? '✅' : '⭕';
                message += `${status} ${benefit.typeAr}`;
                if (benefit.value) message += ` (${benefit.value})`;
                message += '\n';
            }
            message += '\n';
        }

        return message;
    }

    /**
     * 📊 Format leave balances
     */
    formatLeaveBalances(yearsOfService: number = 2): string {
        const balances = this.getLeaveBalances(yearsOfService);

        let message = '📅 **رصيد إجازاتك:**\n\n';

        for (const balance of balances) {
            const percentage = Math.round((balance.available / balance.total) * 100);
            const bar = this.getProgressBar(percentage);

            message += `📋 **${balance.typeAr}**\n`;
            message += `   ${bar} ${balance.available}/${balance.total} يوم\n`;
            if (balance.pending > 0) {
                message += `   ⏳ معلق: ${balance.pending} يوم\n`;
            }
            message += '\n';
        }

        return message;
    }

    private getProgressBar(percent: number): string {
        const filled = Math.floor(percent / 10);
        const empty = 10 - filled;
        return '▓'.repeat(filled) + '░'.repeat(empty);
    }

    /**
     * 📊 Format payslip
     */
    formatPayslip(salary: number = 10000): string {
        const payslip = this.getPayslipSummary(salary);

        let message = `💰 **كشف الراتب - ${payslip.period}**\n\n`;

        message += `📊 **الراتب الإجمالي:** ${payslip.grossSalary.toLocaleString()} ر.س\n\n`;

        message += `➕ **الإضافات:**\n`;
        for (const add of payslip.additions) {
            message += `   • ${add.name}: ${add.amount.toLocaleString()} ر.س\n`;
        }

        message += `\n➖ **الخصومات:**\n`;
        for (const ded of payslip.deductions) {
            message += `   • ${ded.name}: ${ded.amount.toLocaleString()} ر.س\n`;
        }

        message += `\n💵 **صافي الراتب:** ${payslip.netSalary.toLocaleString()} ر.س\n`;
        message += `📅 تاريخ الصرف: ${payslip.paymentDate.toLocaleDateString('ar-SA')}`;

        return message;
    }

    /**
     * 📋 Get common HR requests
     */
    formatHRMenu(): string {
        return `🤖 **خدمات الموارد البشرية:**

📅 **الإجازات:**
• "رصيد إجازاتي" - عرض الرصيد
• "طلب إجازة" - تقديم طلب

💰 **الرواتب:**
• "كشف راتبي" - عرض آخر راتب
• "شهادة راتب" - طلب شهادة

🎁 **المزايا:**
• "مزاياي" - عرض المزايا
• "التأمين الطبي" - معلومات التأمين

📋 **خدمات أخرى:**
• "خطاب تعريف" - طلب خطاب
• "تحديث بياناتي" - تحديث المعلومات`;
    }
}
