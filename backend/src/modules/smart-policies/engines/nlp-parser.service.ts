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

        // 2. محاولة فهم الشرط
        const conditionField = this.detectField(safeText);
        const operator = this.detectOperator(safeText);

        // البحث عن رقم مرتبط بالشرط (دقائق، أيام، سنوات)
        const conditionValueObj = numbers.find(n => n.context === 'condition' || (n.context === 'none' && conditionField));

        if (conditionField && conditionValueObj) {
            result.conditions.push({
                field: conditionField,
                operator: operator as any || 'GREATER_THAN_OR_EQUAL',
                value: conditionValueObj.value,
            });
        }

        // 3. محاولة فهم الإجراء
        const actionType = this.detectAction(safeText);
        // البحث عن رقم مرتبط بالإجراء (ريال، بونص)
        const actionValueObj = numbers.find(n => n.context === 'action' || (n.context === 'none' && n.value !== conditionValueObj?.value));

        if (actionType && actionValueObj) {
            result.actions.push({
                type: actionType as any,
                valueType: 'FIXED',
                value: actionValueObj.value,
                description: `تم التحليل آلياً من النص`,
            });
        }

        // 4. تحديد الحدث (Trigger)
        if (safeText.includes('حضور') || safeText.includes('تأخير') || safeText.includes('غياب') || safeText.includes('دوام') || safeText.includes('يجى')) {
            result.trigger.event = 'ATTENDANCE';
        }

        // 5. التحقق من النجاح
        if (result.actions.length > 0) {
            result.understood = true;
            const actionLabel = actionType === 'ADD_TO_PAYROLL' ? 'إضافة مكافأة' : (actionType === 'DEDUCT_FROM_PAYROLL' ? 'خصم مالي' : 'إجراء');
            result.explanation = `${actionLabel} بقيمة ${actionValueObj?.value || ''} ر.س عند تحقق شرط ${conditionField || 'عام'}`;
        }

        return result;
    }

    private extractNumbersWithContext(text: string): { value: number, context: 'condition' | 'action' | 'none' }[] {
        const words = text.split(/[\s,]+/);
        const result: { value: number, context: 'condition' | 'action' | 'none' }[] = [];

        for (let i = 0; i < words.length; i++) {
            // تنظيف الكلمة من الحروف اللاصقة مثل "بـ5" أو "5دقائق"
            const numMatch = words[i].match(/\d+/);
            if (numMatch) {
                const num = parseInt(numMatch[0]);
                let context: 'condition' | 'action' | 'none' = 'none';

                // فحص الكلمات المحيطة في نطاق 3 كلمات
                const start = Math.max(0, i - 1);
                const end = Math.min(words.length, i + 2);
                const surrounding = words.slice(start, end).join(' ');

                if (surrounding.includes('دقيق') || surrounding.includes('يوم') || surrounding.includes('ساع') || surrounding.includes('سنة') || surrounding.includes('دوام')) {
                    context = 'condition';
                } else if (surrounding.includes('ريال') || surrounding.includes('جنيه') || surrounding.includes('حافز') || surrounding.includes('مكافأ') || surrounding.includes('بونص') || surrounding.includes('خصم') || surrounding.includes('ضيف')) {
                    context = 'action';
                }

                result.push({ value: num, context });
            }
        }
        return result;
    }

    private detectField(text: string): string | null {
        for (const [key, value] of Object.entries(this.FIELDS_MAP)) {
            if (text.includes(key)) return value;
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
