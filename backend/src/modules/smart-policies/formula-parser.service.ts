import { Injectable, Logger } from '@nestjs/common';
import { EnrichedPolicyContext } from './policy-context.service';
import { SafeExpressionParserService } from './safe-expression-parser.service';

/**
 * 🔒 خدمة آمنة لتحليل وتنفيذ المعادلات والشروط المعقدة
 * تستخدم SafeExpressionParserService بدلاً من eval()
 * 
 * الميزات:
 * - تنفيذ آمن للمعادلات بدون eval
 * - دعم المتغيرات من السياق
 * - دعم الدوال الرياضية (MAX, MIN, ROUND, etc.)
 * - حماية من الـ injection attacks
 * - تسجيل شامل للأخطاء
 */
@Injectable()
export class FormulaParserService {
    private readonly logger = new Logger(FormulaParserService.name);
    
    constructor(
        private readonly safeParser: SafeExpressionParserService,
    ) {}

    /**
     * تنفيذ معادلة ديناميكية بشكل آمن
     * مثال: "(attendance.lateDays - 3) * 50"
     * مثال: "MAX(attendance.overtimeHours - 20, 0) * (contract.basicSalary / 240) * 1.5"
     */
    async evaluateFormula(formula: string, context: EnrichedPolicyContext): Promise<number> {
        try {
            this.logger.log(`Evaluating formula: ${formula}`);

            // 1. استخراج المتغيرات واستبدالها بقيمها
            const variables = this.extractVariablesFromContext(formula, context);
            
            this.logger.debug(`Variables extracted: ${JSON.stringify(variables)}`);

            // 2. استخدام الـ safe parser لتقييم المعادلة
            const result = this.safeParser.evaluateMath(formula, variables);

            this.logger.log(`Formula result: ${result}`);
            return Math.round(result * 100) / 100; // تقريب لرقمين عشريين
        } catch (error) {
            this.logger.error(`Error evaluating formula "${formula}": ${error.message}`);
            throw new Error(`فشل تقييم المعادلة: ${error.message}`);
        }
    }

    /**
     * تقييم شرط معقد بشكل آمن
     * مثال: "employee.tenure.months < 6 AND attendance.lateDays > 3"
     * مثال: "department.departmentAttendance > 90 OR performance.lastRating >= 4"
     */
    evaluateComplexCondition(condition: string, context: EnrichedPolicyContext): boolean {
        try {
            this.logger.debug(`Evaluating condition: ${condition}`);

            // 1. استخراج المتغيرات
            const variables = this.extractVariablesFromContext(condition, context);

            // 2. استخدام الـ safe parser لتقييم الشرط
            const result = this.safeParser.evaluateBoolean(condition, variables);

            this.logger.debug(`Condition result: ${result}`);
            return result;
        } catch (error) {
            this.logger.error(`Error evaluating condition "${condition}": ${error.message}`);
            return false;
        }
    }

    /**
     * تقييم مقارنة بسيطة
     */
    evaluateSimpleComparison(
        actual: number | string,
        operator: string,
        expected: number | string,
    ): boolean {
        try {
            return this.safeParser.evaluateComparison(actual, operator, expected);
        } catch (error) {
            this.logger.error(`Comparison error: ${error.message}`);
            return false;
        }
    }

    /**
     * استخراج المتغيرات من السياق
     */
    private extractVariablesFromContext(
        expression: string,
        context: EnrichedPolicyContext,
    ): Record<string, any> {
        const variables: Record<string, any> = {};

        // استخراج أسماء المتغيرات من التعبير
        const variablePattern = /([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g;
        const matches = expression.match(variablePattern) || [];

        // الكلمات المحجوزة التي لا نستبدلها
        const reservedWords = new Set([
            'MAX', 'MIN', 'ROUND', 'ABS', 'FLOOR', 'CEIL', 'SQRT', 'POW', 'LOG',
            'max', 'min', 'round', 'abs', 'floor', 'ceil', 'sqrt', 'pow', 'log',
            'SUM', 'COUNT', 'AVG', 'SIN', 'COS', 'TAN',
            'AND', 'OR', 'NOT', 'true', 'false', 'null', 'undefined',
            'EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN',
            'GREATER_THAN_OR_EQUAL', 'LESS_THAN_OR_EQUAL',
            'CONTAINS', 'IN', 'BETWEEN', 'IS_TRUE', 'IS_FALSE',
        ]);

        for (const match of matches) {
            // تجاهل الكلمات المحجوزة
            if (reservedWords.has(match)) continue;

            // تجاهل الأرقام
            if (/^\d+(\.\d+)?$/.test(match)) continue;

            // جلب القيمة من السياق
            const value = this.getNestedValue(context, match);
            
            if (value !== undefined && value !== null) {
                // تحويل القيمة للنوع المناسب
                if (typeof value === 'number') {
                    variables[match] = value;
                } else if (typeof value === 'boolean') {
                    variables[match] = value;
                } else if (typeof value === 'string') {
                    const num = parseFloat(value);
                    variables[match] = isNaN(num) ? value : num;
                } else {
                    variables[match] = value;
                }
            } else {
                // قيمة افتراضية للمتغيرات غير الموجودة
                this.logger.warn(`Variable not found in context: ${match}, using 0`);
                variables[match] = 0;
            }
        }

        return variables;
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
     * حساب COUNT - عدد العناصر التي تطابق شرط
     * مثال: COUNT(attendance.lateDays > 3) في آخر 3 أشهر
     */
    async evaluateCount(
        field: string,
        operator: string,
        value: any,
        context: EnrichedPolicyContext
    ): Promise<number> {
        // جلب القيمة من السياق مباشرة
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
        this.logger.log(`[CONSECUTIVE] Evaluating: ${field} ${operator} ${value}`);

        const fieldLower = field.toLowerCase();

        // === Late Streak Patterns ===
        if (fieldLower.includes('late') || fieldLower.includes('تأخير')) {
            const streak = context.attendance?.patterns?.lateStreak || 0;
            this.logger.log(`[CONSECUTIVE] Late streak from patterns: ${streak}`);
            return streak;
        }

        // === Absence Streak Patterns ===
        if (fieldLower.includes('absent') || fieldLower.includes('غياب')) {
            const streak = context.attendance?.patterns?.absenceStreak || 0;
            this.logger.log(`[CONSECUTIVE] Absence streak from patterns: ${streak}`);
            return streak;
        }

        // === Present/Attendance Streak ===
        if (fieldLower.includes('present') || fieldLower.includes('حضور')) {
            const streak = context.attendance?.patterns?.consecutivePresent || 0;
            this.logger.log(`[CONSECUTIVE] Present streak from patterns: ${streak}`);
            return streak;
        }

        // === Early Leave Patterns ===
        if (fieldLower.includes('early') || fieldLower.includes('مبكر')) {
            const earlyLeaveDays = context.attendance?.currentPeriod?.earlyLeaveDays || 0;
            this.logger.log(`[CONSECUTIVE] Early leave days: ${earlyLeaveDays}`);
            return earlyLeaveDays;
        }

        // === Sick Leave Consecutive ===
        if (fieldLower.includes('sick') || fieldLower.includes('مرض')) {
            const sickStreak = context.leaves?.currentMonth?.consecutiveSickDays || 0;
            this.logger.log(`[CONSECUTIVE] Sick leave streak: ${sickStreak}`);
            return sickStreak;
        }

        // === Weekend Work Patterns ===
        if (fieldLower.includes('weekend') || fieldLower.includes('عطلة')) {
            const weekendDays = context.attendance?.currentPeriod?.weekendWorkDays || 0;
            this.logger.log(`[CONSECUTIVE] Weekend work days: ${weekendDays}`);
            return weekendDays;
        }

        // === Fallback: Try to get from context ===
        const directValue = this.getNestedValue(context, field);
        if (typeof directValue === 'number') {
            this.logger.log(`[CONSECUTIVE] Direct value from context: ${directValue}`);
            return directValue;
        }

        this.logger.warn(`[CONSECUTIVE] No pattern found for field: ${field}`);
        return 0;
    }

    /**
     * تحليل معادلة واستخراج المتغيرات المستخدمة
     */
    extractFieldsFromFormula(formula: string): string[] {
        const fieldPattern = /([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)+)/g;
        const matches = formula.match(fieldPattern) || [];
        return [...new Set(matches)]; // إزالة التكرار
    }

    /**
     * التحقق من صحة المعادلة قبل التنفيذ
     */
    validateFormula(formula: string): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!formula || typeof formula !== 'string') {
            errors.push('المعادلة فارغة أو غير صالحة');
            return { valid: false, errors };
        }

        if (formula.length > 1000) {
            errors.push('المعادلة طويلة جداً (الحد الأقصى 1000 حرف)');
        }

        // التحقق من توازن الأقواس
        let parenCount = 0;
        for (const char of formula) {
            if (char === '(') parenCount++;
            if (char === ')') parenCount--;
            if (parenCount < 0) {
                errors.push('أقواس غير متوازنة');
                break;
            }
        }
        if (parenCount !== 0 && !errors.includes('أقواس غير متوازنة')) {
            errors.push('أقواس غير متوازنة');
        }

        // التحقق من عدم وجود أنماط خطرة
        const dangerousPatterns = [
            /eval\s*\(/i,
            /Function\s*\(/i,
            /require\s*\(/i,
            /import\s/i,
            /process\./i,
            /global\./i,
            /window\./i,
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(formula)) {
                errors.push('المعادلة تحتوي على أنماط غير مسموحة');
                break;
            }
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * تحويل معادلة من صيغة إلى أخرى
     */
    convertFormulaFormat(formula: string, fromFormat: 'arabic' | 'english' | 'symbols'): string {
        let result = formula;

        // تحويل من العربي للإنجليزي
        if (fromFormat === 'arabic') {
            result = result
                .replace(/جمع/g, 'SUM')
                .replace(/عدد/g, 'COUNT')
                .replace(/متوسط/g, 'AVG')
                .replace(/أقصى|اكبر/g, 'MAX')
                .replace(/أدنى|اصغر/g, 'MIN')
                .replace(/تقريب/g, 'ROUND')
                .replace(/قيمة مطلقة/g, 'ABS');
        }

        return result;
    }
}
