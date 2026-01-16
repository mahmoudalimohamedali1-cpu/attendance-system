"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var HRAssistantService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HRAssistantService = void 0;
const common_1 = require("@nestjs/common");
let HRAssistantService = HRAssistantService_1 = class HRAssistantService {
    constructor() {
        this.logger = new common_1.Logger(HRAssistantService_1.name);
        this.benefits = [
            { type: 'medical', typeAr: 'التأمين الطبي', category: 'health', description: 'تغطية طبية شاملة للموظف وعائلته', eligibility: 'جميع الموظفين بعد فترة التجربة', value: 'فئة ب', enrolled: true },
            { type: 'dental', typeAr: 'تأمين الأسنان', category: 'health', description: 'تغطية علاجات الأسنان', eligibility: 'جميع الموظفين', value: 'حتى 5000 ر.س سنوياً', enrolled: true },
            { type: 'life', typeAr: 'التأمين على الحياة', category: 'insurance', description: 'تأمين على الحياة بقيمة 24 راتب', eligibility: 'جميع الموظفين', value: '24 راتب', enrolled: true },
            { type: 'housing', typeAr: 'بدل السكن', category: 'allowance', description: 'بدل سكن شهري', eligibility: 'جميع الموظفين', value: '25% من الراتب', enrolled: true },
            { type: 'transport', typeAr: 'بدل النقل', category: 'allowance', description: 'بدل مواصلات شهري', eligibility: 'جميع الموظفين', value: '500 ر.س', enrolled: true },
            { type: 'education', typeAr: 'دعم التعليم', category: 'other', description: 'دعم لتعليم الأبناء', eligibility: 'الموظفون بعد سنة', value: 'حتى 15000 ر.س سنوياً', enrolled: false },
            { type: 'gym', typeAr: 'عضوية النادي', category: 'other', description: 'عضوية نادي رياضي', eligibility: 'جميع الموظفين', value: 'خصم 50%', enrolled: false },
        ];
        this.leaveTypes = [
            { type: 'annual', typeAr: 'سنوية', days: 21 },
            { type: 'sick', typeAr: 'مرضية', days: 30 },
            { type: 'emergency', typeAr: 'طارئة', days: 5 },
            { type: 'marriage', typeAr: 'زواج', days: 5 },
            { type: 'paternity', typeAr: 'أبوة', days: 3 },
            { type: 'bereavement', typeAr: 'وفاة', days: 5 },
            { type: 'hajj', typeAr: 'حج', days: 15 },
        ];
        this.faqs = [
            { question: 'working hours', questionAr: 'ساعات العمل', answer: '8 AM to 5 PM, Sunday to Thursday', answerAr: '8 صباحاً إلى 5 مساءً، الأحد إلى الخميس', category: 'general' },
            { question: 'probation', questionAr: 'فترة التجربة', answer: '3 months', answerAr: '3 شهور', category: 'contracts' },
            { question: 'notice period', questionAr: 'فترة الإشعار', answer: '30 days for employees, 60 days for managers', answerAr: '30 يوم للموظفين، 60 يوم للمديرين', category: 'contracts' },
            { question: 'salary day', questionAr: 'يوم الراتب', answer: '27th of each month', answerAr: '27 من كل شهر', category: 'payroll' },
            { question: 'overtime', questionAr: 'العمل الإضافي', answer: '150% for regular, 200% for holidays', answerAr: '150% للعادي، 200% للإجازات', category: 'payroll' },
        ];
    }
    getBenefits(includeUnenrolled = true) {
        if (includeUnenrolled) {
            return this.benefits;
        }
        return this.benefits.filter(b => b.enrolled);
    }
    getLeaveBalances(yearsOfService = 2) {
        return this.leaveTypes.map(lt => {
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
    getPayslipSummary(salary = 10000) {
        const deductions = [
            { name: 'التأمينات الاجتماعية', amount: Math.round(salary * 0.0975) },
            { name: 'ضريبة الدخل', amount: 0 },
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
    answerFaq(query) {
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
    formatBenefits() {
        let message = '🎁 **مزايا الموظفين:**\n\n';
        const categories = {
            health: 'الصحة',
            insurance: 'التأمين',
            allowance: 'البدلات',
            leave: 'الإجازات',
            other: 'أخرى',
        };
        const grouped = this.benefits.reduce((acc, b) => {
            if (!acc[b.category])
                acc[b.category] = [];
            acc[b.category].push(b);
            return acc;
        }, {});
        for (const [category, benefits] of Object.entries(grouped)) {
            message += `**${categories[category]}:**\n`;
            for (const benefit of benefits) {
                const status = benefit.enrolled ? '✅' : '⭕';
                message += `${status} ${benefit.typeAr}`;
                if (benefit.value)
                    message += ` (${benefit.value})`;
                message += '\n';
            }
            message += '\n';
        }
        return message;
    }
    formatLeaveBalances(yearsOfService = 2) {
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
    getProgressBar(percent) {
        const filled = Math.floor(percent / 10);
        const empty = 10 - filled;
        return '▓'.repeat(filled) + '░'.repeat(empty);
    }
    formatPayslip(salary = 10000) {
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
    formatHRMenu() {
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
};
exports.HRAssistantService = HRAssistantService;
exports.HRAssistantService = HRAssistantService = HRAssistantService_1 = __decorate([
    (0, common_1.Injectable)()
], HRAssistantService);
//# sourceMappingURL=hr-assistant.service.js.map