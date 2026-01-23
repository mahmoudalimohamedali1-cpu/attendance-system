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
        'بدريه': 'attendance.currentPeriod.earlyArrivalMinutes',
        'مبكر': 'attendance.currentPeriod.earlyArrivalMinutes',
        'قبل دوامه': 'attendance.currentPeriod.earlyArrivalMinutes',
        'خدمة': 'employee.tenure.years',
        'سنة': 'employee.tenure.years',
        'سنه': 'employee.tenure.years',
        'شهر': 'employee.tenure.months',
    };

    // قاموس المعاملات (Operators)
    private readonly OPERATORS_MAP: Array<{ keywords: string[], op: string }> = [
        { keywords: ['أكبر', 'اكثر', 'أكثر', 'فوق', 'يزيد', 'تجاوز'], op: 'GREATER_THAN' },
        { keywords: ['أقل', 'اقل', 'تحت', 'ينقص'], op: 'LESS_THAN' },
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
        const safeText = text.toLowerCase();
        this.logger.log(`NLP Parsing: "${safeText}"`);

        const result: ParsedPolicyRule = {
            understood: false,
            trigger: { event: 'PAYROLL' },
            conditions: [],
            actions: [],
            scope: { type: 'ALL_EMPLOYEES' },
            explanation: '',
            clarificationNeeded: 'false' as any,
        };

        // 1. تنظيف النص وتحويل الأرقام المكتوبة كلمات لأرقام
        const preparedText = this.prepareText(safeText);

        // 2. استخراج الأرقام مع سياقها (مع تجاهل التواريخ)
        const numbers = this.extractNumbersWithContext(preparedText);
        const conditionValueObj = numbers.find(n => n.context === 'condition');
        const actionValueObj = numbers.find(n => n.context === 'action');

        // 3. محاولة فهم الشرط
        let conditionField: string | null = null;
        if (conditionValueObj) {
            conditionField = this.detectFieldInSnippet(conditionValueObj.surrounding);
        }
        if (!conditionField) {
            conditionField = this.detectField(preparedText, ['salary', 'راتب']);
        }

        const operator = this.detectOperator(preparedText);

        if (conditionField && conditionValueObj) {
            result.conditions.push({
                field: conditionField,
                operator: operator as any || 'GREATER_THAN_OR_EQUAL',
                value: conditionValueObj.value,
            });
        }

        // 4. محاولة فهم الإجراء
        const actionType = this.detectAction(preparedText);

        if (actionType && actionValueObj) {
            const isPerUnit = preparedText.includes('لكل') || preparedText.includes('عن كل');
            result.actions.push({
                type: actionType as any,
                valueType: 'FIXED', // PER_UNIT is not in the type definition, we use description to mark recursion
                value: actionValueObj.value,
                description: isPerUnit ? `يخصم لكل وحدة (تكرار)` : `مبلغ ثابت`,
            });
        }

        // 5. تحديد الحدث (Trigger)
        if (preparedText.includes('حضور') || preparedText.includes('تأخير') || preparedText.includes('غياب') || preparedText.includes('غاب') || preparedText.includes('دوام') || preparedText.includes('يجى')) {
            result.trigger.event = 'ATTENDANCE';
        }

        // 6. التحقق من النجاح
        if (result.actions.length > 0) {
            result.understood = true;
            const actionLabel = actionType === 'ADD_TO_PAYROLL' ? 'إضافة مكافأة' : (actionType === 'DEDUCT_FROM_PAYROLL' ? 'خصم مالي' : 'إجراء');
            const fieldLabelAr = Object.keys(this.FIELDS_MAP).find(k => this.FIELDS_MAP[k] === conditionField) || 'الشرط';
            result.explanation = `${actionLabel} بقيمة ${actionValueObj?.value || ''} ر.س عند تحقق ${fieldLabelAr} بقيمة ${conditionValueObj?.value || ''}`;
        }

        return result;
    }

    private prepareText(text: string): string {
        let t = text;
        // تحويل كلمات الأرقام الشائعة
        const wordNumbers: Record<string, string> = {
            'واحد': '1',
            'واحدة': '1',
            'واحده': '1',
            'اثنين': '2',
            'يومين': '2',
            'ثلاثة': '3',
            'ثلاث': '3',
            'اربعة': '4',
            'اربع': '4',
            'خمسة': '5',
            'خمس': '5',
        };
        for (const [word, num] of Object.entries(wordNumbers)) {
            t = t.replace(new RegExp(`${word}`, 'g'), num);
        }
        return t;
    }

    private extractNumbersWithContext(text: string): { value: number, context: 'condition' | 'action' | 'none', surrounding: string, position: number }[] {
        const words = text.split(/[\s,]+/);
        const result: { value: number, context: 'condition' | 'action' | 'none', surrounding: string, position: number }[] = [];

        // كلمات الإجراء (حافز، خصم، مكافأة) - الأولوية العليا
        const actionKeywords = ['حافز', 'مكافأ', 'مكافاه', 'بونص', 'خصم', 'جزاء', 'ينزل', 'يصرف', 'ضيف', 'يخصم'];
        // كلمات الشرط (راتب، غياب، تأخير) - شروط
        const conditionKeywords = ['راتبه', 'الاجمالي', 'اجمالي', 'اساسي', 'دقيق', 'يوم', 'ساع', 'سنة', 'دوام', 'بدرى', 'قبل', 'غياب', 'غاب', 'تأخير'];

        for (let i = 0; i < words.length; i++) {
            const numMatch = words[i].match(/\d+/);
            if (numMatch) {
                const num = parseInt(numMatch[0]);

                // تجاهل أرقام التواريخ
                const isYear = num > 1900 && num < 2100;
                const isMonth = (num >= 1 && num <= 12) && (i > 0 && words[i - 1].includes('شهر'));
                if (isYear || isMonth) continue;

                let context: 'condition' | 'action' | 'none' = 'none';
                const start = Math.max(0, i - 4);
                const end = Math.min(words.length, i + 3);
                const surrounding = words.slice(start, end).join(' ');

                // أولوية: كلمات الإجراء أولاً (حافز، خصم، مكافأة)
                const hasActionKeyword = actionKeywords.some(kw => surrounding.includes(kw));
                const hasConditionKeyword = conditionKeywords.some(kw => surrounding.includes(kw));

                if (hasActionKeyword && !hasConditionKeyword) {
                    context = 'action';
                } else if (hasConditionKeyword && !hasActionKeyword) {
                    context = 'condition';
                } else if (hasActionKeyword && hasConditionKeyword) {
                    // لو فيه الاتنين، نشوف أيهما أقرب للرقم
                    const actionDist = this.findClosestKeywordDistance(words, i, actionKeywords);
                    const conditionDist = this.findClosestKeywordDistance(words, i, conditionKeywords);
                    context = actionDist < conditionDist ? 'action' : 'condition';
                } else if (surrounding.includes('ريال') || surrounding.includes('جنيه')) {
                    // ريال بدون كلمة محددة - نحتاج سياق أوسع
                    context = 'none'; // سيتم تحديده لاحقاً بناءً على الترتيب
                }

                result.push({ value: num, context, surrounding, position: i });
            }
        }

        // معالجة الأرقام اللي سياقها none - نفترض الأول شرط والتاني إجراء
        const noneContextNumbers = result.filter(n => n.context === 'none');
        if (noneContextNumbers.length >= 2) {
            noneContextNumbers[0].context = 'condition';
            noneContextNumbers[1].context = 'action';
        } else if (noneContextNumbers.length === 1 && result.length >= 2) {
            // لو عندنا رقم واحد بس none، نحدده بناءً على اللي موجود
            const hasCondition = result.some(n => n.context === 'condition');
            const hasAction = result.some(n => n.context === 'action');
            if (!hasCondition) noneContextNumbers[0].context = 'condition';
            else if (!hasAction) noneContextNumbers[0].context = 'action';
        }

        return result;
    }

    private findClosestKeywordDistance(words: string[], numIndex: number, keywords: string[]): number {
        let minDist = Infinity;
        for (let i = 0; i < words.length; i++) {
            for (const kw of keywords) {
                if (words[i].includes(kw)) {
                    const dist = Math.abs(i - numIndex);
                    if (dist < minDist) minDist = dist;
                }
            }
        }
        return minDist;
    }

    private detectFieldInSnippet(snippet: string): string | null {
        // ترتيب البحث مهم: الأكثر تحديداً أولاً
        const specificKeywords = [
            'غياب', 'غاب', 'تأخير', 'تاخير', 'بدرى', 'مبكر', 'قبل دوامه'
        ];
        for (const kw of specificKeywords) {
            if (snippet.includes(kw)) return this.FIELDS_MAP[kw];
        }
        for (const [key, value] of Object.entries(this.FIELDS_MAP)) {
            if (snippet.includes(key)) return value;
        }
        return null;
    }

    private detectField(text: string, excludeKeywords: string[] = []): string | null {
        let filteredText = text;
        for (const kw of excludeKeywords) {
            filteredText = filteredText.replace(kw, '');
        }
        for (const [key, value] of Object.entries(this.FIELDS_MAP)) {
            if (filteredText.includes(key)) return value;
        }
        return null;
    }

    private detectOperator(text: string): string | null {
        for (const item of this.OPERATORS_MAP) {
            for (const kw of item.keywords) {
                if (text.includes(kw)) return item.op;
            }
        }
        return null;
    }

    private detectAction(text: string): string | null {
        for (const item of this.ACTIONS_MAP) {
            for (const kw of item.keywords) {
                if (text.includes(kw)) return item.type;
            }
        }
        return null;
    }
}
