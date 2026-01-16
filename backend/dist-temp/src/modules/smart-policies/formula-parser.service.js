"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var FormulaParserService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormulaParserService = void 0;
const common_1 = require("@nestjs/common");
let FormulaParserService = FormulaParserService_1 = class FormulaParserService {
    constructor() {
        this.logger = new common_1.Logger(FormulaParserService_1.name);
    }
    async evaluateFormula(formula, context) {
        try {
            this.logger.log(`Evaluating formula: ${formula}`);
            let processedFormula = this.replaceContextFields(formula, context);
            processedFormula = this.processFunctions(processedFormula);
            const result = this.evaluateMathExpression(processedFormula);
            this.logger.log(`Formula result: ${result}`);
            return result;
        }
        catch (error) {
            this.logger.error(`Error evaluating formula: ${error.message}`);
            throw new Error(`Failed to evaluate formula: ${formula}`);
        }
    }
    evaluateComplexCondition(condition, context) {
        try {
            this.logger.debug(`Evaluating condition: ${condition}`);
            let processedCondition = this.replaceContextFields(condition, context);
            processedCondition = processedCondition
                .replace(/\bAND\b/gi, '&&')
                .replace(/\bOR\b/gi, '||')
                .replace(/\bNOT\b/gi, '!');
            processedCondition = processedCondition
                .replace(/\bEQUALS\b/gi, '===')
                .replace(/\bNOT_EQUALS\b/gi, '!==')
                .replace(/\bGREATER_THAN\b/gi, '>')
                .replace(/\bLESS_THAN\b/gi, '<')
                .replace(/\bGREATER_THAN_OR_EQUAL\b/gi, '>=')
                .replace(/\bLESS_THAN_OR_EQUAL\b/gi, '<=');
            const result = this.evaluateBooleanExpression(processedCondition);
            this.logger.debug(`Condition result: ${result}`);
            return result;
        }
        catch (error) {
            this.logger.error(`Error evaluating condition: ${error.message}`);
            return false;
        }
    }
    replaceContextFields(expression, context) {
        let result = expression;
        const fieldPattern = /([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g;
        const fields = expression.match(fieldPattern) || [];
        for (const field of fields) {
            if (this.isReservedWord(field)) {
                continue;
            }
            const value = this.getNestedValue(context, field);
            if (value !== undefined && value !== null) {
                const valueStr = typeof value === 'string' ? `"${value}"` : String(value);
                result = result.replace(new RegExp(`\\b${field}\\b`, 'g'), valueStr);
            }
        }
        return result;
    }
    processFunctions(expression) {
        let result = expression;
        result = result.replace(/MAX\s*\(/gi, 'Math.max(');
        result = result.replace(/MIN\s*\(/gi, 'Math.min(');
        result = result.replace(/ROUND\s*\(/gi, 'Math.round(');
        result = result.replace(/ABS\s*\(/gi, 'Math.abs(');
        return result;
    }
    evaluateMathExpression(expression) {
        const sanitized = expression.replace(/[^0-9+\-*/.()%\s]/g, '');
        if (!this.isSafeMathExpression(sanitized)) {
            throw new Error('Unsafe math expression');
        }
        try {
            const result = eval(sanitized);
            if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
                throw new Error('Invalid result');
            }
            return Math.round(result * 100) / 100;
        }
        catch (error) {
            throw new Error(`Math evaluation failed: ${error.message}`);
        }
    }
    evaluateBooleanExpression(expression) {
        if (!this.isSafeBooleanExpression(expression)) {
            throw new Error('Unsafe boolean expression');
        }
        try {
            const result = eval(expression);
            return Boolean(result);
        }
        catch (error) {
            throw new Error(`Boolean evaluation failed: ${error.message}`);
        }
    }
    isSafeMathExpression(expression) {
        const dangerousPatterns = [
            /require\s*\(/i,
            /import\s+/i,
            /eval\s*\(/i,
            /Function\s*\(/i,
            /setTimeout\s*\(/i,
            /setInterval\s*\(/i,
            /constructor/i,
            /prototype/i,
            /`/,
            /\$/,
            /\bthis\b/i,
            /\bwindow\b/i,
            /\bglobal\b/i,
            /\bprocess\b/i,
            /\bglobalThis\b/i,
            /\b__/,
            /fetch\s*\(/i,
            /document\b/i,
            /\bexec\b/i,
            /\bspawn\b/i,
        ];
        if (dangerousPatterns.some(pattern => pattern.test(expression))) {
            this.logger.warn(`[SECURITY] Dangerous pattern detected in formula: ${expression.substring(0, 50)}`);
            return false;
        }
        const safePattern = /^[\d+\-*/.()%\s]+$/;
        return safePattern.test(expression);
    }
    isSafeBooleanExpression(expression) {
        const dangerousPatterns = [
            /require\s*\(/i,
            /import\s+/i,
            /eval\s*\(/i,
            /Function\s*\(/i,
            /setTimeout\s*\(/i,
            /setInterval\s*\(/i,
            /=>/,
            /\bfunction\s*\(/i,
            /\bthis\b/,
            /\bwindow\b/,
            /\bglobal\b/,
            /\bglobalThis\b/,
            /\bprocess\b/,
            /\b__/,
            /constructor/i,
            /prototype/i,
            /\bcall\s*\(/i,
            /\bapply\s*\(/i,
            /\bbind\s*\(/i,
            /`/,
            /\$/,
            /fetch\s*\(/i,
            /document\b/i,
        ];
        if (dangerousPatterns.some(pattern => pattern.test(expression))) {
            this.logger.warn(`[SECURITY] Dangerous pattern in boolean expression: ${expression.substring(0, 50)}`);
            return false;
        }
        return true;
    }
    getNestedValue(obj, path) {
        try {
            return path.split('.').reduce((current, key) => {
                if (current === null || current === undefined) {
                    return undefined;
                }
                return current[key];
            }, obj);
        }
        catch {
            return undefined;
        }
    }
    isReservedWord(word) {
        const reserved = [
            'MAX', 'MIN', 'ROUND', 'ABS', 'SUM', 'COUNT', 'AVG',
            'AND', 'OR', 'NOT',
            'EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN',
            'GREATER_THAN_OR_EQUAL', 'LESS_THAN_OR_EQUAL',
            'Math', 'true', 'false', 'null', 'undefined',
        ];
        return reserved.includes(word);
    }
    async evaluateCount(field, operator, value, context) {
        const fieldValue = this.getNestedValue(context, field);
        return typeof fieldValue === 'number' ? fieldValue : 0;
    }
    async evaluateSum(field, context) {
        const value = this.getNestedValue(context, field);
        return typeof value === 'number' ? value : 0;
    }
    async evaluateAvg(field, context) {
        const value = this.getNestedValue(context, field);
        return typeof value === 'number' ? value : 0;
    }
    async evaluateConsecutive(field, operator, value, context) {
        this.logger.log(`[CONSECUTIVE] Evaluating: ${field} ${operator} ${value}`);
        const fieldLower = field.toLowerCase();
        if (fieldLower.includes('late') || fieldLower.includes('تأخير')) {
            const streak = context.attendance.patterns.lateStreak || 0;
            this.logger.log(`[CONSECUTIVE] Late streak from patterns: ${streak}`);
            return streak;
        }
        if (fieldLower.includes('absent') || fieldLower.includes('غياب')) {
            const streak = context.attendance.patterns.absenceStreak || 0;
            this.logger.log(`[CONSECUTIVE] Absence streak from patterns: ${streak}`);
            return streak;
        }
        if (fieldLower.includes('present') || fieldLower.includes('حضور')) {
            const streak = context.attendance.patterns.consecutivePresent || 0;
            this.logger.log(`[CONSECUTIVE] Present streak from patterns: ${streak}`);
            return streak;
        }
        if (fieldLower.includes('early') || fieldLower.includes('مبكر')) {
            const earlyLeaveDays = context.attendance.currentPeriod.earlyLeaveDays || 0;
            this.logger.log(`[CONSECUTIVE] Early leave days: ${earlyLeaveDays}`);
            return earlyLeaveDays;
        }
        if (fieldLower.includes('sick') || fieldLower.includes('مرض')) {
            const sickStreak = context.leaves.currentMonth?.consecutiveSickDays || 0;
            this.logger.log(`[CONSECUTIVE] Sick leave streak: ${sickStreak}`);
            return sickStreak;
        }
        if (fieldLower.includes('weekend') || fieldLower.includes('عطلة')) {
            const weekendDays = context.attendance.currentPeriod.weekendWorkDays || 0;
            this.logger.log(`[CONSECUTIVE] Weekend work days: ${weekendDays}`);
            return weekendDays;
        }
        const directValue = this.getNestedValue(context, field);
        if (typeof directValue === 'number') {
            this.logger.log(`[CONSECUTIVE] Direct value from context: ${directValue}`);
            return directValue;
        }
        this.logger.warn(`[CONSECUTIVE] No pattern found for field: ${field}`);
        return 0;
    }
};
exports.FormulaParserService = FormulaParserService;
exports.FormulaParserService = FormulaParserService = FormulaParserService_1 = __decorate([
    (0, common_1.Injectable)()
], FormulaParserService);
//# sourceMappingURL=formula-parser.service.js.map