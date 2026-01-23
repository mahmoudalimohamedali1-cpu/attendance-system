import { Injectable, Logger } from '@nestjs/common';
import { ParsedPolicyRule } from '../../ai/services/policy-parser.service';

/**
 * محرك تحليل اللغة الطبيعية للسياسات (Arabic NLP Engine)
 * يعمل محلياً بدون تكلفة OpenAI
 */
@Injectable()
export class NLPParserService {
    private readonly logger = new Logger(NLPParserService.name);

    // قاموس المصطلحات والحقول (Entities)
    private readonly FIELDS_MAP: Record<string, string> = {
        'راتب': 'contract.totalSalary',
        'الراتب': 'contract.totalSalary',
        'اساسي': 'contract.basicSalary',
        'أساسي': 'contract.basicSalary',
        'اجمالي': 'contract.totalSalary',
        'إجمالي': 'contract.totalSalary',
        'تأخير': 'attendance.currentPeriod.lateMinutes',
        'تاخير': 'attendance.currentPeriod.lateMinutes',
        'غياب': 'attendance.currentPeriod.absentDays',
        'غاب': 'attendance.currentPeriod.absentDays',
        'حضور': 'attendance.currentPeriod.attendancePercentage',
        'بدرى': 'attendance.currentPeriod.earlyArrivalMinutes',
        'مبكر': 'attendance.currentPeriod.earlyArrivalMinutes',
        'عهدة': 'custody.returnStatus',
        'عهده': 'custody.returnStatus',
        'العهدة': 'custody.returnStatus',
        'العهده': 'custody.returnStatus',
        'لفت نظر': 'disciplinary.activeWarnings',
        'إنذار': 'disciplinary.activeWarnings',
        'انذار': 'disciplinary.activeWarnings',
        'مخالفة': 'disciplinary.totalCases',
        'خدمة': 'employee.tenure.years',
        'سنة': 'employee.tenure.years',
        'شهر': 'employee.tenure.months',
    };

    // قاموس المعاملات (Operators)
    private readonly OPERATORS_MAP: Array<{ keywords: string[], op: string }> = [
        { keywords: ['أكبر', 'اكثر', 'فوق', 'يزيد', 'تجاوز'], op: 'GREATER_THAN' },
        { keywords: ['أقل', 'اقل', 'تحت', 'ينقص', 'قبل'], op: 'LESS_THAN' },
        { keywords: ['يساوي', 'بالضبط'], op: 'EQUALS' },
        { keywords: ['من بين', 'ما بين', 'بين', 'بـ', 'خلال'], op: 'GREATER_THAN_OR_EQUAL' },
    ];

    // قاموس الإجراءات (Actions)
    private readonly ACTIONS_MAP: Array<{ keywords: string[], type: string }> = [
        { keywords: ['حافز', 'مكافأة', 'مكافاه', 'بونص', 'ينزل', 'يصرف', 'إضافة', 'اضافة', 'ضيف', 'زود'], type: 'ADD_TO_PAYROLL' },
        { keywords: ['خصم', 'جزاء', 'عقوبة', 'يخصم', 'نقص', 'قص', 'ينقص'], type: 'DEDUCT_FROM_PAYROLL' },
        { keywords: ['تنبيه', 'إشعار', 'رسالة'], type: 'SEND_NOTIFICATION' },
    ];

    /**
     * التحليل الرئيسي للنص
     */
    parse(text: string): ParsedPolicyRule {
        const safeText = text.toLowerCase().trim();
        this.logger.log(`NLP Parsing: "${safeText}"`);

        const result: ParsedPolicyRule = {
            understood: false,
            trigger: { event: 'PAYROLL' },
            conditions: [],
            actions: [],
            scope: { type: 'ALL_EMPLOYEES' },
            explanation: '',
            clarificationNeeded: null as any,
        };

        // 1. تنظيف النص وتحويل الأرقام المكتوبة كلمات لأرقام
        const preparedText = this.prepareText(safeText);

        // 2. استخراج الأرقام مع سياقها (وتجنب التواريخ)
        const numbers = this.extractNumbersWithContext(preparedText);
        let conditionValueObj = numbers.find(n => n.context === 'condition');
        const actionValueObj = numbers.find(n => n.context === 'action');

        // 3. محاولة فهم الشرط
        let conditionField: string | null = null;
        if (conditionValueObj) {
            conditionField = this.detectFieldInSnippet(conditionValueObj.surrounding);
        }
        if (!conditionField) {
            conditionField = this.detectField(preparedText, ['salary', 'راتب']);
        }

        // تحسين للجزاءات والعهد
        if (!conditionField) {
            const specialTerms = ['لفت نظر', 'إنذار', 'انذار', 'مخالفة', 'عهدة', 'عهده'];
            for (const term of specialTerms) {
                if (preparedText.includes(term)) {
                    conditionField = this.FIELDS_MAP[term];
                    // إذا لم نجد رقماً صريحاً ولكننا في سياق جزاءات/عهد، نفترض الرقما الافتراضي 1 (إلا لو في تاريخ)
                    if (!conditionValueObj && !preparedText.match(/\d{1,2}[-/]\d{1,2}/)) {
                        conditionValueObj = { value: 1, context: 'condition', surrounding: term, position: -1 };
                    }
                    break;
                }
            }
        }

        const operator = this.detectOperator(preparedText);

        if (conditionField && conditionValueObj) {
            result.conditions.push({
                field: conditionField,
                operator: (operator as any) || 'GREATER_THAN_OR_EQUAL',
                value: conditionValueObj.value,
            });
        }

        // 4. محاولة فهم الإجراء
        const actionType = this.detectAction(preparedText);
        let actionVal = actionValueObj?.value;

        if (actionType && !actionVal) {
            const spareNum = numbers.find(n => n.context === 'none');
            if (spareNum) actionVal = spareNum.value;
        }

        if (actionType && actionVal) {
            const isPerUnit = preparedText.includes('لكل') || preparedText.includes('عن كل');
            result.actions.push({
                type: actionType as any,
                valueType: 'FIXED',
                value: actionVal,
                description: isPerUnit ? `يخصم لكل وحدة (تكرار)` : `مبلغ ثابت`,
            });
        }

        // 5. تحديد الحدث (Trigger)
        if (preparedText.includes('حضور') || preparedText.includes('تأخير') || preparedText.includes('غياب')) {
            result.trigger.event = 'ATTENDANCE';
        } else if (preparedText.includes('انذار') || preparedText.includes('إنذار') || preparedText.includes('جزاء')) {
            result.trigger.event = 'DISCIPLINARY';
        } else if (preparedText.includes('عهدة') || preparedText.includes('عهده')) {
            result.trigger.event = 'PAYROLL';
        }

        // 6. التحقق من النجاح وتدقيق الـ Understood
        const hasConditionTriggerKeywords = ['لو', 'إذا', 'اذا', 'في حال', 'من بين', 'كلما'];
        const includesConditionTrigger = hasConditionTriggerKeywords.some(k => preparedText.includes(k));

        if (result.actions.length > 0) {
            const actionLabel = actionType === 'ADD_TO_PAYROLL' ? 'إضافة مكافأة' : (actionType === 'DEDUCT_FROM_PAYROLL' ? 'خصم مالي' : 'إشعار');
            const actualFieldWord = Object.keys(this.FIELDS_MAP).find(k =>
                this.FIELDS_MAP[k] === conditionField && safeText.includes(k.toLowerCase())
            );
            const fieldLabelAr = actualFieldWord || 'الشرط';

            // لو فيه أداة شرط ومفهمناش الشرط، منقولش إني فهمت
            if (includesConditionTrigger && (!conditionField || !conditionValueObj)) {
                result.understood = false;
                result.explanation = `تم التعرف على الإجراء (${actionLabel})، لكن الشرط غير واضح أو يحتوي على تاريخ (مثل 15-12) غير مدعوم حالياً كقيمة شرطية.`;
            } else {
                result.understood = true;
                const condValText = conditionValueObj ? `بقيمة ${conditionValueObj.value}` : '';
                result.explanation = `${actionLabel} بقيمة ${actionVal ?? ''} ر.س عند تحقق ${fieldLabelAr} ${condValText}`;
            }
        }

        return result;
    }

    private prepareText(text: string): string {
        let t = text;
        const wordNumbers: Record<string, string> = {
            'واحد': '1', 'واحده': '1', 'اول': '1', 'أول': '1',
            'اثنين': '2', 'ثاني': '2', 'الثاني': '2',
            'ثلاثة': '3', 'اربعة': '4', 'خمسة': '5',
        };
        for (const [word, num] of Object.entries(wordNumbers)) {
            t = t.replace(new RegExp(`(^|\\s)${word}($|\\s)`, 'g'), `$1${num}$2`);
        }
        return t;
    }

    private extractNumbersWithContext(text: string): { value: number, context: 'condition' | 'action' | 'none', surrounding: string, position: number }[] {
        // 1. استبعاد التواريخ أولاً باستخدام Regex
        const dateRegex = /\d{1,2}[-/]\d{1,2}([-/]\d{2,4})?/g;
        const textWithoutDates = text.replace(dateRegex, ' __DATE__ ');

        const words = textWithoutDates.split(/[\s,]+/);
        const result: { value: number, context: 'condition' | 'action' | 'none', surrounding: string, position: number }[] = [];

        const actionKeywords = ['حافز', 'مكافأ', 'مكافاه', 'خصم', 'جزاء', 'يخصم', 'يصرف', 'ضيف'];
        const conditionKeywords = ['راتب', 'غياب', 'تأخير', 'انذار', 'مخالفة', 'عهدة', 'عهده', 'سنة', 'يوم', 'دقيقة'];

        for (let i = 0; i < words.length; i++) {
            const numMatch = words[i].match(/\d+/);
            if (numMatch) {
                const num = parseInt(numMatch[0]);
                if (num > 1900 && num < 2100) continue; // سنوات

                let context: 'condition' | 'action' | 'none' = 'none';
                const start = Math.max(0, i - 4);
                const end = Math.min(words.length, i + 5);
                const surrounding = words.slice(start, end).join(' ');

                const hasAction = actionKeywords.some(kw => surrounding.includes(kw));
                const hasCondition = conditionKeywords.some(kw => surrounding.includes(kw));

                if (hasAction && !hasCondition) context = 'action';
                else if (hasCondition && !hasAction) context = 'condition';
                else if (hasAction && hasCondition) {
                    const actionDist = this.getMinDist(words, i, actionKeywords);
                    const conditionDist = this.getMinDist(words, i, conditionKeywords);
                    context = actionDist < conditionDist ? 'action' : 'condition';
                }

                result.push({ value: num, context, surrounding, position: i });
            }
        }

        const noneContexts = result.filter(n => n.context === 'none');
        if (noneContexts.length >= 2) {
            noneContexts[0].context = 'condition';
            noneContexts[1].context = 'action';
        }

        return result;
    }

    private getMinDist(words: string[], targetIdx: number, keywords: string[]): number {
        let min = 100;
        for (let i = 0; i < words.length; i++) {
            if (keywords.some(kw => words[i].includes(kw))) {
                const d = Math.abs(i - targetIdx);
                if (d < min) min = d;
            }
        }
        return min;
    }

    private detectFieldInSnippet(snippet: string): string | null {
        for (const [key, value] of Object.entries(this.FIELDS_MAP)) {
            if (snippet.includes(key)) return value;
        }
        return null;
    }

    private detectField(text: string, excludeKeywords: string[] = []): string | null {
        let t = text;
        for (const kw of excludeKeywords) { t = t.replace(kw, ''); }
        for (const [key, value] of Object.entries(this.FIELDS_MAP)) {
            if (t.includes(key)) return value;
        }
        return null;
    }

    private detectOperator(text: string): string | null {
        for (const item of this.OPERATORS_MAP) {
            for (const kw of item.keywords) { if (text.includes(kw)) return item.op; }
        }
        return null;
    }

    private detectAction(text: string): string | null {
        for (const item of this.ACTIONS_MAP) {
            for (const kw of item.keywords) { if (text.includes(kw)) return item.type; }
        }
        return null;
    }
}
