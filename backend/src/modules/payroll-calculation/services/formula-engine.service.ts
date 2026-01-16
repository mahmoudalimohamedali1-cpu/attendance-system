import { Injectable, Logger, Optional } from '@nestjs/common';
import {
    Decimal,
    toDecimal,
    toNumber,
    toFixed,
    add,
    sub,
    mul,
    div,
    min as decMin,
    max as decMax,
    abs as decAbs,
    round as decRound,
    ZERO,
} from '../../../common/utils/decimal.util';
import { FormulaSecurityService } from '../../../common/security/formula-security.service';

/**
 * Enterprise-Grade Formula Engine
 *
 * يقيّم المعادلات الرياضية بشكل آمن بدون استخدام eval()
 * ✅ Updated to use Decimal internally for precision
 *
 * يدعم:
 * - العمليات الحسابية: +, -, *, /, %, ^
 * - المتغيرات: BASIC, TOTAL, GROSS, NET, etc.
 * - الدوال: min(), max(), round(), floor(), ceil(), if()
 * - الأقواس
 */
@Injectable()
export class FormulaEngineService {
    private readonly logger = new Logger(FormulaEngineService.name);

    constructor(
        @Optional() private readonly securityService?: FormulaSecurityService,
    ) {}

    // المتغيرات المدعومة
    private static readonly SUPPORTED_VARIABLES = [
        'BASIC', 'TOTAL', 'GROSS', 'NET',
        'HOUSING', 'TRANSPORT', 'FOOD', 'OTHER_ALLOWANCES',
        'OT_HOURS', 'OT_AMOUNT', 'OT_RATE', 'OT_BASE',
        'GOSI_BASE', 'GOSI_RATE_EMP', 'GOSI_RATE_COMP',
        'EOS_BASE',
        'DAYS_WORKED', 'DAYS_ABSENT', 'LATE_MINUTES', 'LATE_HOURS',
        'DAILY_RATE', 'HOURLY_RATE', 'MINUTE_RATE',
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
    evaluate(
        formula: string,
        variables: Record<string, number>,
        context?: { userId?: string; companyId?: string }
    ): { value: number; error?: string; auditId?: string } {
        const startTime = Date.now();
        let auditId: string | undefined;

        try {
            if (!formula || typeof formula !== 'string') {
                return { value: 0, error: 'Empty formula' };
            }

            // 🔒 استخدام خدمة الأمان المركزية إذا كانت متوفرة
            if (this.securityService) {
                const securityResult = this.securityService.analyze(formula, context);
                auditId = securityResult.auditId;

                if (!securityResult.isSecure) {
                    const criticalThreats = securityResult.threats
                        .filter(t => t.severity === 'CRITICAL' || t.severity === 'HIGH')
                        .map(t => t.description)
                        .join(', ');

                    this.securityService.logExecutionResult(auditId, 'ERROR', Date.now() - startTime, criticalThreats);
                    return { value: 0, error: `Security violation: ${criticalThreats}`, auditId };
                }
            }

            // تنظيف المعادلة
            let expression = formula.trim().toUpperCase();

            // التحقق من الأمان الأساسي (fallback)
            const securityCheck = this.securityValidation(expression);
            if (!securityCheck.valid) {
                if (this.securityService && auditId) {
                    this.securityService.logExecutionResult(auditId, 'ERROR', Date.now() - startTime, securityCheck.error);
                }
                return { value: 0, error: securityCheck.error, auditId };
            }

            // استبدال المتغيرات بقيمها
            expression = this.substituteVariables(expression, variables);

            // تقييم المعادلة
            const result = this.evaluateExpression(expression);

            if (isNaN(result) || !isFinite(result)) {
                if (this.securityService && auditId) {
                    this.securityService.logExecutionResult(auditId, 'ERROR', Date.now() - startTime, 'Invalid calculation result');
                }
                return { value: 0, error: 'Invalid calculation result', auditId };
            }

            // تسجيل نجاح التنفيذ
            if (this.securityService && auditId) {
                this.securityService.logExecutionResult(auditId, 'SUCCESS', Date.now() - startTime);
            }

            return { value: Math.round(result * 100) / 100, auditId };
        } catch (error) {
            this.logger.error(`Formula evaluation error: ${error.message}`, error.stack);
            if (this.securityService && auditId) {
                this.securityService.logExecutionResult(auditId, 'ERROR', Date.now() - startTime, error.message);
            }
            return { value: 0, error: error.message, auditId };
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

    // ✅ Using Decimal internally for precision
    private evaluateRPN(tokens: string[]): number {
        const stack: Decimal[] = [];
        for (const token of tokens) {
            if (/\d/.test(token)) stack.push(toDecimal(token));
            else {
                const b = stack.pop() || ZERO;
                const a = stack.pop() || ZERO;
                switch (token) {
                    case '+': stack.push(add(a, b)); break;
                    case '-': stack.push(sub(a, b)); break;
                    case '*': stack.push(mul(a, b)); break;
                    case '/': stack.push(div(a, b)); break;
                    case '%': stack.push(toDecimal(toNumber(a) % toNumber(b))); break;
                    case '^': stack.push(toDecimal(Math.pow(toNumber(a), toNumber(b)))); break;
                }
            }
        }
        return toNumber(stack[0] || ZERO);
    }


    buildVariableContext(params: any): Record<string, number> {
        const basic = params.basicSalary || 0;
        const daysInMonth = params.daysInMonth || 30;

        // حساب القواعد بناءً على البدلات (ZenHR Style)
        const components = params.components || [];

        let otBase = basic;
        let gosiBase = basic;
        let eosBase = basic;

        for (const comp of components) {
            const amount = Number(comp.amount) || 0;
            if (comp.otEligible) otBase += amount;
            if (comp.gosiEligible) gosiBase += amount;
            if (comp.eosEligible) eosBase += amount;
        }

        const dailyRate = basic / daysInMonth;
        const hourlyRate = (params.overtimeBase || otBase) / (params.overtimeDivisor || (daysInMonth * 8)); // دعم المقسم المرن

        return {
            BASIC: basic,
            TOTAL: params.totalSalary || basic,
            GROSS: params.grossSalary || basic,
            HOUSING: params.housingAllowance || 0,
            TRANSPORT: params.transportAllowance || 0,
            OTHER_ALLOWANCES: params.otherAllowances || 0,
            OT_HOURS: params.overtimeHours || 0,
            OT_RATE: params.overtimeRate || 1.5,
            OT_BASE: otBase,
            GOSI_BASE: gosiBase,
            EOS_BASE: eosBase,
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
