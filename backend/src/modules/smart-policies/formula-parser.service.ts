import { Injectable, Logger } from '@nestjs/common';
import { EnrichedPolicyContext } from './policy-context.service';

/**
 * خدمة لتحليل وتنفيذ المعادلات والشروط المعقدة
 */
@Injectable()
export class FormulaParserService {
    private readonly logger = new Logger(FormulaParserService.name);

    /**
     * تنفيذ معادلة ديناميكية
     * مثال: "(attendance.lateDays - 3) * 50"
     * مثال: "MAX(attendance.overtimeHours - 20, 0) * (contract.basicSalary / 240) * 1.5"
     */
    async evaluateFormula(formula: string, context: EnrichedPolicyContext): Promise<number> {
        try {
            this.logger.log(`Evaluating formula: ${formula}`);

            // استبدال الحقول بقيمها
            let processedFormula = this.replaceContextFields(formula, context);

            // تنفيذ الدوال المدعومة
            processedFormula = this.processFunctions(processedFormula);

            // تقييم المعادلة الرياضية
            const result = this.evaluateMathExpression(processedFormula);

            this.logger.log(`Formula result: ${result}`);
            return result;
        } catch (error) {
            this.logger.error(`Error evaluating formula: ${error.message}`);
            throw new Error(`Failed to evaluate formula: ${formula}`);
        }
    }

    /**
     * تقييم شرط معقد
     * مثال: "employee.tenure.months < 6 AND attendance.lateDays > 3"
     * مثال: "department.departmentAttendance > 90 OR performance.lastRating >= 4"
     */
    evaluateComplexCondition(condition: string, context: EnrichedPolicyContext): boolean {
        try {
            this.logger.debug(`Evaluating condition: ${condition}`);

            // استبدال الحقول بقيمها
            let processedCondition = this.replaceContextFields(condition, context);

            // استبدال المعاملات المنطقية
            processedCondition = processedCondition
                .replace(/\bAND\b/gi, '&&')
                .replace(/\bOR\b/gi, '||')
                .replace(/\bNOT\b/gi, '!');

            // استبدال معاملات المقارنة
            processedCondition = processedCondition
                .replace(/\bEQUALS\b/gi, '===')
                .replace(/\bNOT_EQUALS\b/gi, '!==')
                .replace(/\bGREATER_THAN\b/gi, '>')
                .replace(/\bLESS_THAN\b/gi, '<')
                .replace(/\bGREATER_THAN_OR_EQUAL\b/gi, '>=')
                .replace(/\bLESS_THAN_OR_EQUAL\b/gi, '<=');

            // تقييم الشرط
            const result = this.evaluateBooleanExpression(processedCondition);

            this.logger.debug(`Condition result: ${result}`);
            return result;
        } catch (error) {
            this.logger.error(`Error evaluating condition: ${error.message}`);
            return false;
        }
    }

    /**
     * استبدال حقول السياق بقيمها
     * employee.tenure.months -> 4
     * attendance.lateDays -> 5
     */
    private replaceContextFields(expression: string, context: EnrichedPolicyContext): string {
        let result = expression;

        // استخراج كل الحقول في التعبير
        const fieldPattern = /([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g;
        const fields = expression.match(fieldPattern) || [];

        // استبدال كل حقل بقيمته
        for (const field of fields) {
            // تجاهل الكلمات المحجوزة والدوال
            if (this.isReservedWord(field)) {
                continue;
            }

            const value = this.getNestedValue(context, field);
            if (value !== undefined && value !== null) {
                // استبدال بالقيمة
                const valueStr = typeof value === 'string' ? `"${value}"` : String(value);
                result = result.replace(new RegExp(`\\b${field}\\b`, 'g'), valueStr);
            }
        }

        return result;
    }

    /**
     * معالجة الدوال المدعومة
     */
    private processFunctions(expression: string): string {
        let result = expression;

        // MAX(a, b) -> Math.max(a, b)
        result = result.replace(/MAX\s*\(/gi, 'Math.max(');

        // MIN(a, b) -> Math.min(a, b)
        result = result.replace(/MIN\s*\(/gi, 'Math.min(');

        // ROUND(x) -> Math.round(x)
        result = result.replace(/ROUND\s*\(/gi, 'Math.round(');

        // ABS(x) -> Math.abs(x)
        result = result.replace(/ABS\s*\(/gi, 'Math.abs(');

        return result;
    }

    /**
     * تقييم تعبير رياضي
     */
    private evaluateMathExpression(expression: string): number {
        // تنظيف التعبير
        const sanitized = expression.replace(/[^0-9+\-*/.()%\s]/g, '');

        // التحقق من الأمان
        if (!this.isSafeMathExpression(sanitized)) {
            throw new Error('Unsafe math expression');
        }

        try {
            // تقييم التعبير
            // eslint-disable-next-line no-eval
            const result = eval(sanitized);

            // التحقق من النتيجة
            if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
                throw new Error('Invalid result');
            }

            return Math.round(result * 100) / 100; // تقريب لرقمين عشريين
        } catch (error) {
            throw new Error(`Math evaluation failed: ${error.message}`);
        }
    }

    /**
     * تقييم تعبير منطقي (boolean)
     */
    private evaluateBooleanExpression(expression: string): boolean {
        // التحقق من الأمان
        if (!this.isSafeBooleanExpression(expression)) {
            throw new Error('Unsafe boolean expression');
        }

        try {
            // تقييم التعبير
            // eslint-disable-next-line no-eval
            const result = eval(expression);
            return Boolean(result);
        } catch (error) {
            throw new Error(`Boolean evaluation failed: ${error.message}`);
        }
    }

    /**
     * التحقق من أن التعبير الرياضي آمن
     */
    private isSafeMathExpression(expression: string): boolean {
        // يسمح فقط بالأرقام والعمليات الرياضية الأساسية
        const safePattern = /^[\d+\-*/.()%\s]+$/;
        return safePattern.test(expression);
    }

    /**
     * التحقق من أن التعبير المنطقي آمن
     */
    private isSafeBooleanExpression(expression: string): boolean {
        // يسمح بالأرقام، السلاسل النصية، والعمليات المنطقية والمقارنة
        const dangerousPatterns = [
            /require\(/i,
            /import\s+/i,
            /eval\(/i,
            /function\s*\(/i,
            /=>/,
            /\bthis\b/,
            /\bwindow\b/,
            /\bglobal\b/,
            /\bprocess\b/,
            /\b__/,
        ];

        return !dangerousPatterns.some(pattern => pattern.test(expression));
    }

    /**
     * جلب قيمة متداخلة من كائن
     * getNestedValue(context, "employee.tenure.months") -> 4
     */
    private getNestedValue(obj: any, path: string): any {
        try {
            return path.split('.').reduce((current, key) => {
                if (current === null || current === undefined) {
                    return undefined;
                }
                return current[key];
            }, obj);
        } catch {
            return undefined;
        }
    }

    /**
     * التحقق من أن الكلمة محجوزة
     */
    private isReservedWord(word: string): boolean {
        const reserved = [
            'MAX', 'MIN', 'ROUND', 'ABS', 'SUM', 'COUNT', 'AVG',
            'AND', 'OR', 'NOT',
            'EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN',
            'GREATER_THAN_OR_EQUAL', 'LESS_THAN_OR_EQUAL',
            'Math', 'true', 'false', 'null', 'undefined',
        ];
        return reserved.includes(word);
    }

    /**
     * حساب COUNT - عدد العناصر التي تطابق شرط
     * مثال: COUNT(attendance.lateDays > 3) في آخر 3 أشهر
     */
    async evaluateCount(
        field: string,
        operator: string,
        value: any,
        context: EnrichedPolicyContext
    ): Promise<number> {
        // TODO: Implement count logic based on historical data
        // For now, return simple field value if it's numeric
        const fieldValue = this.getNestedValue(context, field);
        return typeof fieldValue === 'number' ? fieldValue : 0;
    }

    /**
     * حساب SUM - مجموع القيم
     */
    async evaluateSum(field: string, context: EnrichedPolicyContext): Promise<number> {
        const value = this.getNestedValue(context, field);
        return typeof value === 'number' ? value : 0;
    }

    /**
     * حساب AVG - المتوسط
     */
    async evaluateAvg(field: string, context: EnrichedPolicyContext): Promise<number> {
        // TODO: Implement average calculation based on historical data
        const value = this.getNestedValue(context, field);
        return typeof value === 'number' ? value : 0;
    }

    /**
     * حساب CONSECUTIVE - العد المتواصل
     * مثال: CONSECUTIVE(attendance.status = "LATE") -> أطول فترة تأخير متتالية
     */
    async evaluateConsecutive(
        field: string,
        operator: string,
        value: any,
        context: EnrichedPolicyContext
    ): Promise<number> {
        // استخدام القيم المحسوبة مسبقاً في patterns
        if (field.includes('late') && operator === 'EQUALS' && value === 'LATE') {
            return context.attendance.patterns.lateStreak;
        }
        if (field.includes('absent')) {
            return context.attendance.patterns.absenceStreak;
        }
        if (field.includes('present')) {
            return context.attendance.patterns.consecutivePresent;
        }
        return 0;
    }
}
