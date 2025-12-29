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
        'DAYS_IN_MONTH', 'WORKING_DAYS', 'WORKING_DAYS_IN_YEAR',
        'YEARS_OF_SERVICE', 'MONTHS_OF_SERVICE',
    ];

    // ... (skipped FUNCTIONS)

    /**
     * معالجة if(condition, trueValue, falseValue) بشكل متكرر (Nested Support)
     */
    private processConditionals(expression: string): string {
        let result = expression;

        // البحث عن آخر IF مفتوحة لإغلاقها (من الداخل للخارج)
        while (result.includes('IF(') || result.includes('if(')) {
            const ifIndex = result.toUpperCase().lastIndexOf('IF(');
            const contentStart = ifIndex + 3;

            // إيجاد القوس المغلق المقابل
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

            if (bracketEnd === -1) break; // خطأ في الأقواس

            const content = result.substring(contentStart, bracketEnd);

            // تقسيم المحتوى إلى 3 أجزاء (الشرط، القيمة الصحيحة، القيمة الخاطئة)
            // نأخذ في الاعتبار أن كل جزء قد يحتوي على فواصل داخل دوال أخرى
            const parts = this.splitByTopLevelComma(content);

            if (parts.length === 3) {
                const [condition, trueVal, falseVal] = parts;
                const condResult = this.evaluateCondition(condition.trim());
                const evaluatedBranch = condResult ? trueVal : falseVal;

                // استبدال الـ IF كاملة بنتيجة الفرع المختار
                result = result.substring(0, ifIndex) + evaluatedBranch + result.substring(bracketEnd + 1);
            } else {
                // خطأ في عدد الأجزاء، نخرج لتجنب الحلقة اللانهائية
                break;
            }
        }

        return result;
    }

    /**
     * تقسيم النص بناءً على الفواصل التي ليست داخل أقواس
     */
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
            } else {
                current += char;
            }
        }
        parts.push(current);
        return parts;
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
            WORKING_DAYS_IN_YEAR: 360, // المعيار المحاسبي غالباً 30 * 12
            GOSI_BASE: basic + (params.housingAllowance || 0),
            GOSI_RATE_EMP: 0.0975,
            GOSI_RATE_COMP: 0.12,
            YEARS_OF_SERVICE: params.yearsOfService || 0,
            MONTHS_OF_SERVICE: (params.yearsOfService || 0) * 12,
        };
    }

    /**
     * استخراج المتغيرات المستخدمة في المعادلة
     */
    extractDependencies(formula: string): string[] {
        if (!formula) return [];
        const expression = formula.toUpperCase();
        const deps: string[] = [];

        for (const varName of FormulaEngineService.SUPPORTED_VARIABLES) {
            const regex = new RegExp(`\\b${varName}\\b`, 'g');
            if (regex.test(expression)) {
                deps.push(varName);
            }
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
