import { Injectable, Logger } from '@nestjs/common';

/**
 * 🧠 Natural Language Query Service
 * Implements idea #176: Natural language to database queries
 * 
 * Pattern-based query interpretation for Arabic/English requests.
 * Provides query examples and formatting utilities.
 */

export interface QueryResult {
    success: boolean;
    data: any[];
    count: number;
    query: string;
    naturalLanguage: string;
}

export interface QueryPattern {
    pattern: RegExp;
    description: string;
    descriptionAr: string;
    example: string;
}

@Injectable()
export class NaturalLanguageQueryService {
    private readonly logger = new Logger(NaturalLanguageQueryService.name);

    // Pre-defined query patterns
    private readonly queryPatterns: QueryPattern[] = [
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

    /**
     * 🔍 Identify query type from natural language
     */
    identifyQuery(naturalQuery: string): { matched: boolean; pattern?: QueryPattern } {
        const normalized = this.normalizeArabic(naturalQuery.toLowerCase());

        for (const pattern of this.queryPatterns) {
            if (pattern.pattern.test(normalized)) {
                return { matched: true, pattern };
            }
        }

        return { matched: false };
    }

    /**
     * 📝 Format result as message
     */
    formatResult(result: QueryResult): string {
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
        } else if (firstItem.present !== undefined) {
            message += `✅ حاضر: ${firstItem.present}\n`;
            message += `❌ غائب: ${firstItem.absent}\n`;
            message += `⏰ متأخر: ${firstItem.late}\n`;
            message += `📊 الإجمالي: ${firstItem.total}`;
        } else if (firstItem.average !== undefined) {
            message += `📈 المتوسط: ${Math.round(firstItem.average).toLocaleString()} ر.س\n`;
            message += `⬆️ الأعلى: ${Math.round(firstItem.max).toLocaleString()} ر.س\n`;
            message += `⬇️ الأدنى: ${Math.round(firstItem.min).toLocaleString()} ر.س`;
        } else if (firstItem.firstName) {
            message += `العدد: ${result.count}\n\n`;
            const list = result.data.slice(0, 10).map((emp: any, i: number) => {
                const name = `${emp.firstName} ${emp.lastName}`;
                const dept = emp.department?.name || emp.department || '';
                return `${i + 1}. ${name}${dept ? ` - ${dept}` : ''}`;
            });
            message += list.join('\n');
            if (result.count > 10) {
                message += `\n\n... و ${result.count - 10} آخرين`;
            }
        } else {
            message += `العدد: ${result.count}`;
        }

        return message;
    }

    /**
     * 🔤 Normalize Arabic text
     */
    private normalizeArabic(text: string): string {
        return text
            .replace(/[أإآ]/g, 'ا')
            .replace(/ة/g, 'ه')
            .replace(/ى/g, 'ي')
            .replace(/[ًٌٍَُِّْ]/g, '');
    }

    /**
     * 📋 Get available query examples
     */
    getQueryExamples(): string[] {
        return this.queryPatterns.map(p => p.example);
    }

    /**
     * 📋 Get help message
     */
    getHelpMessage(): string {
        let message = '📋 **الاستعلامات المتاحة:**\n\n';

        for (const pattern of this.queryPatterns) {
            message += `• ${pattern.descriptionAr}: "${pattern.example}"\n`;
        }

        return message;
    }
}
