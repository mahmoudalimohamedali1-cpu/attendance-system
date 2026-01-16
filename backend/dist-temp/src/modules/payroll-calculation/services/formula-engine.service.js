"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var FormulaEngineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormulaEngineService = void 0;
const common_1 = require("@nestjs/common");
let FormulaEngineService = FormulaEngineService_1 = class FormulaEngineService {
    constructor() {
        this.logger = new common_1.Logger(FormulaEngineService_1.name);
    }
    evaluate(formula, variables) {
        try {
            if (!formula || typeof formula !== 'string') {
                return { value: 0, error: 'Empty formula' };
            }
            let expression = formula.trim().toUpperCase();
            const securityCheck = this.securityValidation(expression);
            if (!securityCheck.valid) {
                return { value: 0, error: securityCheck.error };
            }
            expression = this.substituteVariables(expression, variables);
            const result = this.evaluateExpression(expression);
            if (isNaN(result) || !isFinite(result)) {
                return { value: 0, error: 'Invalid calculation result' };
            }
            return { value: Math.round(result * 100) / 100 };
        }
        catch (error) {
            this.logger.error(`Formula evaluation error: ${error.message}`, error.stack);
            return { value: 0, error: error.message };
        }
    }
    securityValidation(formula) {
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
    substituteVariables(formula, variables) {
        let result = formula;
        const sortedVars = Object.keys(variables).sort((a, b) => b.length - a.length);
        for (const varName of sortedVars) {
            const value = variables[varName.toUpperCase()] ?? 0;
            const regex = new RegExp(`\\b${varName.toUpperCase()}\\b`, 'g');
            result = result.replace(regex, value.toString());
        }
        return result;
    }
    evaluateExpression(expression) {
        let cleanExpr = expression.replace(/\s+/g, '');
        cleanExpr = this.processFunctions(cleanExpr);
        cleanExpr = this.processConditionals(cleanExpr);
        return this.evaluateRPN(this.toRPN(cleanExpr));
    }
    processFunctions(expression) {
        let result = expression;
        for (const [funcName, fn] of Object.entries(FormulaEngineService_1.FUNCTIONS)) {
            const pattern = new RegExp(`${funcName.toUpperCase()}\\(([^)]+)\\)`, 'gi');
            result = result.replace(pattern, (_, args) => {
                const argValues = args.split(',').map((a) => {
                    return this.evaluateRPN(this.toRPN(a.trim()));
                });
                return fn(...argValues).toString();
            });
        }
        return result;
    }
    processConditionals(expression) {
        let result = expression;
        while (result.toUpperCase().includes('IF(')) {
            const ifIndex = result.toUpperCase().lastIndexOf('IF(');
            const contentStart = ifIndex + 3;
            let bracketCount = 1;
            let bracketEnd = -1;
            for (let i = contentStart; i < result.length; i++) {
                if (result[i] === '(')
                    bracketCount++;
                if (result[i] === ')')
                    bracketCount--;
                if (bracketCount === 0) {
                    bracketEnd = i;
                    break;
                }
            }
            if (bracketEnd === -1)
                break;
            const content = result.substring(contentStart, bracketEnd);
            const parts = this.splitByTopLevelComma(content);
            if (parts.length === 3) {
                const [condition, trueVal, falseVal] = parts;
                const condResult = this.evaluateCondition(condition.trim());
                const evaluatedBranch = condResult ? trueVal : falseVal;
                result = result.substring(0, ifIndex) + evaluatedBranch + result.substring(bracketEnd + 1);
            }
            else
                break;
        }
        return result;
    }
    splitByTopLevelComma(text) {
        const parts = [];
        let current = '';
        let bracketCount = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '(')
                bracketCount++;
            if (char === ')')
                bracketCount--;
            if (char === ',' && bracketCount === 0) {
                parts.push(current);
                current = '';
            }
            else
                current += char;
        }
        parts.push(current);
        return parts;
    }
    evaluateCondition(condition) {
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
    toRPN(expression) {
        const output = [];
        const operators = [];
        const precedence = {
            '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3,
        };
        const tokens = expression.match(/(\d+\.?\d*|\+|\-|\*|\/|\%|\^|\(|\))/g) || [];
        for (const token of tokens) {
            if (/\d/.test(token))
                output.push(token);
            else if (token === '(')
                operators.push(token);
            else if (token === ')') {
                while (operators.length && operators[operators.length - 1] !== '(')
                    output.push(operators.pop());
                operators.pop();
            }
            else if (token in precedence) {
                while (operators.length && operators[operators.length - 1] !== '(' && precedence[operators[operators.length - 1]] >= precedence[token]) {
                    output.push(operators.pop());
                }
                operators.push(token);
            }
        }
        while (operators.length)
            output.push(operators.pop());
        return output;
    }
    evaluateRPN(tokens) {
        const stack = [];
        for (const token of tokens) {
            if (/\d/.test(token))
                stack.push(parseFloat(token));
            else {
                const b = stack.pop() || 0;
                const a = stack.pop() || 0;
                switch (token) {
                    case '+':
                        stack.push(a + b);
                        break;
                    case '-':
                        stack.push(a - b);
                        break;
                    case '*':
                        stack.push(a * b);
                        break;
                    case '/':
                        stack.push(b !== 0 ? a / b : 0);
                        break;
                    case '%':
                        stack.push(a % b);
                        break;
                    case '^':
                        stack.push(Math.pow(a, b));
                        break;
                }
            }
        }
        return stack[0] || 0;
    }
    buildVariableContext(params) {
        const basic = params.basicSalary || 0;
        const daysInMonth = params.daysInMonth || 30;
        const components = params.components || [];
        let otBase = basic;
        let gosiBase = basic;
        let eosBase = basic;
        for (const comp of components) {
            const amount = Number(comp.amount) || 0;
            if (comp.otEligible)
                otBase += amount;
            if (comp.gosiEligible)
                gosiBase += amount;
            if (comp.eosEligible)
                eosBase += amount;
        }
        const dailyRate = basic / daysInMonth;
        const hourlyRate = (params.overtimeBase || otBase) / (params.overtimeDivisor || (daysInMonth * 8));
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
    extractDependencies(formula) {
        if (!formula)
            return [];
        const expression = formula.toUpperCase();
        const deps = [];
        for (const varName of FormulaEngineService_1.SUPPORTED_VARIABLES) {
            const regex = new RegExp(`\\b${varName}\\b`, 'g');
            if (regex.test(expression))
                deps.push(varName);
        }
        return deps;
    }
    getSupportedVariables() {
        return FormulaEngineService_1.SUPPORTED_VARIABLES;
    }
    getSupportedFunctions() {
        return Object.keys(FormulaEngineService_1.FUNCTIONS);
    }
};
exports.FormulaEngineService = FormulaEngineService;
FormulaEngineService.SUPPORTED_VARIABLES = [
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
FormulaEngineService.FUNCTIONS = {
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
exports.FormulaEngineService = FormulaEngineService = FormulaEngineService_1 = __decorate([
    (0, common_1.Injectable)()
], FormulaEngineService);
//# sourceMappingURL=formula-engine.service.js.map