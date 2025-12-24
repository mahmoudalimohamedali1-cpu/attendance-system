import { Injectable, Logger } from '@nestjs/common';

/**
 * Enterprise-Grade Formula Engine
 * 
 * يقيّم المعادلات الرياضية بشكل آمن بدون استخدام eval()
 * يدعم:
 * - العمليات الحسابية: +, -, *, /, %, ^
 * - المتغيرات: BASIC, TOTAL, HOUSING, etc.
 * - الدوال: min(), max(), round(), floor(), ceil(), if()
 * - الأقواس
 * 
 * أمثلة:
 * - "BASIC * 0.25" → بدل السكن 25% من الأساسي
 * - "TOTAL * 0.0975" → خصم GOSI 9.75%
 * - "if(DAYS_ABSENT > 0, DAILY_RATE * DAYS_ABSENT, 0)" → خصم الغياب
 * - "max(0, min(OT_HOURS, 40) * HOURLY_RATE * 1.5)" → وقت إضافي
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
        'DAYS_IN_MONTH', 'WORKING_DAYS',
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
        // قائمة سوداء للكلمات المحظورة
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

        // التحقق من عدم وجود رموز غريبة
        const allowedPattern = /^[A-Z0-9_+\-*\/().,\s%^<>=!&|?:]+$/;
        if (!allowedPattern.test(formula)) {
            return { valid: false, error: 'Invalid characters in formula' };
        }

        return { valid: true };
    }

    /**
     * استبدال المتغيرات بقيمها
     */
    private substituteVariables(formula: string, variables: Record<string, number>): string {
        let result = formula;

        // ترتيب المتغيرات من الأطول للأقصر لتجنب الاستبدال الجزئي
        const sortedVars = Object.keys(variables).sort((a, b) => b.length - a.length);

        for (const varName of sortedVars) {
            const value = variables[varName.toUpperCase()] ?? 0;
            const regex = new RegExp(`\\b${varName.toUpperCase()}\\b`, 'g');
            result = result.replace(regex, value.toString());
        }

        return result;
    }

    /**
     * تقييم التعبير الرياضي (بدون eval)
     * يستخدم Shunting-yard algorithm محسّن
     */
    private evaluateExpression(expression: string): number {
        // إزالة المسافات
        expression = expression.replace(/\s+/g, '');

        // معالجة الدوال أولاً
        expression = this.processFunctions(expression);

        // معالجة if-else
        expression = this.processConditionals(expression);

        // تحويل لـ RPN وتقييم
        return this.evaluateRPN(this.toRPN(expression));
    }

    /**
     * معالجة الدوال
     */
    private processFunctions(expression: string): string {
        let result = expression;

        for (const [funcName, fn] of Object.entries(FormulaEngineService.FUNCTIONS)) {
            const pattern = new RegExp(`${funcName.toUpperCase()}\\(([^)]+)\\)`, 'gi');
            result = result.replace(pattern, (_, args) => {
                const argValues = args.split(',').map((a: string) => {
                    // تقييم كل argument
                    const val = this.evaluateRPN(this.toRPN(a.trim()));
                    return val;
                });
                return fn(...argValues).toString();
            });
        }

        return result;
    }

    /**
     * معالجة if(condition, trueValue, falseValue)
     */
    private processConditionals(expression: string): string {
        const ifPattern = /IF\(([^,]+),([^,]+),([^)]+)\)/gi;
        return expression.replace(ifPattern, (_, condition, trueVal, falseVal) => {
            const condResult = this.evaluateCondition(condition.trim());
            return condResult
                ? this.evaluateRPN(this.toRPN(trueVal.trim())).toString()
                : this.evaluateRPN(this.toRPN(falseVal.trim())).toString();
        });
    }

    /**
     * تقييم شرط بسيط
     */
    private evaluateCondition(condition: string): boolean {
        // معالجة المقارنات: >, <, >=, <=, ==, !=
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

        // إذا لم يكن شرط مقارنة، نعتبر القيمة غير الصفرية true
        return this.evaluateRPN(this.toRPN(condition)) !== 0;
    }

    /**
     * تحويل إلى Reverse Polish Notation (Shunting-yard)
     */
    private toRPN(expression: string): string[] {
        const output: string[] = [];
        const operators: string[] = [];
        const precedence: Record<string, number> = {
            '+': 1, '-': 1,
            '*': 2, '/': 2, '%': 2,
            '^': 3,
        };

        // التعامل مع الأرقام السالبة في البداية
        expression = expression.replace(/^-/, '0-');
        expression = expression.replace(/\(-/g, '(0-');

        const tokens = expression.match(/(\d+\.?\d*|\+|\-|\*|\/|\%|\^|\(|\))/g) || [];

        for (const token of tokens) {
            if (/\d/.test(token)) {
                output.push(token);
            } else if (token === '(') {
                operators.push(token);
            } else if (token === ')') {
                while (operators.length && operators[operators.length - 1] !== '(') {
                    output.push(operators.pop()!);
                }
                operators.pop(); // Remove '('
            } else if (token in precedence) {
                while (
                    operators.length &&
                    operators[operators.length - 1] !== '(' &&
                    precedence[operators[operators.length - 1]] >= precedence[token]
                ) {
                    output.push(operators.pop()!);
                }
                operators.push(token);
            }
        }

        while (operators.length) {
            output.push(operators.pop()!);
        }

        return output;
    }

    /**
     * تقييم RPN
     */
    private evaluateRPN(tokens: string[]): number {
        const stack: number[] = [];

        for (const token of tokens) {
            if (/\d/.test(token)) {
                stack.push(parseFloat(token));
            } else {
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

    /**
     * بناء context المتغيرات من بيانات الموظف
     */
    buildVariableContext(params: {
        basicSalary: number;
        totalSalary?: number;
        grossSalary?: number;
        housingAllowance?: number;
        transportAllowance?: number;
        otherAllowances?: number;
        overtimeHours?: number;
        overtimeRate?: number;
        daysWorked?: number;
        daysAbsent?: number;
        lateMinutes?: number;
        daysInMonth?: number;
        yearsOfService?: number;
    }): Record<string, number> {
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
            GOSI_BASE: basic + (params.housingAllowance || 0),
            GOSI_RATE_EMP: 0.0975,
            GOSI_RATE_COMP: 0.12,
            YEARS_OF_SERVICE: params.yearsOfService || 0,
            MONTHS_OF_SERVICE: (params.yearsOfService || 0) * 12,
        };
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
