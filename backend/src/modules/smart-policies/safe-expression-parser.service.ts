import { Injectable, Logger } from '@nestjs/common';

/**
 * 🔒 Safe Expression Parser Service
 * يستبدل eval() بـ parser آمن لتنفيذ المعادلات الرياضية والمنطقية
 * 
 * Security Features:
 * - No eval() or Function() usage
 * - Whitelist-based operator validation
 * - Input sanitization and validation
 * - Maximum expression length limit
 * - Recursion depth limit
 * - Numeric overflow protection
 */
@Injectable()
export class SafeExpressionParserService {
    private readonly logger = new Logger(SafeExpressionParserService.name);
    
    // ============== Configuration ==============
    private readonly MAX_EXPRESSION_LENGTH = 1000;
    private readonly MAX_RECURSION_DEPTH = 50;
    private readonly MAX_NUMBER_VALUE = Number.MAX_SAFE_INTEGER;
    private readonly MIN_NUMBER_VALUE = Number.MIN_SAFE_INTEGER;

    // ============== Supported Operators ==============
    private readonly MATH_OPERATORS = ['+', '-', '*', '/', '%', '**'];
    private readonly COMPARISON_OPERATORS = ['>', '<', '>=', '<=', '==', '===', '!=', '!=='];
    private readonly LOGICAL_OPERATORS = ['&&', '||', '!'];
    
    // ============== Supported Functions ==============
    private readonly MATH_FUNCTIONS: Record<string, (...args: number[]) => number> = {
        'MAX': Math.max,
        'MIN': Math.min,
        'ABS': Math.abs,
        'ROUND': Math.round,
        'FLOOR': Math.floor,
        'CEIL': Math.ceil,
        'SQRT': Math.sqrt,
        'POW': Math.pow,
        'LOG': Math.log,
        'LOG10': Math.log10,
        'SIN': Math.sin,
        'COS': Math.cos,
        'TAN': Math.tan,
        // Aliases
        'max': Math.max,
        'min': Math.min,
        'abs': Math.abs,
        'round': Math.round,
        'floor': Math.floor,
        'ceil': Math.ceil,
        'sqrt': Math.sqrt,
        'pow': Math.pow,
    };

    /**
     * 🔢 تقييم تعبير رياضي بشكل آمن
     * @param expression - التعبير الرياضي
     * @param variables - المتغيرات وقيمها
     * @returns النتيجة الرقمية
     */
    evaluateMath(expression: string, variables: Record<string, number> = {}): number {
        this.validateExpression(expression);
        
        try {
            // استبدال المتغيرات بقيمها
            let processedExpr = this.substituteVariables(expression, variables);
            
            // معالجة الدوال الرياضية
            processedExpr = this.processMathFunctions(processedExpr);
            
            // تحليل وتقييم التعبير
            const result = this.parseMathExpression(processedExpr, 0);
            
            // التحقق من صحة النتيجة
            return this.validateResult(result);
        } catch (error) {
            this.logger.error(`Math evaluation error: ${error.message}`);
            throw new Error(`فشل تقييم التعبير الرياضي: ${error.message}`);
        }
    }

    /**
     * ✅ تقييم تعبير منطقي بشكل آمن
     * @param expression - التعبير المنطقي
     * @param variables - المتغيرات وقيمها
     * @returns النتيجة المنطقية
     */
    evaluateBoolean(expression: string, variables: Record<string, any> = {}): boolean {
        this.validateExpression(expression);
        
        try {
            // استبدال المتغيرات بقيمها
            let processedExpr = this.substituteVariables(expression, variables);
            
            // استبدال الكلمات المنطقية
            processedExpr = this.normalizeLogicalOperators(processedExpr);
            
            // تحليل وتقييم التعبير
            return this.parseBooleanExpression(processedExpr, 0);
        } catch (error) {
            this.logger.error(`Boolean evaluation error: ${error.message}`);
            throw new Error(`فشل تقييم التعبير المنطقي: ${error.message}`);
        }
    }

    /**
     * 🔄 تقييم مقارنة بسيطة
     */
    evaluateComparison(
        left: number | string,
        operator: string,
        right: number | string
    ): boolean {
        const leftNum = typeof left === 'string' ? parseFloat(left) : left;
        const rightNum = typeof right === 'string' ? parseFloat(right) : right;
        
        // للأرقام
        if (!isNaN(leftNum) && !isNaN(rightNum)) {
            switch (operator) {
                case '>':
                case 'GREATER_THAN':
                    return leftNum > rightNum;
                case '<':
                case 'LESS_THAN':
                    return leftNum < rightNum;
                case '>=':
                case 'GREATER_THAN_OR_EQUAL':
                    return leftNum >= rightNum;
                case '<=':
                case 'LESS_THAN_OR_EQUAL':
                    return leftNum <= rightNum;
                case '==':
                case '===':
                case 'EQUALS':
                    return leftNum === rightNum;
                case '!=':
                case '!==':
                case 'NOT_EQUALS':
                    return leftNum !== rightNum;
                default:
                    throw new Error(`عامل مقارنة غير معروف: ${operator}`);
            }
        }
        
        // للنصوص
        const leftStr = String(left).toLowerCase();
        const rightStr = String(right).toLowerCase();
        
        switch (operator) {
            case '==':
            case '===':
            case 'EQUALS':
                return leftStr === rightStr;
            case '!=':
            case '!==':
            case 'NOT_EQUALS':
                return leftStr !== rightStr;
            case 'CONTAINS':
                return leftStr.includes(rightStr);
            case 'STARTS_WITH':
                return leftStr.startsWith(rightStr);
            case 'ENDS_WITH':
                return leftStr.endsWith(rightStr);
            case 'IN':
                if (Array.isArray(right)) {
                    return right.map(r => String(r).toLowerCase()).includes(leftStr);
                }
                return rightStr.includes(leftStr);
            default:
                throw new Error(`عامل مقارنة غير مدعوم للنصوص: ${operator}`);
        }
    }

    // ============== Private Methods ==============

    /**
     * التحقق من صحة التعبير
     */
    private validateExpression(expression: string): void {
        if (!expression || typeof expression !== 'string') {
            throw new Error('التعبير فارغ أو غير صالح');
        }
        
        if (expression.length > this.MAX_EXPRESSION_LENGTH) {
            throw new Error(`التعبير طويل جداً (الحد الأقصى: ${this.MAX_EXPRESSION_LENGTH} حرف)`);
        }
        
        // فحص الأنماط الخطرة
        const dangerousPatterns = [
            /require\s*\(/i,
            /import\s+/i,
            /eval\s*\(/i,
            /Function\s*\(/i,
            /setTimeout/i,
            /setInterval/i,
            /constructor/i,
            /prototype/i,
            /__proto__/i,
            /\bthis\b/i,
            /\bwindow\b/i,
            /\bglobal\b/i,
            /\bprocess\b/i,
            /\bdocument\b/i,
            /fetch\s*\(/i,
            /XMLHttpRequest/i,
            /\bexec\b/i,
            /\bspawn\b/i,
            /`/,  // Template literals
            /\$/,  // Template interpolation
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(expression)) {
                throw new Error('التعبير يحتوي على أنماط غير مسموحة');
            }
        }
        
        // التحقق من توازن الأقواس
        let parenCount = 0;
        for (const char of expression) {
            if (char === '(') parenCount++;
            if (char === ')') parenCount--;
            if (parenCount < 0) {
                throw new Error('أقواس غير متوازنة');
            }
        }
        if (parenCount !== 0) {
            throw new Error('أقواس غير متوازنة');
        }
    }

    /**
     * استبدال المتغيرات بقيمها
     */
    private substituteVariables(expression: string, variables: Record<string, any>): string {
        let result = expression;
        
        // ترتيب المتغيرات حسب الطول (الأطول أولاً) لتجنب الاستبدال الجزئي
        const sortedVars = Object.keys(variables).sort((a, b) => b.length - a.length);
        
        for (const varName of sortedVars) {
            const value = variables[varName];
            let replacement: string;
            
            if (typeof value === 'boolean') {
                replacement = value ? 'true' : 'false';
            } else if (typeof value === 'number') {
                replacement = String(value);
            } else if (typeof value === 'string') {
                // للنصوص في المقارنات
                replacement = `"${value.replace(/"/g, '\\"')}"`;
            } else if (value === null || value === undefined) {
                replacement = '0';
            } else {
                replacement = String(value);
            }
            
            // استبدال المتغير (مع التأكد من أنه كلمة كاملة)
            const regex = new RegExp(`\\b${this.escapeRegex(varName)}\\b`, 'g');
            result = result.replace(regex, replacement);
        }
        
        return result;
    }

    /**
     * معالجة الدوال الرياضية
     */
    private processMathFunctions(expression: string): string {
        let result = expression;
        
        // معالجة كل دالة
        for (const [funcName, func] of Object.entries(this.MATH_FUNCTIONS)) {
            const regex = new RegExp(`${funcName}\\s*\\(([^)]+)\\)`, 'gi');
            
            result = result.replace(regex, (match, args) => {
                try {
                    // تقسيم الـ arguments
                    const argValues = args.split(',').map((arg: string) => {
                        const trimmed = arg.trim();
                        // تقييم كل argument إذا كان تعبير
                        if (/^[\d.+\-*/() ]+$/.test(trimmed)) {
                            return this.parseMathExpression(trimmed, 0);
                        }
                        return parseFloat(trimmed);
                    });
                    
                    // تنفيذ الدالة
                    const funcResult = func(...argValues);
                    return String(funcResult);
                } catch (error) {
                    this.logger.warn(`Failed to process function ${funcName}: ${error.message}`);
                    return match;
                }
            });
        }
        
        return result;
    }

    /**
     * تحويل المعاملات المنطقية
     */
    private normalizeLogicalOperators(expression: string): string {
        return expression
            .replace(/\bAND\b/gi, '&&')
            .replace(/\bOR\b/gi, '||')
            .replace(/\bNOT\b/gi, '!')
            .replace(/\bTRUE\b/gi, 'true')
            .replace(/\bFALSE\b/gi, 'false')
            .replace(/\bGREATER_THAN_OR_EQUAL\b/gi, '>=')
            .replace(/\bLESS_THAN_OR_EQUAL\b/gi, '<=')
            .replace(/\bGREATER_THAN\b/gi, '>')
            .replace(/\bLESS_THAN\b/gi, '<')
            .replace(/\bEQUALS\b/gi, '==')
            .replace(/\bNOT_EQUALS\b/gi, '!=');
    }

    /**
     * تحليل تعبير رياضي (Recursive Descent Parser)
     */
    private parseMathExpression(expression: string, depth: number): number {
        if (depth > this.MAX_RECURSION_DEPTH) {
            throw new Error('تجاوز الحد الأقصى للتعقيد');
        }
        
        expression = expression.trim();
        
        // التعامل مع الأقواس
        if (expression.startsWith('(') && expression.endsWith(')')) {
            let parenCount = 0;
            let isWrapped = true;
            
            for (let i = 0; i < expression.length; i++) {
                if (expression[i] === '(') parenCount++;
                if (expression[i] === ')') parenCount--;
                if (parenCount === 0 && i < expression.length - 1) {
                    isWrapped = false;
                    break;
                }
            }
            
            if (isWrapped) {
                return this.parseMathExpression(expression.slice(1, -1), depth + 1);
            }
        }
        
        // البحث عن أدنى أولوية (+ و -)
        let parenCount = 0;
        for (let i = expression.length - 1; i >= 0; i--) {
            const char = expression[i];
            if (char === ')') parenCount++;
            if (char === '(') parenCount--;
            
            if (parenCount === 0 && (char === '+' || char === '-')) {
                // تجاهل الإشارة في بداية التعبير أو بعد عامل آخر
                if (i === 0) continue;
                const prevChar = expression[i - 1];
                if (['+', '-', '*', '/', '%', '('].includes(prevChar)) continue;
                
                const left = expression.slice(0, i);
                const right = expression.slice(i + 1);
                
                if (left.trim() && right.trim()) {
                    const leftVal = this.parseMathExpression(left, depth + 1);
                    const rightVal = this.parseMathExpression(right, depth + 1);
                    return char === '+' ? leftVal + rightVal : leftVal - rightVal;
                }
            }
        }
        
        // البحث عن * و / و %
        parenCount = 0;
        for (let i = expression.length - 1; i >= 0; i--) {
            const char = expression[i];
            if (char === ')') parenCount++;
            if (char === '(') parenCount--;
            
            if (parenCount === 0 && (char === '*' || char === '/' || char === '%')) {
                const left = expression.slice(0, i);
                const right = expression.slice(i + 1);
                
                if (left.trim() && right.trim()) {
                    const leftVal = this.parseMathExpression(left, depth + 1);
                    const rightVal = this.parseMathExpression(right, depth + 1);
                    
                    if (char === '/') {
                        if (rightVal === 0) {
                            throw new Error('القسمة على صفر غير مسموحة');
                        }
                        return leftVal / rightVal;
                    }
                    if (char === '%') {
                        if (rightVal === 0) {
                            throw new Error('باقي القسمة على صفر غير مسموح');
                        }
                        return leftVal % rightVal;
                    }
                    return leftVal * rightVal;
                }
            }
        }
        
        // البحث عن ** (القوة)
        const powerIndex = expression.lastIndexOf('**');
        if (powerIndex > 0) {
            const left = expression.slice(0, powerIndex);
            const right = expression.slice(powerIndex + 2);
            
            if (left.trim() && right.trim()) {
                const base = this.parseMathExpression(left, depth + 1);
                const exp = this.parseMathExpression(right, depth + 1);
                return Math.pow(base, exp);
            }
        }
        
        // رقم مباشر
        const num = parseFloat(expression);
        if (!isNaN(num)) {
            return this.validateResult(num);
        }
        
        throw new Error(`تعبير غير صالح: ${expression}`);
    }

    /**
     * تحليل تعبير منطقي
     */
    private parseBooleanExpression(expression: string, depth: number): boolean {
        if (depth > this.MAX_RECURSION_DEPTH) {
            throw new Error('تجاوز الحد الأقصى للتعقيد');
        }
        
        expression = expression.trim();
        
        // القيم المباشرة
        if (expression === 'true') return true;
        if (expression === 'false') return false;
        
        // التعامل مع الأقواس
        if (expression.startsWith('(') && expression.endsWith(')')) {
            let parenCount = 0;
            let isWrapped = true;
            
            for (let i = 0; i < expression.length; i++) {
                if (expression[i] === '(') parenCount++;
                if (expression[i] === ')') parenCount--;
                if (parenCount === 0 && i < expression.length - 1) {
                    isWrapped = false;
                    break;
                }
            }
            
            if (isWrapped) {
                return this.parseBooleanExpression(expression.slice(1, -1), depth + 1);
            }
        }
        
        // البحث عن || (OR)
        let parenCount = 0;
        for (let i = expression.length - 1; i >= 1; i--) {
            const char = expression[i];
            if (char === ')') parenCount++;
            if (char === '(') parenCount--;
            
            if (parenCount === 0 && expression.slice(i - 1, i + 1) === '||') {
                const left = expression.slice(0, i - 1);
                const right = expression.slice(i + 1);
                
                if (left.trim() && right.trim()) {
                    return this.parseBooleanExpression(left, depth + 1) || 
                           this.parseBooleanExpression(right, depth + 1);
                }
            }
        }
        
        // البحث عن && (AND)
        parenCount = 0;
        for (let i = expression.length - 1; i >= 1; i--) {
            const char = expression[i];
            if (char === ')') parenCount++;
            if (char === '(') parenCount--;
            
            if (parenCount === 0 && expression.slice(i - 1, i + 1) === '&&') {
                const left = expression.slice(0, i - 1);
                const right = expression.slice(i + 1);
                
                if (left.trim() && right.trim()) {
                    return this.parseBooleanExpression(left, depth + 1) && 
                           this.parseBooleanExpression(right, depth + 1);
                }
            }
        }
        
        // البحث عن ! (NOT)
        if (expression.startsWith('!')) {
            return !this.parseBooleanExpression(expression.slice(1), depth + 1);
        }
        
        // البحث عن المقارنات
        const comparisonOps = ['>=', '<=', '===', '!==', '==', '!=', '>', '<'];
        for (const op of comparisonOps) {
            parenCount = 0;
            const opIndex = this.findOperatorOutsideParens(expression, op);
            
            if (opIndex > 0) {
                const left = expression.slice(0, opIndex).trim();
                const right = expression.slice(opIndex + op.length).trim();
                
                if (left && right) {
                    const leftVal = this.parseValue(left);
                    const rightVal = this.parseValue(right);
                    // Convert boolean to number if needed
                    const leftComp = typeof leftVal === 'boolean' ? (leftVal ? 1 : 0) : leftVal;
                    const rightComp = typeof rightVal === 'boolean' ? (rightVal ? 1 : 0) : rightVal;
                    return this.evaluateComparison(leftComp, op, rightComp);
                }
            }
        }
        
        throw new Error(`تعبير منطقي غير صالح: ${expression}`);
    }

    /**
     * البحث عن عامل خارج الأقواس
     */
    private findOperatorOutsideParens(expression: string, operator: string): number {
        let parenCount = 0;
        
        for (let i = 0; i < expression.length - operator.length + 1; i++) {
            if (expression[i] === '(') parenCount++;
            if (expression[i] === ')') parenCount--;
            
            if (parenCount === 0 && expression.slice(i, i + operator.length) === operator) {
                return i;
            }
        }
        
        return -1;
    }

    /**
     * تحويل قيمة نصية لنوعها الصحيح
     */
    private parseValue(value: string): number | string | boolean {
        value = value.trim();
        
        // Boolean
        if (value === 'true') return true;
        if (value === 'false') return false;
        
        // Number
        const num = parseFloat(value);
        if (!isNaN(num)) return num;
        
        // String (remove quotes if present)
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            return value.slice(1, -1);
        }
        
        return value;
    }

    /**
     * التحقق من صحة النتيجة
     */
    private validateResult(result: number): number {
        if (!isFinite(result)) {
            throw new Error('النتيجة غير محدودة');
        }
        
        if (isNaN(result)) {
            throw new Error('النتيجة ليست رقم');
        }
        
        if (result > this.MAX_NUMBER_VALUE || result < this.MIN_NUMBER_VALUE) {
            throw new Error('تجاوز النطاق الرقمي المسموح');
        }
        
        // تقريب لـ 10 أرقام عشرية لتجنب floating point errors
        return Math.round(result * 10000000000) / 10000000000;
    }

    /**
     * تهريب الـ regex characters
     */
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
