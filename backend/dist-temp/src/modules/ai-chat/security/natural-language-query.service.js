"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var NaturalLanguageQueryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NaturalLanguageQueryService = void 0;
const common_1 = require("@nestjs/common");
let NaturalLanguageQueryService = NaturalLanguageQueryService_1 = class NaturalLanguageQueryService {
    constructor() {
        this.logger = new common_1.Logger(NaturalLanguageQueryService_1.name);
        this.queryPatterns = [
            { pattern: /كم\s+(موظف|عامل)/i, description: 'Employee count', descriptionAr: 'عدد الموظفين', example: 'كم موظف عندنا؟' },
            { pattern: /من\s+(تأخر|متأخر)/i, description: 'Late employees', descriptionAr: 'المتأخرين', example: 'من تأخر اليوم؟' },
            { pattern: /من\s+(غايب|غاب)/i, description: 'Absent employees', descriptionAr: 'الغائبين', example: 'من غاب اليوم؟' },
            { pattern: /طلبات?\s+(الإجازة|اجازة)/i, description: 'Leave requests', descriptionAr: 'طلبات الإجازة', example: 'طلبات الإجازة المعلقة' },
            { pattern: /(حضور|الحضور)\s+(اليوم)/i, description: 'Today attendance', descriptionAr: 'حضور اليوم', example: 'حضور اليوم' },
            { pattern: /(الموظفين|موظفين)\s+(الجدد|جدد)/i, description: 'New employees', descriptionAr: 'الموظفين الجدد', example: 'الموظفين الجدد' },
            { pattern: /(متوسط|معدل)\s+(الرواتب)/i, description: 'Average salary', descriptionAr: 'متوسط الرواتب', example: 'متوسط الرواتب' },
            { pattern: /(الأقسام|الاقسام)/i, description: 'Departments list', descriptionAr: 'قائمة الأقسام', example: 'قائمة الأقسام' },
            { pattern: /موظف(ين)?\s+(قسم|في)\s+(.+)/i, description: 'Department employees', descriptionAr: 'موظفين القسم', example: 'موظفين قسم المبيعات' },
            { pattern: /(أعياد ميلاد|ميلاد)\s+(الشهر)/i, description: 'Birthdays', descriptionAr: 'أعياد الميلاد', example: 'أعياد ميلاد الشهر' },
        ];
    }
    identifyQuery(naturalQuery) {
        const normalized = this.normalizeArabic(naturalQuery.toLowerCase());
        for (const pattern of this.queryPatterns) {
            if (pattern.pattern.test(normalized)) {
                return { matched: true, pattern };
            }
        }
        return { matched: false };
    }
    formatResult(result) {
        if (!result.success) {
            return `❌ لم أتمكن من فهم الطلب: "${result.naturalLanguage}"\n\nجرب:\n• كم موظف\n• من تأخر اليوم\n• طلبات الإجازة`;
        }
        let message = `📊 **${result.query}**\n\n`;
        if (result.count === 0) {
            message += 'لا توجد نتائج';
            return message;
        }
        const firstItem = result.data[0];
        if (typeof firstItem === 'number') {
            message += `العدد: **${firstItem}**`;
        }
        else if (firstItem.present !== undefined) {
            message += `✅ حاضر: ${firstItem.present}\n`;
            message += `❌ غائب: ${firstItem.absent}\n`;
            message += `⏰ متأخر: ${firstItem.late}\n`;
            message += `📊 الإجمالي: ${firstItem.total}`;
        }
        else if (firstItem.average !== undefined) {
            message += `📈 المتوسط: ${Math.round(firstItem.average).toLocaleString()} ر.س\n`;
            message += `⬆️ الأعلى: ${Math.round(firstItem.max).toLocaleString()} ر.س\n`;
            message += `⬇️ الأدنى: ${Math.round(firstItem.min).toLocaleString()} ر.س`;
        }
        else if (firstItem.firstName) {
            message += `العدد: ${result.count}\n\n`;
            const list = result.data.slice(0, 10).map((emp, i) => {
                const name = `${emp.firstName} ${emp.lastName}`;
                const dept = emp.department?.name || emp.department || '';
                return `${i + 1}. ${name}${dept ? ` - ${dept}` : ''}`;
            });
            message += list.join('\n');
            if (result.count > 10) {
                message += `\n\n... و ${result.count - 10} آخرين`;
            }
        }
        else {
            message += `العدد: ${result.count}`;
        }
        return message;
    }
    normalizeArabic(text) {
        return text
            .replace(/[أإآ]/g, 'ا')
            .replace(/ة/g, 'ه')
            .replace(/ى/g, 'ي')
            .replace(/[ًٌٍَُِّْ]/g, '');
    }
    getQueryExamples() {
        return this.queryPatterns.map(p => p.example);
    }
    getHelpMessage() {
        let message = '📋 **الاستعلامات المتاحة:**\n\n';
        for (const pattern of this.queryPatterns) {
            message += `• ${pattern.descriptionAr}: "${pattern.example}"\n`;
        }
        return message;
    }
};
exports.NaturalLanguageQueryService = NaturalLanguageQueryService;
exports.NaturalLanguageQueryService = NaturalLanguageQueryService = NaturalLanguageQueryService_1 = __decorate([
    (0, common_1.Injectable)()
], NaturalLanguageQueryService);
//# sourceMappingURL=natural-language-query.service.js.map