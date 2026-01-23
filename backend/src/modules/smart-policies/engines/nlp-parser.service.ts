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
        'حضور': 'attendance.currentPeriod.attendancePercentage',
        'بدرى': 'attendance.currentPeriod.earlyArrivalMinutes',
        'بدريه': 'attendance.currentPeriod.earlyArrivalMinutes',
        'مبكر': 'attendance.currentPeriod.earlyArrivalMinutes',
        'قبل دوامه': 'attendance.currentPeriod.earlyArrivalMinutes',
        'قبل الوقت': 'attendance.currentPeriod.earlyArrivalMinutes',
        'قبل الميعاد': 'attendance.currentPeriod.earlyArrivalMinutes',
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
        { keywords: ['من بين', 'ما بين', 'بين', 'بـ'], op: 'GREATER_THAN_OR_EQUAL' },
    ];

    // قاموس الإجراءات (Actions)
    private readonly ACTIONS_MAP: Array<{ keywords: string[], type: string }> = [
        { keywords: ['حافز', 'مكافأة', 'مكافاه', 'بونص', 'ينزل', 'يصرف', 'إضافة', 'اضافة', 'ضيف', 'زود'], type: 'ADD_TO_PAYROLL' },
        { keywords: ['خصم', 'جزاء', 'عقوبة', 'يخصم', 'نقص'], type: 'DEDUCT_FROM_PAYROLL' },
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

        // 1. استخراج الأرقام مع سياقها
        const numbers = this.extractNumbersWithContext(safeText);
        const conditionValueObj = numbers.find(n => n.context === 'condition');
        const actionValueObj = numbers.find(n => n.context === 'action');

        // 2. محاولة فهم الشرط بناءً على رقم الشرط
        let conditionField: string | null = null;
        if (conditionValueObj) {
            // ابحث عن الحقل في الكلمات المحيطة بهذا الرقم تحديداً
            conditionField = this.detectFieldInSnippet(conditionValueObj.surrounding);
        }

        // لو ملقيناش حقل جنب الرقم، ابحث في النص كله بس استبعد حقل الراتب لو فيه حافز
        if (!conditionField) {
            conditionField = this.detectField(safeText, ['salary', 'راتب']);
        }

        const operator = this.detectOperator(safeText);

        if (conditionField && conditionValueObj) {
            result.conditions.push({
                field: conditionField,
                operator: operator as any || 'GREATER_THAN_OR_EQUAL',
                value: conditionValueObj.value,
            });
        }

        // 3. محاولة فهم الإجراء
        const actionType = this.detectAction(safeText);

        if (actionType && actionValueObj) {
            result.actions.push({
                type: actionType as any,
                valueType: 'FIXED',
                value: actionValueObj.value,
                description: `تم التحليل آلياً من النص`,
            });
        }

        // 4. تحديد الحدث (Trigger)
        if (safeText.includes('حضور') || safeText.includes('تأخير') || safeText.includes('غياب') || safeText.includes('دوام') || safeText.includes('يجى') || safeText.includes('بدرى')) {
            result.trigger.event = 'ATTENDANCE';
        }

        // 5. التحقق من النجاح
        if (result.actions.length > 0) {
            result.understood = true;
            const actionLabel = actionType === 'ADD_TO_PAYROLL' ? 'إضافة مكافأة' : (actionType === 'DEDUCT_FROM_PAYROLL' ? 'خصم مالي' : 'إجراء');
            const fieldLabelAr = Object.keys(this.FIELDS_MAP).find(k => this.FIELDS_MAP[k] === conditionField) || 'الشرط';
            result.explanation = `${actionLabel} بقيمة ${actionValueObj?.value || ''} ر.س عند تحقق ${fieldLabelAr} بقيمة ${conditionValueObj?.value || ''}`;
        }

        return result;
    }

    private extractNumbersWithContext(text: string): { value: number, context: 'condition' | 'action' | 'none', surrounding: string }[] {
        const words = text.split(/[\s,]+/);
        const result: { value: number, context: 'condition' | 'action' | 'none', surrounding: string }[] = [];

        for (let i = 0; i < words.length; i++) {
            const numMatch = words[i].match(/\d+/);
            if (numMatch) {
                const num = parseInt(numMatch[0]);
                let context: 'condition' | 'action' | 'none' = 'none';

                // فحص الكلمات المحيطة بدقة أكبر (قبلها بـ 4 وبعدها بـ 2)
                const start = Math.max(0, i - 4);
                const end = Math.min(words.length, i + 3);
                const surrounding = words.slice(start, end).join(' ');

                if (surrounding.includes('دقيق') || surrounding.includes('يوم') || surrounding.includes('ساع') || surrounding.includes('سنة') || surrounding.includes('دوام') || surrounding.includes('بدرى') || surrounding.includes('قبل')) {
                    context = 'condition';
                } else if (surrounding.includes('ريال') || surrounding.includes('جنيه') || surrounding.includes('حافز') || surrounding.includes('مكافأ') || surrounding.includes('بونص') || surrounding.includes('خصم') || surrounding.includes('ضيف') || surrounding.includes('راتب')) {
                    context = 'action';
                }

                result.push({ value: num, context, surrounding });
            }
        }
        return result;
    }

    private detectFieldInSnippet(snippet: string): string | null {
        // ترتيب البحث مهم: الأكثر تحديداً أولاً
        const specificKeywords = [
            'بدرى', 'بدريه', 'مبكر', 'قبل دوامه', 'قبل الوقت', 'قبل الميعاد', 'تأخير', 'تاخير', 'غياب'
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
