import { Injectable, Logger } from '@nestjs/common';

/**
 * Enterprise-Grade Formula Engine
 * 
 * يقيّم المعادلات الرياضية بشكل آمن بدون استخدام eval()
 * يدعم:
 * - العمليات الحسابية: +, -, *, /, %, ^
 * - المتغيرات: BASIC, TOTAL, GROSS, NET, etc.
 * - الدوال: min(), max(), round(), floor(), ceil(), if()
 * - الأقواس
 */
@Injectable()
export class FormulaEngineService {
    private readonly logger = new Logger(FormulaEngineService.name);

    // المتغيرات المدعومة
    private static readonly SUPPORTED_VARIABLES = [
        'BASIC', 'TOTAL', 'GROSS', 'NET',
        'HOUSING', 'TRANSPORT', 'FOOD', 'OTHER_ALLOWANCES',
        'OT_HOURS', 'OT_AMOUNT', 'OT_RATE',
        'DAYS_WORKED', 'DAYS_ABSENT', 'LATE_MINUTES', 'LATE_HOURS',
        'DAILY_RATE', 'HOURLY_RATE', 'MINUTE_RATE',
        'GOSI_BASE', 'GOSI_RATE_EMP', 'GOSI_RATE_COMP',
        'DAYS_IN_MONTH', 'WORKING_DAYS', 'WORKING_DAYS_IN_YEAR',
        'YEARS_OF_SERVICE', 'MONTHS_OF_SERVICE',
    ];

    // الدوال المدعومة
    private static readonly FUNCTIONS: Record<string, (...args: number[]) => number> = {
        'min': (...args) => Math.min(...args),
        'max': (...args) => Math.max(...args),
        'round': (n, decimals = 2) => Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals),
        'floor': (n) => Math.floor(n),
        'ceil': (n) => Math.ceil(n),
        'abs': (n) => Math.abs(n),
        'trunc': (n) => Math.trunc(n),
        'sqrt': (n) => Math.sqrt(n),
        'pow': (base, exp) => Math.pow(base, exp),
    };

    /**
     * تقييم معادلة مع متغيرات
     */
    evaluate(formula: string, variables: Record<string, number>): { value: number; error?: string } {
        try {
            if (!formula || typeof formula !== 'string') {
                return { value: 0, error: 'Empty formula' };
            }

            // تنظيف المعادلة
            let expression = formula.trim().toUpperCase();

            // التحقق من الأمان (لا يسمح بأي كلمات برمجية)
            const securityCheck = this.securityValidation(expression);
            if (!securityCheck.valid) {
                return { value: 0, error: securityCheck.error };
            }

            // استبدال المتغيرات بقيمها
            expression = this.substituteVariables(expression, variables);

            // تقييم المعادلة
            const result = this.evaluateExpression(expression);

            if (isNaN(result) || !isFinite(result)) {
                return { value: 0, error: 'Invalid calculation result' };
            }

            return { value: Math.round(result * 100) / 100 };
        } catch (error) {
            this.logger.error(`Formula evaluation error: ${error.message}`, error.stack);
            return { value: 0, error: error.message };
        }
    }

    /**
     * التحقق من أمان المعادلة
     */
    private securityValidation(formula: string): { valid: boolean; error?: string } {
        const blacklist = [
            'EVAL', 'FUNCTION', 'CONSTRUCTOR', 'PROTOTYPE',
            'WINDOW', 'DOCUMENT', 'PROCESS', 'REQUIRE', 'IMPORT',
            'SETTIMEOUT', 'SETINTERVAL', 'FETCH', 'XMLHTTP',
            '__PROTO__', 'THIS', 'GLOBAL', 'SELF',
        ];

        for (const word of blacklist) {
            if (formula.includes(word)) {
                return { valid: false, error: `Forbidden keyword: ${word}` };
            }
        }

        const allowedPattern = /^[A-Z0-9_+\-*\/().,\s%^<>=!&|?:]+$/;
        if (!allowedPattern.test(formula)) {
            return { valid: false, error: 'Invalid characters in formula' };
        }

        return { valid: true };
    }

    private substituteVariables(formula: string, variables: Record<string, number>): string {
        let result = formula;
        const sortedVars = Object.keys(variables).sort((a, b) => b.length - a.length);

        for (const varName of sortedVars) {
            const value = variables[varName.toUpperCase()] ?? 0;
            const regex = new RegExp(`\\b${varName.toUpperCase()}\\b`, 'g');
            result = result.replace(regex, value.toString());
        }

        return result;
    }

    private evaluateExpression(expression: string): number {
        let cleanExpr = expression.replace(/\s+/g, '');

        // معالجة الدوال الأساسية
        cleanExpr = this.processFunctions(cleanExpr);

        // معالجة الـ if (Nested Support)
        cleanExpr = this.processConditionals(cleanExpr);

        return this.evaluateRPN(this.toRPN(cleanExpr));
    }

    private processFunctions(expression: string): string {
        let result = expression;
        for (const [funcName, fn] of Object.entries(FormulaEngineService.FUNCTIONS)) {
            const pattern = new RegExp(`${funcName.toUpperCase()}\\(([^)]+)\\)`, 'gi');
            result = result.replace(pattern, (_, args) => {
                const argValues = args.split(',').map((a: string) => {
                    return this.evaluateRPN(this.toRPN(a.trim()));
                });
                return fn(...argValues).toString();
            });
        }
        return result;
    }

    private processConditionals(expression: string): string {
        let result = expression;
        while (result.toUpperCase().includes('IF(')) {
            const ifIndex = result.toUpperCase().lastIndexOf('IF(');
            const contentStart = ifIndex + 3;
            let bracketCount = 1;
            let bracketEnd = -1;
            for (let i = contentStart; i < result.length; i++) {
                if (result[i] === '(') bracketCount++;
                if (result[i] === ')') bracketCount--;
                if (bracketCount === 0) {
                    bracketEnd = i;
                    break;
                }
            }
            if (bracketEnd === -1) break;
            const content = result.substring(contentStart, bracketEnd);
            const parts = this.splitByTopLevelComma(content);
            if (parts.length === 3) {
                const [condition, trueVal, falseVal] = parts;
                const condResult = this.evaluateCondition(condition.trim());
                const evaluatedBranch = condResult ? trueVal : falseVal;
                result = result.substring(0, ifIndex) + evaluatedBranch + result.substring(bracketEnd + 1);
            } else break;
        }
        return result;
    }

    private splitByTopLevelComma(text: string): string[] {
        const parts: string[] = [];
        let current = '';
        let bracketCount = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '(') bracketCount++;
            if (char === ')') bracketCount--;
            if (char === ',' && bracketCount === 0) {
                parts.push(current);
                current = '';
            } else current += char;
        }
        parts.push(current);
        return parts;
    }

    private evaluateCondition(condition: string): boolean {
        const operators = ['>=', '<=', '==', '!=', '>', '<'];
        for (const op of operators) {
            if (condition.includes(op)) {
                const [left, right] = condition.split(op);
                const leftVal = this.evaluateRPN(this.toRPN(left.trim()));
                const rightVal = this.evaluateRPN(this.toRPN(right.trim()));
                switch (op) {
                    case '>': return leftVal > rightVal;
                    case '<': return leftVal < rightVal;
                    case '>=': return leftVal >= rightVal;
                    case '<=': return leftVal <= rightVal;
                    case '==': return leftVal === rightVal;
                    case '!=': return leftVal !== rightVal;
                }
            }
        }
        return this.evaluateExpression(condition) !== 0;
    }

    private toRPN(expression: string): string[] {
        const output: string[] = [];
        const operators: string[] = [];
        const precedence: Record<string, number> = {
            '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3,
        };
        const tokens = expression.match(/(\d+\.?\d*|\+|\-|\*|\/|\%|\^|\(|\))/g) || [];
        for (const token of tokens) {
            if (/\d/.test(token)) output.push(token);
            else if (token === '(') operators.push(token);
            else if (token === ')') {
                while (operators.length && operators[operators.length - 1] !== '(') output.push(operators.pop()!);
                operators.pop();
            } else if (token in precedence) {
                while (operators.length && operators[operators.length - 1] !== '(' && precedence[operators[operators.length - 1]] >= precedence[token]) {
                    output.push(operators.pop()!);
                }
                operators.push(token);
            }
        }
        while (operators.length) output.push(operators.pop()!);
        return output;
    }

    private evaluateRPN(tokens: string[]): number {
        const stack: number[] = [];
        for (const token of tokens) {
            if (/\d/.test(token)) stack.push(parseFloat(token));
            else {
                const b = stack.pop() || 0;
                const a = stack.pop() || 0;
                switch (token) {
                    case '+': stack.push(a + b); break;
                    case '-': stack.push(a - b); break;
                    case '*': stack.push(a * b); break;
                    case '/': stack.push(b !== 0 ? a / b : 0); break;
                    case '%': stack.push(a % b); break;
                    case '^': stack.push(Math.pow(a, b)); break;
                }
            }
        }
        return stack[0] || 0;
    }

    buildVariableContext(params: any): Record<string, number> {
        const basic = params.basicSalary || 0;
        const daysInMonth = params.daysInMonth || 30;
        const dailyRate = basic / daysInMonth;
        const hourlyRate = dailyRate / 8;

        return {
            BASIC: basic,
            TOTAL: params.totalSalary || basic,
            GROSS: params.grossSalary || basic,
            HOUSING: params.housingAllowance || 0,
            TRANSPORT: params.transportAllowance || 0,
            OTHER_ALLOWANCES: params.otherAllowances || 0,
            OT_HOURS: params.overtimeHours || 0,
            OT_RATE: params.overtimeRate || 1.5,
            DAILY_RATE: dailyRate,
            HOURLY_RATE: hourlyRate,
            MINUTE_RATE: hourlyRate / 60,
            DAYS_WORKED: params.daysWorked || daysInMonth,
            DAYS_ABSENT: params.daysAbsent || 0,
            LATE_MINUTES: params.lateMinutes || 0,
            LATE_HOURS: (params.lateMinutes || 0) / 60,
            DAYS_IN_MONTH: daysInMonth,
            WORKING_DAYS: daysInMonth,
            WORKING_DAYS_IN_YEAR: 360,
            GOSI_BASE: basic + (params.housingAllowance || 0),
            GOSI_RATE_EMP: 0.0975,
            GOSI_RATE_COMP: 0.12,
            YEARS_OF_SERVICE: params.yearsOfService || 0,
            MONTHS_OF_SERVICE: (params.yearsOfService || 0) * 12,
        };
    }

    extractDependencies(formula: string): string[] {
        if (!formula) return [];
        const expression = formula.toUpperCase();
        const deps: string[] = [];
        for (const varName of FormulaEngineService.SUPPORTED_VARIABLES) {
            const regex = new RegExp(`\\b${varName}\\b`, 'g');
            if (regex.test(expression)) deps.push(varName);
        }
        return deps;
    }

    /**
     * قائمة المتغيرات المدعومة
     */
    getSupportedVariables(): string[] {
        return FormulaEngineService.SUPPORTED_VARIABLES;
    }

    /**
     * قائمة الدوال المدعومة
     */
    getSupportedFunctions(): string[] {
        return Object.keys(FormulaEngineService.FUNCTIONS);
    }
}
