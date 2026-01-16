"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var DocumentFinderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentFinderService = void 0;
const common_1 = require("@nestjs/common");
let DocumentFinderService = DocumentFinderService_1 = class DocumentFinderService {
    constructor() {
        this.logger = new common_1.Logger(DocumentFinderService_1.name);
        this.documents = [
            { id: '1', name: 'Employee Handbook', nameAr: 'دليل الموظف', category: 'policy', categoryAr: 'سياسات', description: 'الدليل الشامل للموظفين', keywords: ['دليل', 'سياسة', 'قوانين', 'handbook'], lastUpdated: new Date() },
            { id: '2', name: 'Leave Policy', nameAr: 'سياسة الإجازات', category: 'policy', categoryAr: 'سياسات', description: 'أنواع الإجازات وشروطها', keywords: ['إجازة', 'اجازة', 'leave', 'عطلة'], lastUpdated: new Date() },
            { id: '3', name: 'Attendance Policy', nameAr: 'سياسة الحضور', category: 'policy', categoryAr: 'سياسات', description: 'قواعد الحضور والانصراف', keywords: ['حضور', 'دوام', 'تأخير', 'attendance'], lastUpdated: new Date() },
            { id: '4', name: 'Code of Conduct', nameAr: 'ميثاق السلوك', category: 'policy', categoryAr: 'سياسات', description: 'قواعد السلوك المهني', keywords: ['سلوك', 'أخلاق', 'conduct'], lastUpdated: new Date() },
            { id: '5', name: 'Remote Work Policy', nameAr: 'سياسة العمل عن بعد', category: 'policy', categoryAr: 'سياسات', description: 'شروط العمل من المنزل', keywords: ['عن بعد', 'منزل', 'remote', 'home'], lastUpdated: new Date() },
            { id: '6', name: 'Leave Request Form', nameAr: 'نموذج طلب إجازة', category: 'form', categoryAr: 'نماذج', description: 'نموذج تقديم طلب إجازة', keywords: ['طلب', 'إجازة', 'نموذج', 'form'], lastUpdated: new Date() },
            { id: '7', name: 'Expense Claim Form', nameAr: 'نموذج المطالبات المالية', category: 'form', categoryAr: 'نماذج', description: 'نموذج صرف المصروفات', keywords: ['مصاريف', 'expense', 'مالية', 'صرف'], lastUpdated: new Date() },
            { id: '8', name: 'Resignation Form', nameAr: 'نموذج الاستقالة', category: 'form', categoryAr: 'نماذج', description: 'نموذج تقديم الاستقالة', keywords: ['استقالة', 'resignation', 'ترك'], lastUpdated: new Date() },
            { id: '9', name: 'Training Request', nameAr: 'نموذج طلب تدريب', category: 'form', categoryAr: 'نماذج', description: 'طلب حضور دورة تدريبية', keywords: ['تدريب', 'دورة', 'training'], lastUpdated: new Date() },
            { id: '10', name: 'New Employee Guide', nameAr: 'دليل الموظف الجديد', category: 'guide', categoryAr: 'أدلة', description: 'دليل التهيئة للموظفين الجدد', keywords: ['جديد', 'تهيئة', 'onboarding'], lastUpdated: new Date() },
            { id: '11', name: 'IT Security Guide', nameAr: 'دليل الأمن المعلوماتي', category: 'guide', categoryAr: 'أدلة', description: 'إرشادات أمن المعلومات', keywords: ['أمن', 'security', 'معلومات'], lastUpdated: new Date() },
            { id: '12', name: 'Benefits Guide', nameAr: 'دليل المزايا', category: 'guide', categoryAr: 'أدلة', description: 'شرح مزايا الموظفين', keywords: ['مزايا', 'تأمين', 'benefits'], lastUpdated: new Date() },
            { id: '13', name: 'Employment Contract', nameAr: 'عقد العمل', category: 'contract', categoryAr: 'عقود', description: 'نموذج عقد العمل', keywords: ['عقد', 'contract', 'توظيف'], lastUpdated: new Date() },
            { id: '14', name: 'NDA Template', nameAr: 'اتفاقية السرية', category: 'contract', categoryAr: 'عقود', description: 'نموذج اتفاقية عدم الإفصاح', keywords: ['سرية', 'nda', 'إفصاح'], lastUpdated: new Date() },
        ];
        this.templates = [
            {
                id: '1',
                name: 'Salary Certificate',
                nameAr: 'شهادة راتب',
                type: 'certificate',
                typeAr: 'شهادة',
                fields: [
                    { name: 'employeeName', nameAr: 'اسم الموظف', type: 'text', required: true },
                    { name: 'employeeId', nameAr: 'الرقم الوظيفي', type: 'text', required: true },
                    { name: 'salary', nameAr: 'الراتب', type: 'number', required: true },
                    { name: 'issueDate', nameAr: 'تاريخ الإصدار', type: 'date', required: true },
                ],
                content: 'نشهد بأن السيد/ة [employeeName] يعمل لدينا براتب شهري قدره [salary] ريال',
            },
            {
                id: '2',
                name: 'Employment Letter',
                nameAr: 'خطاب تعريف بالعمل',
                type: 'letter',
                typeAr: 'خطاب',
                fields: [
                    { name: 'employeeName', nameAr: 'اسم الموظف', type: 'text', required: true },
                    { name: 'jobTitle', nameAr: 'المسمى الوظيفي', type: 'text', required: true },
                    { name: 'startDate', nameAr: 'تاريخ البداية', type: 'date', required: true },
                    { name: 'addressTo', nameAr: 'لمن يهمه الأمر', type: 'text', required: false },
                ],
                content: 'نفيد بأن [employeeName] يعمل لدينا بمسمى [jobTitle] منذ [startDate]',
            },
            {
                id: '3',
                name: 'Experience Certificate',
                nameAr: 'شهادة خبرة',
                type: 'certificate',
                typeAr: 'شهادة',
                fields: [
                    { name: 'employeeName', nameAr: 'اسم الموظف', type: 'text', required: true },
                    { name: 'jobTitle', nameAr: 'المسمى الوظيفي', type: 'text', required: true },
                    { name: 'startDate', nameAr: 'تاريخ البداية', type: 'date', required: true },
                    { name: 'endDate', nameAr: 'تاريخ النهاية', type: 'date', required: true },
                ],
                content: 'نشهد بأن [employeeName] عمل لدينا بمسمى [jobTitle] من [startDate] حتى [endDate]',
            },
        ];
    }
    searchDocuments(query) {
        const normalized = this.normalizeArabic(query.toLowerCase());
        return this.documents.filter(doc => {
            const searchText = `${doc.name} ${doc.nameAr} ${doc.description} ${doc.keywords.join(' ')}`.toLowerCase();
            const normalizedSearch = this.normalizeArabic(searchText);
            return normalizedSearch.includes(normalized);
        });
    }
    normalizeArabic(text) {
        return text
            .replace(/[أإآ]/g, 'ا')
            .replace(/ة/g, 'ه')
            .replace(/ى/g, 'ي');
    }
    getByCategory(category) {
        return this.documents.filter(doc => doc.category === category);
    }
    getTemplates() {
        return this.templates;
    }
    generateFromTemplate(templateId, data) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) {
            return { success: false, message: '❌ القالب غير موجود' };
        }
        for (const field of template.fields.filter(f => f.required)) {
            if (!data[field.name]) {
                return { success: false, message: `❌ الحقل "${field.nameAr}" مطلوب` };
            }
        }
        let content = template.content;
        for (const [key, value] of Object.entries(data)) {
            content = content.replace(new RegExp(`\\[${key}\\]`, 'g'), value);
        }
        return {
            success: true,
            content,
            message: `✅ تم إنشاء "${template.nameAr}"`,
        };
    }
    formatSearchResults(query) {
        const results = this.searchDocuments(query);
        if (results.length === 0) {
            return `❌ لم أجد مستند يطابق "${query}"\n\nجرب:\n• دليل الموظف\n• سياسة الإجازات\n• عقد العمل`;
        }
        let message = `📄 **نتائج البحث عن "${query}":**\n\n`;
        for (const doc of results.slice(0, 5)) {
            const categoryEmoji = {
                policy: '📋',
                form: '📝',
                template: '📄',
                guide: '📚',
                contract: '📑',
                legal: '⚖️',
            }[doc.category];
            message += `${categoryEmoji} **${doc.nameAr}**\n`;
            message += `   ${doc.description}\n`;
            message += `   📁 ${doc.categoryAr}\n\n`;
        }
        return message;
    }
    formatTemplates() {
        let message = '📝 **القوالب المتاحة:**\n\n';
        for (const template of this.templates) {
            message += `📄 **${template.nameAr}** (${template.typeAr})\n`;
            message += `   الحقول: ${template.fields.map(f => f.nameAr).join(', ')}\n\n`;
        }
        message += '💡 قل "أنشئ [اسم القالب]" لإنشاء مستند';
        return message;
    }
    getCategorySummary() {
        const counts = {
            policy: { nameAr: 'سياسات', count: 0 },
            form: { nameAr: 'نماذج', count: 0 },
            guide: { nameAr: 'أدلة', count: 0 },
            contract: { nameAr: 'عقود', count: 0 },
        };
        for (const doc of this.documents) {
            if (counts[doc.category]) {
                counts[doc.category].count++;
            }
        }
        let message = '📂 **المستندات المتاحة:**\n\n';
        for (const [, data] of Object.entries(counts)) {
            message += `📁 ${data.nameAr}: ${data.count} مستند\n`;
        }
        message += '\n💡 قل "ابحث عن [الكلمة]" للبحث';
        return message;
    }
};
exports.DocumentFinderService = DocumentFinderService;
exports.DocumentFinderService = DocumentFinderService = DocumentFinderService_1 = __decorate([
    (0, common_1.Injectable)()
], DocumentFinderService);
//# sourceMappingURL=document-finder.service.js.map