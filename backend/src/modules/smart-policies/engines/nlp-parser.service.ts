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
        { keywords: ['من بين', 'ما بين', 'بين'], op: 'GREATER_THAN_OR_EQUAL' }, // "من بين 5000" تعني >= 5000 عادة في سياق الرواتب
    ];

    // قاموس الإجراءات (Actions)
    private readonly ACTIONS_MAP: Array<{ keywords: string[], type: string }> = [
        { keywords: ['حافز', 'مكافأة', 'مكافاه', 'بونص', 'ينزل', 'يصرف', 'إضافة', 'اضافة'], type: 'ADD_TO_PAYROLL' },
        { keywords: ['خصم', 'جزاء', 'عقوبة', 'يخصم'], type: 'DEDUCT_FROM_PAYROLL' },
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
            trigger: { event: 'PAYROLL' }, // افترض رواتب بشكل افتراضي
            conditions: [],
            actions: [],
            scope: { type: 'ALL_EMPLOYEES' },
            explanation: '',
            clarificationNeeded: 'false' as any,
        };

        // 1. استخراج الأرقام (Entities)
        const numbers = this.extractNumbers(safeText);

        // 2. محاولة فهم الشرط
        const conditionField = this.detectField(safeText);
        const operator = this.detectOperator(safeText);

        if (conditionField && numbers.length > 0) {
            result.conditions.push({
                field: conditionField,
                operator: operator as any || 'GREATER_THAN_OR_EQUAL',
                value: numbers[0],
            });
        }

        // 3. محاولة فهم الإجراء
        const actionType = this.detectAction(safeText);
        if (actionType && numbers.length > 1) {
            result.actions.push({
                type: actionType as any,
                valueType: 'FIXED',
                value: numbers[1], // الرقم الثاني عادة هو مبلغ الحافز/الخصم
                description: `تم التحليل آلياً من النص`,
            });
        } else if (actionType && numbers.length === 1 && result.conditions.length === 0) {
            // لو رقم واحد بس ومفيش شرط، يبقى ده قيمة الإجراء
            result.actions.push({
                type: actionType as any,
                valueType: 'FIXED',
                value: numbers[0],
                description: `تم التحليل آلياً من النص`,
            });
        }

        // 4. تحديد الحدث (Trigger)
        if (safeText.includes('حضور') || safeText.includes('تأخير') || safeText.includes('غياب')) {
            result.trigger.event = 'ATTENDANCE';
        }

        // 5. التحقق من النجاح
        if (result.actions.length > 0) {
            result.understood = true;
            result.explanation = `تم فهم السياسة: ${actionType === 'ADD_TO_PAYROLL' ? 'مكافأة' : 'خصم'} عند تحقق شرط ${conditionField || 'عام'}`;
        }

        return result;
    }

    private extractNumbers(text: string): number[] {
        const regex = /\d+/g;
        const matches = text.match(regex);
        return matches ? matches.map(m => parseInt(m)) : [];
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
