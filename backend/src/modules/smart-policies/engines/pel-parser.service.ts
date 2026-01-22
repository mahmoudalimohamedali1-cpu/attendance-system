/**
 * 📝 Policy Expression Language (PEL) Parser
 * A simple, human-readable language for defining policy rules
 * 
 * Syntax Examples:
 * - WHEN attendance > 95% THEN ADD 500 AS 'مكافأة انضباط'
 * - WHEN lateMinutes >= 15 AND lateMinutes < 30 THEN DEDUCT 50 AS 'خصم تأخير'
 * - WHEN tenure >= 12 months THEN ADD 5% OF basic AS 'علاوة سنوية'
 * - WHEN overtimeHours > 0 THEN ADD overtimeHours * hourlyRate * 1.5 AS 'بدل إضافي'
 */

import { Injectable, Logger } from '@nestjs/common';

// ============== Types ==============

export interface PELParseResult {
    success: boolean;
    parsedRule?: {
        understood: boolean;
        explanation: string;
        conditions: PELCondition[];
        actions: PELAction[];
        conditionLogic: 'ALL' | 'ANY';
    };
    error?: string;
    suggestions?: string[];
}

export interface PELCondition {
    field: string;
    operator: string;
    value: any;
    unit?: string;
}

export interface PELAction {
    type: 'ADD' | 'DEDUCT' | 'SET';
    valueType: 'FIXED' | 'PERCENTAGE' | 'FORMULA';
    value: any;
    base?: 'BASIC' | 'TOTAL' | 'DAILY_RATE' | 'HOURLY_RATE';
    componentCode: string;
    descriptionAr: string;
}

// ============== Token Types ==============

type TokenType =
    | 'WHEN' | 'THEN' | 'AND' | 'OR' | 'AS' | 'OF'
    | 'ADD' | 'DEDUCT' | 'SET'
    | 'IDENTIFIER' | 'NUMBER' | 'PERCENTAGE' | 'STRING'
    | 'OPERATOR' | 'UNIT'
    | 'LPAREN' | 'RPAREN'
    | 'MULTIPLY' | 'DIVIDE' | 'PLUS' | 'MINUS'
    | 'EOF';

interface Token {
    type: TokenType;
    value: any;
    position: number;
}

// ============== Field Mappings ==============

const FIELD_ALIASES: Record<string, string> = {
    // Arabic aliases
    'حضور': 'attendancePercentage',
    'نسبة_الحضور': 'attendancePercentage',
    'تأخير': 'lateMinutes',
    'دقائق_التأخير': 'lateMinutes',
    'غياب': 'absentDays',
    'أيام_الغياب': 'absentDays',
    'إضافي': 'overtimeHours',
    'ساعات_إضافية': 'overtimeHours',
    'سنوات_الخدمة': 'yearsOfService',
    'مدة_الخدمة': 'tenure',
    'الراتب': 'basicSalary',
    'الأساسي': 'basicSalary',

    // English aliases
    'attendance': 'attendancePercentage',
    'late': 'lateMinutes',
    'lateminutes': 'lateMinutes',
    'absent': 'absentDays',
    'absentdays': 'absentDays',
    'overtime': 'overtimeHours',
    'overtimehours': 'overtimeHours',
    'tenure': 'yearsOfService',
    'years': 'yearsOfService',
    'yearsofservice': 'yearsOfService',
    'basic': 'basicSalary',
    'basicsalary': 'basicSalary',
    'salary': 'basicSalary',
    'hourlyrate': 'hourlyRate',
    'dailyrate': 'dailyRate',
};

const OPERATOR_ALIASES: Record<string, string> = {
    '>': 'gt',
    '>=': 'gte',
    '<': 'lt',
    '<=': 'lte',
    '=': 'eq',
    '==': 'eq',
    '!=': 'neq',
    '<>': 'neq',
    'أكبر': 'gt',
    'أصغر': 'lt',
    'يساوي': 'eq',
};

const UNIT_CONVERSIONS: Record<string, { field: string; multiplier?: number }> = {
    '%': { field: 'percentage' },
    'دقيقة': { field: 'minutes' },
    'دقائق': { field: 'minutes' },
    'minutes': { field: 'minutes' },
    'min': { field: 'minutes' },
    'ساعة': { field: 'hours' },
    'ساعات': { field: 'hours' },
    'hours': { field: 'hours' },
    'hr': { field: 'hours' },
    'يوم': { field: 'days' },
    'أيام': { field: 'days' },
    'days': { field: 'days' },
    'شهر': { field: 'months' },
    'أشهر': { field: 'months' },
    'months': { field: 'months' },
    'سنة': { field: 'years' },
    'سنوات': { field: 'years' },
    'years': { field: 'years' },
};

const COMPONENT_INFERENCE: Record<string, { code: string; descriptionAr: string }> = {
    'late': { code: 'LATE_DEDUCTION', descriptionAr: 'خصم تأخير' },
    'تأخير': { code: 'LATE_DEDUCTION', descriptionAr: 'خصم تأخير' },
    'absent': { code: 'ABSENCE_DEDUCTION', descriptionAr: 'خصم غياب' },
    'غياب': { code: 'ABSENCE_DEDUCTION', descriptionAr: 'خصم غياب' },
    'overtime': { code: 'OVERTIME', descriptionAr: 'بدل عمل إضافي' },
    'إضافي': { code: 'OVERTIME', descriptionAr: 'بدل عمل إضافي' },
    'attendance': { code: 'ATTENDANCE_BONUS', descriptionAr: 'مكافأة انضباط' },
    'حضور': { code: 'ATTENDANCE_BONUS', descriptionAr: 'مكافأة انضباط' },
    'انضباط': { code: 'ATTENDANCE_BONUS', descriptionAr: 'مكافأة انضباط' },
    'tenure': { code: 'TENURE_BONUS', descriptionAr: 'علاوة سنوية' },
    'loyalty': { code: 'LOYALTY_BONUS', descriptionAr: 'مكافأة ولاء' },
    'ولاء': { code: 'LOYALTY_BONUS', descriptionAr: 'مكافأة ولاء' },
    'bonus': { code: 'SMART_BONUS', descriptionAr: 'مكافأة' },
    'مكافأة': { code: 'SMART_BONUS', descriptionAr: 'مكافأة' },
    'deduction': { code: 'SMART_DEDUCTION', descriptionAr: 'خصم' },
    'خصم': { code: 'SMART_DEDUCTION', descriptionAr: 'خصم' },
};

// ============== PEL Parser Service ==============

@Injectable()
export class PELParserService {
    private readonly logger = new Logger(PELParserService.name);

    private input: string = '';
    private position: number = 0;
    private tokens: Token[] = [];
    private currentToken: number = 0;

    /**
     * Parse a PEL expression and return structured rule
     */
    parse(expression: string): PELParseResult {
        try {
            this.input = expression.trim();
            this.position = 0;
            this.tokens = [];
            this.currentToken = 0;

            if (!this.input) {
                return { success: false, error: 'Expression cannot be empty' };
            }

            // Tokenize
            this.tokenize();

            if (this.tokens.length === 0) {
                return { success: false, error: 'No valid tokens found' };
            }

            // Parse
            const result = this.parseExpression();

            return {
                success: true,
                parsedRule: {
                    understood: true,
                    explanation: `Parsed from PEL: ${expression}`,
                    conditions: result.conditions,
                    actions: result.actions,
                    conditionLogic: result.conditionLogic,
                },
            };
        } catch (err) {
            const error = err as Error;
            this.logger.error(`PEL Parse Error: ${error.message}`);
            return {
                success: false,
                error: error.message,
                suggestions: this.getSuggestions(expression),
            };
        }
    }

    /**
     * Validate a PEL expression without full parsing
     */
    validate(expression: string): { valid: boolean; errors: string[] } {
        const result = this.parse(expression);
        if (result.success) {
            return { valid: true, errors: [] };
        }
        return { valid: false, errors: [result.error || 'Unknown error'] };
    }

    /**
     * Get autocomplete suggestions based on partial input
     */
    getSuggestions(partial: string): string[] {
        const suggestions: string[] = [];
        const lower = partial.toLowerCase();

        // Suggest WHEN if starting
        if (!lower.includes('when') && !lower.includes('عندما')) {
            suggestions.push('WHEN attendance > 95% THEN ADD 500 AS \'مكافأة\'');
            suggestions.push('عندما حضور > 95% ثم أضف 500');
        }

        // Suggest fields
        if (lower.includes('when') && !lower.includes('then')) {
            suggestions.push('...lateMinutes >= 15 THEN...');
            suggestions.push('...absentDays > 0 THEN...');
            suggestions.push('...overtimeHours > 0 THEN...');
        }

        // Suggest actions
        if (lower.includes('then') && !lower.includes('add') && !lower.includes('deduct')) {
            suggestions.push('...THEN ADD 500 AS \'مكافأة\'');
            suggestions.push('...THEN DEDUCT 50 AS \'خصم\'');
            suggestions.push('...THEN ADD 5% OF basic AS \'علاوة\'');
        }

        return suggestions;
    }

    // ============== Lexer ==============

    private tokenize(): void {
        while (this.position < this.input.length) {
            this.skipWhitespace();
            if (this.position >= this.input.length) break;

            const char = this.input[this.position];
            const startPos = this.position;

            // String literal
            if (char === "'" || char === '"') {
                this.tokens.push(this.readString());
                continue;
            }

            // Number (including percentage)
            if (this.isDigit(char) || (char === '-' && this.isDigit(this.peek(1)))) {
                this.tokens.push(this.readNumber());
                continue;
            }

            // Operators
            if ('>=<!='.includes(char)) {
                this.tokens.push(this.readOperator());
                continue;
            }

            // Math operators
            if (char === '*') {
                this.tokens.push({ type: 'MULTIPLY', value: '*', position: startPos });
                this.position++;
                continue;
            }
            if (char === '/') {
                this.tokens.push({ type: 'DIVIDE', value: '/', position: startPos });
                this.position++;
                continue;
            }
            if (char === '+') {
                this.tokens.push({ type: 'PLUS', value: '+', position: startPos });
                this.position++;
                continue;
            }
            if (char === '-' && !this.isDigit(this.peek(1))) {
                this.tokens.push({ type: 'MINUS', value: '-', position: startPos });
                this.position++;
                continue;
            }

            // Parentheses
            if (char === '(') {
                this.tokens.push({ type: 'LPAREN', value: '(', position: startPos });
                this.position++;
                continue;
            }
            if (char === ')') {
                this.tokens.push({ type: 'RPAREN', value: ')', position: startPos });
                this.position++;
                continue;
            }

            // Identifier or keyword
            if (this.isIdentifierStart(char)) {
                this.tokens.push(this.readIdentifier());
                continue;
            }

            // Skip unknown characters
            this.position++;
        }

        this.tokens.push({ type: 'EOF', value: null, position: this.input.length });
    }

    private skipWhitespace(): void {
        while (this.position < this.input.length && /\s/.test(this.input[this.position])) {
            this.position++;
        }
    }

    private peek(offset: number = 0): string {
        const pos = this.position + offset;
        return pos < this.input.length ? this.input[pos] : '';
    }

    private isDigit(char: string): boolean {
        return /[0-9]/.test(char);
    }

    private isIdentifierStart(char: string): boolean {
        return /[a-zA-Z_\u0600-\u06FF]/.test(char);
    }

    private isIdentifierPart(char: string): boolean {
        return /[a-zA-Z0-9_\u0600-\u06FF]/.test(char);
    }

    private readString(): Token {
        const startPos = this.position;
        const quote = this.input[this.position];
        this.position++; // skip opening quote

        let value = '';
        while (this.position < this.input.length && this.input[this.position] !== quote) {
            value += this.input[this.position];
            this.position++;
        }
        this.position++; // skip closing quote

        return { type: 'STRING', value, position: startPos };
    }

    private readNumber(): Token {
        const startPos = this.position;
        let value = '';

        if (this.input[this.position] === '-') {
            value += '-';
            this.position++;
        }

        while (this.position < this.input.length && (this.isDigit(this.input[this.position]) || this.input[this.position] === '.')) {
            value += this.input[this.position];
            this.position++;
        }

        // Check for percentage
        if (this.input[this.position] === '%') {
            this.position++;
            return { type: 'PERCENTAGE', value: parseFloat(value), position: startPos };
        }

        return { type: 'NUMBER', value: parseFloat(value), position: startPos };
    }

    private readOperator(): Token {
        const startPos = this.position;
        let op = this.input[this.position];
        this.position++;

        if (this.position < this.input.length && '=<>'.includes(this.input[this.position])) {
            op += this.input[this.position];
            this.position++;
        }

        return { type: 'OPERATOR', value: op, position: startPos };
    }

    private readIdentifier(): Token {
        const startPos = this.position;
        let value = '';

        while (this.position < this.input.length && this.isIdentifierPart(this.input[this.position])) {
            value += this.input[this.position];
            this.position++;
        }

        const upper = value.toUpperCase();

        // Keywords
        if (upper === 'WHEN' || value === 'عندما' || value === 'إذا') {
            return { type: 'WHEN', value, position: startPos };
        }
        if (upper === 'THEN' || value === 'ثم' || value === 'فـ') {
            return { type: 'THEN', value, position: startPos };
        }
        if (upper === 'AND' || value === 'و') {
            return { type: 'AND', value, position: startPos };
        }
        if (upper === 'OR' || value === 'أو') {
            return { type: 'OR', value, position: startPos };
        }
        if (upper === 'AS' || value === 'كـ' || value === 'باسم') {
            return { type: 'AS', value, position: startPos };
        }
        if (upper === 'OF' || value === 'من') {
            return { type: 'OF', value, position: startPos };
        }
        if (upper === 'ADD' || value === 'أضف' || value === 'زيادة') {
            return { type: 'ADD', value, position: startPos };
        }
        if (upper === 'DEDUCT' || value === 'اخصم' || value === 'خصم') {
            return { type: 'DEDUCT', value, position: startPos };
        }
        if (upper === 'SET' || value === 'عيّن') {
            return { type: 'SET', value, position: startPos };
        }

        // Check if it's a unit
        if (UNIT_CONVERSIONS[value.toLowerCase()]) {
            return { type: 'UNIT', value: value.toLowerCase(), position: startPos };
        }

        return { type: 'IDENTIFIER', value, position: startPos };
    }

    // ============== Parser ==============

    private parseExpression(): { conditions: PELCondition[]; actions: PELAction[]; conditionLogic: 'ALL' | 'ANY' } {
        const conditions: PELCondition[] = [];
        const actions: PELAction[] = [];
        let conditionLogic: 'ALL' | 'ANY' = 'ALL';

        // Expect WHEN
        if (this.current().type !== 'WHEN') {
            throw new Error('Expression must start with WHEN');
        }
        this.advance();

        // Parse conditions
        conditions.push(this.parseCondition());

        while (this.current().type === 'AND' || this.current().type === 'OR') {
            if (this.current().type === 'OR') {
                conditionLogic = 'ANY';
            }
            this.advance();
            conditions.push(this.parseCondition());
        }

        // Expect THEN
        if (this.current().type !== 'THEN') {
            throw new Error('Expected THEN after conditions');
        }
        this.advance();

        // Parse actions
        actions.push(this.parseAction());

        return { conditions, actions, conditionLogic };
    }

    private parseCondition(): PELCondition {
        // Field
        if (this.current().type !== 'IDENTIFIER') {
            throw new Error(`Expected field name, got ${this.current().type}`);
        }
        const fieldRaw = this.current().value;
        const field = FIELD_ALIASES[fieldRaw.toLowerCase()] || fieldRaw;
        this.advance();

        // Operator
        if (this.current().type !== 'OPERATOR') {
            throw new Error(`Expected operator, got ${this.current().type}`);
        }
        const opRaw = this.current().value;
        const operator = OPERATOR_ALIASES[opRaw] || opRaw;
        this.advance();

        // Value
        let value: any;
        let unit: string | undefined;

        if (this.current().type === 'NUMBER') {
            value = this.current().value;
            this.advance();
        } else if (this.current().type === 'PERCENTAGE') {
            value = this.current().value;
            unit = '%';
            this.advance();
        } else {
            throw new Error(`Expected number, got ${this.current().type}`);
        }

        // Optional unit
        if (this.current().type === 'UNIT') {
            unit = this.current().value;
            this.advance();
        }

        return { field, operator, value, unit };
    }

    private parseAction(): PELAction {
        // Action type
        let type: 'ADD' | 'DEDUCT' | 'SET';
        if (this.current().type === 'ADD') {
            type = 'ADD';
        } else if (this.current().type === 'DEDUCT') {
            type = 'DEDUCT';
        } else if (this.current().type === 'SET') {
            type = 'SET';
        } else {
            throw new Error(`Expected ADD, DEDUCT, or SET, got ${this.current().type}`);
        }
        this.advance();

        // Value (may be formula)
        let valueType: 'FIXED' | 'PERCENTAGE' | 'FORMULA' = 'FIXED';
        let value: any;
        let base: 'BASIC' | 'TOTAL' | 'DAILY_RATE' | 'HOURLY_RATE' | undefined;

        if (this.current().type === 'NUMBER') {
            value = this.current().value;
            this.advance();
        } else if (this.current().type === 'PERCENTAGE') {
            value = this.current().value;
            valueType = 'PERCENTAGE';
            this.advance();

            // Check for OF base
            if (this.current().type === 'OF') {
                this.advance();
                if (this.current().type === 'IDENTIFIER') {
                    const baseName = this.current().value.toLowerCase();
                    if (baseName === 'basic' || baseName === 'الأساسي') {
                        base = 'BASIC';
                    } else if (baseName === 'total' || baseName === 'الإجمالي') {
                        base = 'TOTAL';
                    } else if (baseName === 'daily' || baseName === 'اليومي') {
                        base = 'DAILY_RATE';
                    } else if (baseName === 'hourly' || baseName === 'الساعة') {
                        base = 'HOURLY_RATE';
                    }
                    this.advance();
                }
            }
        } else if (this.current().type === 'IDENTIFIER') {
            // Formula (e.g., overtimeHours * hourlyRate * 1.5)
            valueType = 'FORMULA';
            value = this.parseFormula();
        } else {
            throw new Error(`Expected value, got ${this.current().type}`);
        }

        // Component name (AS 'name')
        let componentCode = 'SMART_ADJUSTMENT';
        let descriptionAr = 'تعديل ذكي';

        if (this.current().type === 'AS') {
            this.advance();
            if (this.current().type === 'STRING') {
                descriptionAr = this.current().value;
                // Infer component code from description
                const inferred = this.inferComponent(descriptionAr, type);
                componentCode = inferred.code;
                this.advance();
            }
        } else {
            // Try to infer from action type
            componentCode = type === 'DEDUCT' ? 'SMART_DEDUCTION' : 'SMART_BONUS';
        }

        return { type, valueType, value, base, componentCode, descriptionAr };
    }

    private parseFormula(): string {
        let formula = '';

        while (
            this.current().type === 'IDENTIFIER' ||
            this.current().type === 'NUMBER' ||
            this.current().type === 'MULTIPLY' ||
            this.current().type === 'DIVIDE' ||
            this.current().type === 'PLUS' ||
            this.current().type === 'MINUS' ||
            this.current().type === 'LPAREN' ||
            this.current().type === 'RPAREN'
        ) {
            const token = this.current();
            if (token.type === 'IDENTIFIER') {
                // Resolve field alias
                const resolved = FIELD_ALIASES[token.value.toLowerCase()] || token.value;
                formula += resolved;
            } else {
                formula += token.value;
            }
            formula += ' ';
            this.advance();
        }

        return formula.trim();
    }

    private inferComponent(description: string, actionType: 'ADD' | 'DEDUCT' | 'SET'): { code: string; descriptionAr: string } {
        const lower = description.toLowerCase();

        for (const [key, value] of Object.entries(COMPONENT_INFERENCE)) {
            if (lower.includes(key)) {
                return value;
            }
        }

        return {
            code: actionType === 'DEDUCT' ? 'SMART_DEDUCTION' : 'SMART_BONUS',
            descriptionAr: description,
        };
    }

    private current(): Token {
        return this.tokens[this.currentToken] || { type: 'EOF', value: null, position: this.input.length };
    }

    private advance(): void {
        if (this.currentToken < this.tokens.length) {
            this.currentToken++;
        }
    }
}
