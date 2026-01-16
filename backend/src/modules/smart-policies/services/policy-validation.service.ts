import { Injectable, Logger } from '@nestjs/common';
import {
    VALIDATION_LIMITS,
    OPERATOR_MAPPINGS,
    ACTION_TYPES,
    VALUE_TYPES,
    SCOPE_TYPES,
    FIELD_SHORTCUTS,
} from '../constants/smart-policy.constants';
import {
    isValidPeriodFormat,
    isValidUUID,
    isValidNumber,
} from '../helpers/smart-policy.helpers';

/**
 * 🔒 Policy Validation Service
 * خدمة التحقق من صحة السياسات
 * 
 * Features:
 * - التحقق من نص السياسة
 * - التحقق من الشروط
 * - التحقق من الإجراءات
 * - التحقق من المعادلات
 * - تجميع الأخطاء
 */

// ============== Types ==============

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}

export interface ValidationError {
    field: string;
    message: string;
    code: string;
    value?: any;
}

export interface ValidationWarning {
    field: string;
    message: string;
    suggestion?: string;
}

export interface PolicyCondition {
    field: string;
    operator: string;
    value: any;
    optional?: boolean;
}

export interface PolicyAction {
    type: string;
    valueType?: string;
    value?: any;
    formula?: string;
    componentCode?: string;
    description?: string;
}

export interface ParsedPolicy {
    trigger?: {
        event: string;
        subEvent?: string;
    };
    conditions?: PolicyCondition[];
    actions?: PolicyAction[];
    scope?: {
        type: string;
        targetId?: string;
        targetName?: string;
    };
    explanation?: string;
}

// ============== Implementation ==============

@Injectable()
export class PolicyValidationService {
    private readonly logger = new Logger(PolicyValidationService.name);

    /**
     * التحقق الكامل من السياسة
     */
    validatePolicy(
        originalText: string,
        parsedPolicy?: ParsedPolicy,
    ): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        // التحقق من النص الأصلي
        this.validateOriginalText(originalText, errors, warnings);

        // التحقق من السياسة المُحللة
        if (parsedPolicy) {
            this.validateParsedPolicy(parsedPolicy, errors, warnings);
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * التحقق من النص الأصلي
     */
    validateOriginalText(
        text: string,
        errors: ValidationError[],
        warnings: ValidationWarning[],
    ): void {
        // التحقق من الوجود
        if (!text || typeof text !== 'string') {
            errors.push({
                field: 'originalText',
                message: 'النص الأصلي مطلوب',
                code: 'REQUIRED',
            });
            return;
        }

        const trimmed = text.trim();

        // التحقق من الطول الأدنى
        if (trimmed.length < VALIDATION_LIMITS.MIN_POLICY_TEXT_LENGTH) {
            errors.push({
                field: 'originalText',
                message: `النص يجب أن يكون ${VALIDATION_LIMITS.MIN_POLICY_TEXT_LENGTH} أحرف على الأقل`,
                code: 'MIN_LENGTH',
                value: trimmed.length,
            });
        }

        // التحقق من الطول الأقصى
        if (trimmed.length > VALIDATION_LIMITS.MAX_POLICY_TEXT_LENGTH) {
            errors.push({
                field: 'originalText',
                message: `النص يجب أن لا يتجاوز ${VALIDATION_LIMITS.MAX_POLICY_TEXT_LENGTH} حرف`,
                code: 'MAX_LENGTH',
                value: trimmed.length,
            });
        }

        // التحقق من الأنماط الخطرة
        const dangerousPatterns = [
            { pattern: /<script/i, name: 'script tags' },
            { pattern: /javascript:/i, name: 'javascript protocol' },
            { pattern: /on\w+\s*=/i, name: 'event handlers' },
            { pattern: /eval\s*\(/i, name: 'eval function' },
        ];

        for (const { pattern, name } of dangerousPatterns) {
            if (pattern.test(trimmed)) {
                errors.push({
                    field: 'originalText',
                    message: `النص يحتوي على أنماط غير مسموحة (${name})`,
                    code: 'DANGEROUS_PATTERN',
                });
            }
        }

        // تحذير إذا كان النص قصير جداً
        if (trimmed.length < 20 && errors.length === 0) {
            warnings.push({
                field: 'originalText',
                message: 'النص قصير جداً وقد لا يحتوي على معلومات كافية',
                suggestion: 'أضف المزيد من التفاصيل للحصول على نتائج أفضل',
            });
        }
    }

    /**
     * التحقق من السياسة المُحللة
     */
    validateParsedPolicy(
        policy: ParsedPolicy,
        errors: ValidationError[],
        warnings: ValidationWarning[],
    ): void {
        // التحقق من الـ trigger
        if (policy.trigger) {
            this.validateTrigger(policy.trigger, errors, warnings);
        } else {
            errors.push({
                field: 'trigger',
                message: 'يجب تحديد حدث التشغيل',
                code: 'REQUIRED',
            });
        }

        // التحقق من الشروط
        if (policy.conditions) {
            this.validateConditions(policy.conditions, errors, warnings);
        }

        // التحقق من الإجراءات
        if (policy.actions) {
            this.validateActions(policy.actions, errors, warnings);
        } else {
            errors.push({
                field: 'actions',
                message: 'يجب تحديد إجراء واحد على الأقل',
                code: 'REQUIRED',
            });
        }

        // التحقق من النطاق
        if (policy.scope) {
            this.validateScope(policy.scope, errors, warnings);
        }
    }

    /**
     * التحقق من الـ trigger
     */
    validateTrigger(
        trigger: ParsedPolicy['trigger'],
        errors: ValidationError[],
        warnings: ValidationWarning[],
    ): void {
        if (!trigger?.event) {
            errors.push({
                field: 'trigger.event',
                message: 'حدث التشغيل مطلوب',
                code: 'REQUIRED',
            });
            return;
        }

        const validEvents = [
            'ATTENDANCE', 'LEAVE', 'CUSTODY', 'PAYROLL',
            'ANNIVERSARY', 'CONTRACT', 'DISCIPLINARY',
            'PERFORMANCE', 'CUSTOM',
        ];

        if (!validEvents.includes(trigger.event.toUpperCase())) {
            warnings.push({
                field: 'trigger.event',
                message: `حدث التشغيل "${trigger.event}" غير معروف`,
                suggestion: `استخدم أحد الأحداث: ${validEvents.join(', ')}`,
            });
        }
    }

    /**
     * التحقق من الشروط
     */
    validateConditions(
        conditions: PolicyCondition[],
        errors: ValidationError[],
        warnings: ValidationWarning[],
    ): void {
        if (!Array.isArray(conditions)) {
            errors.push({
                field: 'conditions',
                message: 'الشروط يجب أن تكون مصفوفة',
                code: 'INVALID_TYPE',
            });
            return;
        }

        if (conditions.length > VALIDATION_LIMITS.MAX_CONDITIONS_PER_POLICY) {
            errors.push({
                field: 'conditions',
                message: `الحد الأقصى للشروط هو ${VALIDATION_LIMITS.MAX_CONDITIONS_PER_POLICY}`,
                code: 'MAX_EXCEEDED',
                value: conditions.length,
            });
        }

        conditions.forEach((condition, index) => {
            this.validateCondition(condition, index, errors, warnings);
        });
    }

    /**
     * التحقق من شرط واحد
     */
    validateCondition(
        condition: PolicyCondition,
        index: number,
        errors: ValidationError[],
        warnings: ValidationWarning[],
    ): void {
        const prefix = `conditions[${index}]`;

        // التحقق من الحقل
        if (!condition.field) {
            errors.push({
                field: `${prefix}.field`,
                message: 'اسم الحقل مطلوب',
                code: 'REQUIRED',
            });
        } else {
            // التحقق من صحة اسم الحقل
            const validFieldPattern = /^[a-zA-Z_][a-zA-Z0-9_.]*$/;
            if (!validFieldPattern.test(condition.field)) {
                errors.push({
                    field: `${prefix}.field`,
                    message: 'اسم الحقل غير صالح',
                    code: 'INVALID_FORMAT',
                    value: condition.field,
                });
            }

            // تحذير إذا كان الحقل غير معروف
            const knownFields = Object.keys(FIELD_SHORTCUTS);
            const isKnown = knownFields.includes(condition.field) ||
                condition.field.includes('.');
            
            if (!isKnown) {
                warnings.push({
                    field: `${prefix}.field`,
                    message: `الحقل "${condition.field}" غير معروف`,
                    suggestion: 'تأكد من صحة اسم الحقل أو استخدم الاختصارات المتاحة',
                });
            }
        }

        // التحقق من العامل
        if (!condition.operator) {
            errors.push({
                field: `${prefix}.operator`,
                message: 'عامل المقارنة مطلوب',
                code: 'REQUIRED',
            });
        } else {
            const validOperators = Object.values(OPERATOR_MAPPINGS).flat();
            const normalizedOp = condition.operator.toUpperCase();
            
            if (!validOperators.includes(normalizedOp) && 
                !validOperators.includes(condition.operator)) {
                errors.push({
                    field: `${prefix}.operator`,
                    message: `عامل المقارنة "${condition.operator}" غير صالح`,
                    code: 'INVALID_OPERATOR',
                    value: condition.operator,
                });
            }
        }

        // التحقق من القيمة
        if (condition.value === undefined && !condition.optional) {
            errors.push({
                field: `${prefix}.value`,
                message: 'القيمة المتوقعة مطلوبة',
                code: 'REQUIRED',
            });
        }
    }

    /**
     * التحقق من الإجراءات
     */
    validateActions(
        actions: PolicyAction[],
        errors: ValidationError[],
        warnings: ValidationWarning[],
    ): void {
        if (!Array.isArray(actions)) {
            errors.push({
                field: 'actions',
                message: 'الإجراءات يجب أن تكون مصفوفة',
                code: 'INVALID_TYPE',
            });
            return;
        }

        if (actions.length === 0) {
            errors.push({
                field: 'actions',
                message: 'يجب تحديد إجراء واحد على الأقل',
                code: 'MIN_LENGTH',
            });
            return;
        }

        if (actions.length > VALIDATION_LIMITS.MAX_ACTIONS_PER_POLICY) {
            errors.push({
                field: 'actions',
                message: `الحد الأقصى للإجراءات هو ${VALIDATION_LIMITS.MAX_ACTIONS_PER_POLICY}`,
                code: 'MAX_EXCEEDED',
                value: actions.length,
            });
        }

        actions.forEach((action, index) => {
            this.validateAction(action, index, errors, warnings);
        });
    }

    /**
     * التحقق من إجراء واحد
     */
    validateAction(
        action: PolicyAction,
        index: number,
        errors: ValidationError[],
        warnings: ValidationWarning[],
    ): void {
        const prefix = `actions[${index}]`;

        // التحقق من نوع الإجراء
        if (!action.type) {
            errors.push({
                field: `${prefix}.type`,
                message: 'نوع الإجراء مطلوب',
                code: 'REQUIRED',
            });
        } else {
            const validTypes = Object.values(ACTION_TYPES);
            if (!validTypes.includes(action.type as any)) {
                warnings.push({
                    field: `${prefix}.type`,
                    message: `نوع الإجراء "${action.type}" غير معروف`,
                    suggestion: `استخدم أحد الأنواع: ${validTypes.join(', ')}`,
                });
            }
        }

        // التحقق من نوع القيمة
        if (action.valueType) {
            const validValueTypes = Object.values(VALUE_TYPES);
            if (!validValueTypes.includes(action.valueType as any)) {
                errors.push({
                    field: `${prefix}.valueType`,
                    message: `نوع القيمة "${action.valueType}" غير صالح`,
                    code: 'INVALID_VALUE_TYPE',
                    value: action.valueType,
                });
            }
        }

        // التحقق من القيمة/المعادلة
        if (action.valueType === 'FORMULA') {
            if (!action.formula && !action.value) {
                errors.push({
                    field: `${prefix}.formula`,
                    message: 'المعادلة مطلوبة',
                    code: 'REQUIRED',
                });
            } else {
                const formulaValidation = this.validateFormula(
                    action.formula || String(action.value)
                );
                if (!formulaValidation.valid) {
                    errors.push({
                        field: `${prefix}.formula`,
                        message: formulaValidation.errors[0],
                        code: 'INVALID_FORMULA',
                    });
                }
            }
        } else if (action.valueType === 'PERCENTAGE') {
            if (action.value !== undefined) {
                const num = Number(action.value);
                if (isNaN(num) || num < 0 || num > 100) {
                    errors.push({
                        field: `${prefix}.value`,
                        message: 'النسبة يجب أن تكون بين 0 و 100',
                        code: 'INVALID_PERCENTAGE',
                        value: action.value,
                    });
                }
            }
        } else if (action.valueType === 'FIXED' || !action.valueType) {
            if (action.value !== undefined && !isValidNumber(action.value)) {
                errors.push({
                    field: `${prefix}.value`,
                    message: 'القيمة يجب أن تكون رقم',
                    code: 'INVALID_NUMBER',
                    value: action.value,
                });
            }
        }
    }

    /**
     * التحقق من النطاق
     */
    validateScope(
        scope: ParsedPolicy['scope'],
        errors: ValidationError[],
        warnings: ValidationWarning[],
    ): void {
        if (!scope?.type) {
            return; // النطاق اختياري
        }

        const validTypes = Object.values(SCOPE_TYPES);
        if (!validTypes.includes(scope.type as any)) {
            warnings.push({
                field: 'scope.type',
                message: `نوع النطاق "${scope.type}" غير معروف`,
                suggestion: `استخدم أحد الأنواع: ${validTypes.join(', ')}`,
            });
        }

        // التحقق من وجود الهدف إذا كان النطاق محدد
        if (scope.type !== 'ALL_EMPLOYEES' && !scope.targetId && !scope.targetName) {
            warnings.push({
                field: 'scope',
                message: 'لم يتم تحديد الهدف للنطاق',
                suggestion: 'حدد targetId أو targetName',
            });
        }
    }

    /**
     * التحقق من المعادلة
     */
    validateFormula(formula: string): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!formula || typeof formula !== 'string') {
            errors.push('المعادلة فارغة');
            return { valid: false, errors };
        }

        const trimmed = formula.trim();

        // التحقق من الطول
        if (trimmed.length > VALIDATION_LIMITS.MAX_FORMULA_LENGTH) {
            errors.push(`المعادلة طويلة جداً (الحد الأقصى: ${VALIDATION_LIMITS.MAX_FORMULA_LENGTH})`);
        }

        // التحقق من الأنماط الخطرة
        const dangerousPatterns = [
            /eval\s*\(/i,
            /Function\s*\(/i,
            /require\s*\(/i,
            /import\s/i,
            /process\./i,
            /global\./i,
            /window\./i,
            /document\./i,
            /__proto__/i,
            /constructor/i,
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(trimmed)) {
                errors.push('المعادلة تحتوي على أنماط غير مسموحة');
                break;
            }
        }

        // التحقق من توازن الأقواس
        let parenCount = 0;
        for (const char of trimmed) {
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

        return { valid: errors.length === 0, errors };
    }

    /**
     * التحقق من الفترة
     */
    validatePeriod(period: string): { valid: boolean; error?: string } {
        if (!isValidPeriodFormat(period)) {
            return {
                valid: false,
                error: 'صيغة الفترة غير صحيحة. استخدم YYYY-MM مثل 2025-01',
            };
        }

        const [year, month] = period.split('-').map(Number);
        
        // التحقق من أن الفترة ليست في المستقبل البعيد
        const now = new Date();
        const periodDate = new Date(year, month - 1);
        const maxFutureMonths = 12;
        const maxFutureDate = new Date(
            now.getFullYear(),
            now.getMonth() + maxFutureMonths,
        );

        if (periodDate > maxFutureDate) {
            return {
                valid: false,
                error: `الفترة بعيدة جداً في المستقبل (الحد الأقصى: ${maxFutureMonths} أشهر)`,
            };
        }

        return { valid: true };
    }

    /**
     * التحقق من نطاق الفترات (للتطبيق الرجعي)
     */
    validatePeriodRange(
        startPeriod: string,
        endPeriod: string,
    ): { valid: boolean; error?: string } {
        // التحقق من صيغة كل فترة
        const startValidation = this.validatePeriod(startPeriod);
        if (!startValidation.valid) {
            return { valid: false, error: `بداية الفترة: ${startValidation.error}` };
        }

        const endValidation = this.validatePeriod(endPeriod);
        if (!endValidation.valid) {
            return { valid: false, error: `نهاية الفترة: ${endValidation.error}` };
        }

        // التحقق من أن البداية قبل النهاية
        const [startYear, startMonth] = startPeriod.split('-').map(Number);
        const [endYear, endMonth] = endPeriod.split('-').map(Number);
        
        const startDate = new Date(startYear, startMonth - 1);
        const endDate = new Date(endYear, endMonth - 1);

        if (startDate > endDate) {
            return {
                valid: false,
                error: 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية',
            };
        }

        // التحقق من عدد الأشهر
        const monthsDiff = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
        if (monthsDiff > VALIDATION_LIMITS.MAX_RETRO_MONTHS) {
            return {
                valid: false,
                error: `لا يمكن تطبيق السياسة بأثر رجعي لأكثر من ${VALIDATION_LIMITS.MAX_RETRO_MONTHS} شهر`,
            };
        }

        return { valid: true };
    }
}
