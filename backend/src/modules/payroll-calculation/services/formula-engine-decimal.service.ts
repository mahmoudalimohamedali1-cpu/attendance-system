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
    min,
    max,
    abs,
    round,
    isPositive,
    isNegative,
    isZero,
    ZERO,
    ONE,
    HUNDRED,
} from '../../../common/utils/decimal.util';
import { FormulaSecurityService } from '../../../common/security/formula-security.service';

/**
 * Enterprise-Grade Formula Engine (Decimal Version)
 *
 * يقيّم المعادلات الرياضية بشكل آمن بدون استخدام eval()
 * يستخدم Decimal للدقة العالية في الحسابات المالية
 *
 * يدعم:
 * - العمليات الحسابية: +, -, *, /, %, ^
 * - المتغيرات: BASIC, TOTAL, GROSS, NET, etc.
 * - الدوال: min(), max(), round(), floor(), ceil(), if()
 * - الأقواس
 */
@Injectable()
export class FormulaEngineDecimalService {
    private readonly logger = new Logger(FormulaEngineDecimalService.name);

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

    // الدوال المدعومة - تعمل مع Decimal
    private static readonly FUNCTIONS: Record<string, (...args: Decimal[]) => Decimal> = {
        'min': (...args) => min(...args),
        'max': (...args) => max(...args),
        'round': (n, decimals = toDecimal(2)) => round(n, toNumber(decimals)),
        'floor': (n) => toDecimal(Math.floor(toNumber(n))),
        'ceil': (n) => toDecimal(Math.ceil(toNumber(n))),
        'abs': (n) => abs(n),
        'trunc': (n) => toDecimal(Math.trunc(toNumber(n))),
        'sqrt': (n) => toDecimal(Math.sqrt(toNumber(n))),
        'pow': (base, exp) => toDecimal(Math.pow(toNumber(base), toNumber(exp))),
    };

    /**
     * تقييم معادلة مع متغيرات - إرجاع Decimal
     */
    evaluateDecimal(
        formula: string,
        variables: Record<string, Decimal>,
        context?: { userId?: string; companyId?: string }
    ): { value: Decimal; error?: string; auditId?: string } {
        const startTime = Date.now();
        let auditId: string | undefined;

        try {
            if (!formula || typeof formula !== 'string') {
                return { value: ZERO, error: 'Empty formula' };
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
                    return { value: ZERO, error: `Security violation: ${criticalThreats}`, auditId };
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
                return { value: ZERO, error: securityCheck.error, auditId };
            }

            // استبدال المتغيرات بقيمها
            expression = this.substituteVariablesDecimal(expression, variables);

            // تقييم المعادلة
            const result = this.evaluateExpressionDecimal(expression);

            if (!result.isFinite()) {
                if (this.securityService && auditId) {
                    this.securityService.logExecutionResult(auditId, 'ERROR', Date.now() - startTime, 'Invalid calculation result');
                }
                return { value: ZERO, error: 'Invalid calculation result', auditId };
            }

            // تسجيل نجاح التنفيذ
            if (this.securityService && auditId) {
                this.securityService.logExecutionResult(auditId, 'SUCCESS', Date.now() - startTime);
            }

            return { value: round(result), auditId };
        } catch (error) {
            this.logger.error(`Formula evaluation error: ${error.message}`, error.stack);
            if (this.securityService && auditId) {
                this.securityService.logExecutionResult(auditId, 'ERROR', Date.now() - startTime, error.message);
            }
            return { value: ZERO, error: error.message, auditId };
        }
    }

    /**
     * تقييم معادلة مع متغيرات - للتوافق مع الكود القديم (يرجع number)
     */
    evaluate(formula: string, variables: Record<string, number>): { value: number; error?: string } {
        // تحويل المتغيرات إلى Decimal
        const decimalVars: Record<string, Decimal> = {};
        for (const [key, val] of Object.entries(variables)) {
            decimalVars[key] = toDecimal(val);
        }

        const result = this.evaluateDecimal(formula, decimalVars);
        return {
            value: toNumber(result.value),
            error: result.error,
        };
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

        // حد أقصى لطول المعادلة
        if (formula.length > 500) {
            return { valid: false, error: 'Formula too long (max 500 characters)' };
        }

        const allowedPattern = /^[A-Z0-9_+\-*\/().,\s%^<>=!&|?:]+$/;
        if (!allowedPattern.test(formula)) {
            return { valid: false, error: 'Invalid characters in formula' };
        }

        return { valid: true };
    }

    private substituteVariablesDecimal(formula: string, variables: Record<string, Decimal>): string {
        let result = formula;
        const sortedVars = Object.keys(variables).sort((a, b) => b.length - a.length);

        for (const varName of sortedVars) {
            const value = variables[varName.toUpperCase()] ?? ZERO;
            const regex = new RegExp(`\\b${varName.toUpperCase()}\\b`, 'g');
            result = result.replace(regex, toFixed(value, 6));
        }

        return result;
    }

    private evaluateExpressionDecimal(expression: string): Decimal {
        let cleanExpr = expression.replace(/\s+/g, '');

        // معالجة الدوال الأساسية
        cleanExpr = this.processFunctionsDecimal(cleanExpr);

        // معالجة الـ if
        cleanExpr = this.processConditionalsDecimal(cleanExpr);

        return this.evaluateRPNDecimal(this.toRPN(cleanExpr));
    }

    private processFunctionsDecimal(expression: string): string {
        let result = expression;
        for (const [funcName, fn] of Object.entries(FormulaEngineDecimalService.FUNCTIONS)) {
            const pattern = new RegExp(`${funcName.toUpperCase()}\\(([^)]+)\\)`, 'gi');
            result = result.replace(pattern, (_, args) => {
                const argValues = args.split(',').map((a: string) => {
                    return this.evaluateRPNDecimal(this.toRPN(a.trim()));
                });
                return toFixed(fn(...argValues), 6);
            });
        }
        return result;
    }

    private processConditionalsDecimal(expression: string): string {
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
                const condResult = this.evaluateConditionDecimal(condition.trim());
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

    private evaluateConditionDecimal(condition: string): boolean {
        const operators = ['>=', '<=', '==', '!=', '>', '<'];
        for (const op of operators) {
            if (condition.includes(op)) {
                const [left, right] = condition.split(op);
                const leftVal = this.evaluateRPNDecimal(this.toRPN(left.trim()));
                const rightVal = this.evaluateRPNDecimal(this.toRPN(right.trim()));
                switch (op) {
                    case '>': return leftVal.gt(rightVal);
                    case '<': return leftVal.lt(rightVal);
                    case '>=': return leftVal.gte(rightVal);
                    case '<=': return leftVal.lte(rightVal);
                    case '==': return leftVal.eq(rightVal);
                    case '!=': return !leftVal.eq(rightVal);
                }
            }
        }
        return !this.evaluateExpressionDecimal(condition).isZero();
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

    private evaluateRPNDecimal(tokens: string[]): Decimal {
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
        return stack[0] || ZERO;
    }

    /**
     * بناء سياق المتغيرات - إرجاع Decimal
     */
    buildVariableContextDecimal(params: any): Record<string, Decimal> {
        const basic = toDecimal(params.basicSalary || 0);
        const daysInMonth = toDecimal(params.daysInMonth || 30);

        const components = params.components || [];

        let otBase = basic;
        let gosiBase = basic;
        let eosBase = basic;

        for (const comp of components) {
            const amount = toDecimal(comp.amount || 0);
            if (comp.otEligible) otBase = add(otBase, amount);
            if (comp.gosiEligible) gosiBase = add(gosiBase, amount);
            if (comp.eosEligible) eosBase = add(eosBase, amount);
        }

        const dailyRate = div(basic, daysInMonth);
        const overtimeDivisor = toDecimal(params.overtimeDivisor || toNumber(mul(daysInMonth, toDecimal(8))));
        const overtimeBase = toDecimal(params.overtimeBase || toNumber(otBase));
        const hourlyRate = div(overtimeBase, overtimeDivisor);

        return {
            BASIC: basic,
            TOTAL: toDecimal(params.totalSalary || toNumber(basic)),
            GROSS: toDecimal(params.grossSalary || toNumber(basic)),
            HOUSING: toDecimal(params.housingAllowance || 0),
            TRANSPORT: toDecimal(params.transportAllowance || 0),
            OTHER_ALLOWANCES: toDecimal(params.otherAllowances || 0),
            OT_HOURS: toDecimal(params.overtimeHours || 0),
            OT_RATE: toDecimal(params.overtimeRate || 1.5),
            OT_BASE: otBase,
            GOSI_BASE: gosiBase,
            EOS_BASE: eosBase,
            DAILY_RATE: dailyRate,
            HOURLY_RATE: hourlyRate,
            MINUTE_RATE: div(hourlyRate, toDecimal(60)),
            DAYS_WORKED: toDecimal(params.daysWorked || toNumber(daysInMonth)),
            DAYS_ABSENT: toDecimal(params.daysAbsent || 0),
            LATE_MINUTES: toDecimal(params.lateMinutes || 0),
            LATE_HOURS: div(toDecimal(params.lateMinutes || 0), toDecimal(60)),
            DAYS_IN_MONTH: daysInMonth,
            WORKING_DAYS: daysInMonth,
            WORKING_DAYS_IN_YEAR: toDecimal(360),
            GOSI_RATE_EMP: toDecimal(0.0975),
            GOSI_RATE_COMP: toDecimal(0.12),
            YEARS_OF_SERVICE: toDecimal(params.yearsOfService || 0),
            MONTHS_OF_SERVICE: mul(toDecimal(params.yearsOfService || 0), toDecimal(12)),
        };
    }

    /**
     * بناء سياق المتغيرات - للتوافق مع الكود القديم (يرجع number)
     */
    buildVariableContext(params: any): Record<string, number> {
        const decimalContext = this.buildVariableContextDecimal(params);
        const numberContext: Record<string, number> = {};
        for (const [key, val] of Object.entries(decimalContext)) {
            numberContext[key] = toNumber(val);
        }
        return numberContext;
    }

    extractDependencies(formula: string): string[] {
        if (!formula) return [];
        const expression = formula.toUpperCase();
        const deps: string[] = [];
        for (const varName of FormulaEngineDecimalService.SUPPORTED_VARIABLES) {
            const regex = new RegExp(`\\b${varName}\\b`, 'g');
            if (regex.test(expression)) deps.push(varName);
        }
        return deps;
    }

    getSupportedVariables(): string[] {
        return FormulaEngineDecimalService.SUPPORTED_VARIABLES;
    }

    getSupportedFunctions(): string[] {
        return Object.keys(FormulaEngineDecimalService.FUNCTIONS);
    }
}
