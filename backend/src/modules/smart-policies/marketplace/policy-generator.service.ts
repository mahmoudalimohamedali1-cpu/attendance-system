import { Injectable, Logger } from '@nestjs/common';

/**
 * 🏭 Policy Generator Engine
 * محرك توليد السياسات الذكية آلياً
 * 
 * يُولّد سياسات مُحكمة وموثقة ومختبرة
 */

// ============== Types ==============

export interface PolicyTemplate {
    id: string;
    category: PolicyCategory;
    subcategory: string;
    industry?: string[];
    
    // المعلومات الأساسية
    nameAr: string;
    nameEn: string;
    descriptionAr: string;
    descriptionEn: string;
    
    // التفاصيل القانونية
    legalReference?: string;
    laborLawArticle?: string;
    
    // تكوين السياسة
    trigger: PolicyTrigger;
    conditions: PolicyCondition[];
    actions: PolicyAction[];
    
    // متغيرات قابلة للتخصيص
    variables: PolicyVariable[];
    
    // الاختبارات
    testCases: PolicyTestCase[];
    
    // البيانات الوصفية
    tags: string[];
    difficulty: 'SIMPLE' | 'MEDIUM' | 'COMPLEX';
    popularity: number;
    rating: number;
}

export type PolicyCategory = 
    | 'ATTENDANCE'      // الحضور والانصراف
    | 'PAYROLL'         // الرواتب
    | 'INCENTIVES'      // الحوافز والمكافآت
    | 'DEDUCTIONS'      // الخصومات
    | 'LEAVES'          // الإجازات
    | 'OVERTIME'        // العمل الإضافي
    | 'ALLOWANCES'      // البدلات
    | 'PERFORMANCE'     // الأداء
    | 'COMPLIANCE'      // الامتثال
    | 'LOGISTICS'       // اللوجستيات
    | 'SAFETY';         // السلامة

export interface PolicyTrigger {
    event: string;
    subEvent?: string;
    timing: 'BEFORE' | 'AFTER' | 'DURING';
    description: string;
}

export interface PolicyCondition {
    id: string;
    field: string;
    operator: ConditionOperator;
    value: any;
    valueVariable?: string;
    description: string;
}

export type ConditionOperator = 
    | 'EQUALS' | 'NOT_EQUALS'
    | 'GREATER_THAN' | 'GREATER_THAN_OR_EQUALS'
    | 'LESS_THAN' | 'LESS_THAN_OR_EQUALS'
    | 'BETWEEN' | 'IN' | 'NOT_IN'
    | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH'
    | 'IS_NULL' | 'IS_NOT_NULL';

export interface PolicyAction {
    type: ActionType;
    value: number | string;
    valueVariable?: string;
    unit?: string;
    description: string;
    formula?: string;
}

export type ActionType = 
    | 'ADD_TO_PAYROLL'
    | 'DEDUCT_FROM_PAYROLL'
    | 'ADD_PERCENTAGE'
    | 'DEDUCT_PERCENTAGE'
    | 'SET_VALUE'
    | 'SEND_NOTIFICATION'
    | 'CREATE_TASK'
    | 'UPDATE_RECORD'
    | 'TRIGGER_WORKFLOW';

export interface PolicyVariable {
    name: string;
    nameAr: string;
    type: 'NUMBER' | 'PERCENTAGE' | 'TEXT' | 'DATE' | 'BOOLEAN' | 'SELECT';
    defaultValue: any;
    min?: number;
    max?: number;
    options?: { value: any; label: string }[];
    description: string;
}

export interface PolicyTestCase {
    id: string;
    name: string;
    input: Record<string, any>;
    expectedResult: {
        shouldTrigger: boolean;
        expectedAction?: string;
        expectedValue?: number;
    };
}

export interface GeneratedPolicy {
    id: string;
    template: PolicyTemplate;
    customValues: Record<string, any>;
    parsedRule: any;
    testResults: PolicyTestResult[];
    isValid: boolean;
    certificate?: PolicyCertificate;
}

export interface PolicyTestResult {
    testCase: PolicyTestCase;
    passed: boolean;
    actualResult: any;
    executionTime: number;
    error?: string;
}

export interface PolicyCertificate {
    id: string;
    issuedAt: Date;
    validUntil: Date;
    testsRun: number;
    testsPassed: number;
    accuracy: number;
    performance: number;
    signature: string;
}

// ============== Field Mapping ==============
// خريطة تحويل الحقول البسيطة للمسارات الكاملة في السياق

const FIELD_MAPPING: Record<string, string> = {
    // الحضور
    'lateMinutes': 'attendance.currentPeriod.lateMinutes',
    'lateDays': 'attendance.currentPeriod.lateDays',
    'absentDays': 'attendance.currentPeriod.absentDays',
    'presentDays': 'attendance.currentPeriod.presentDays',
    'overtimeHours': 'attendance.currentPeriod.overtimeHours',
    'attendancePercentage': 'attendance.currentPeriod.attendancePercentage',
    'earlyLeaveDays': 'attendance.currentPeriod.earlyLeaveDays',
    'weekendWorkDays': 'attendance.currentPeriod.weekendWorkDays',
    'holidayWorkDays': 'attendance.currentPeriod.holidayWorkDays',
    'lateStreak': 'attendance.patterns.lateStreak',
    'absenceStreak': 'attendance.patterns.absenceStreak',
    'consecutivePresent': 'attendance.patterns.consecutivePresent',
    
    // الرواتب والعقد
    'basicSalary': 'contract.basicSalary',
    'totalSalary': 'contract.totalSalary',
    'housingAllowance': 'contract.housingAllowance',
    'transportAllowance': 'contract.transportAllowance',
    'dailyRate': 'contract.dailyRate',
    'hourlyRate': 'contract.hourlyRate',
    
    // الموظف
    'tenureMonths': 'employee.tenure.months',
    'tenureYears': 'employee.tenure.years',
    'nationality': 'employee.nationality',
    'isOnProbation': 'employee.isOnProbation',
    'employmentType': 'employee.employmentType',
    
    // الإجازات
    'sickDays': 'leaves.currentMonth.sickDays',
    'annualDays': 'leaves.currentMonth.annualDays',
    'annualBalance': 'leaves.balance.annual',
    'sickBalance': 'leaves.balance.sick',
    
    // السلف والعهد
    'hasActiveAdvance': 'advances.hasActiveAdvance',
    'advanceRemaining': 'advances.remainingAmount',
    'custodyCount': 'custody.active',
    
    // الأداء
    'lastRating': 'performance.lastRating',
    'targetAchievement': 'performance.targetAchievement',
    
    // اللوجستيات
    'delayMinutes': 'logistics.delayMinutes',
    'tripsCompleted': 'logistics.tripsCompleted',
    'deliveriesCompleted': 'logistics.deliveriesCompleted',
    'fuelUsage': 'logistics.fuelUsage',
    'kmDriven': 'logistics.kmDriven',
};

// ============== Implementation ==============

@Injectable()
export class PolicyGeneratorService {
    private readonly logger = new Logger(PolicyGeneratorService.name);
    
    /**
     * 🏭 توليد سياسة من قالب
     */
    generateFromTemplate(
        template: PolicyTemplate,
        customValues: Record<string, any> = {},
    ): GeneratedPolicy {
        this.logger.log(`Generating policy from template: ${template.id}`);
        
        // دمج القيم المخصصة مع القيم الافتراضية
        const mergedValues = this.mergeValues(template.variables, customValues);
        
        // بناء القاعدة المحللة
        const parsedRule = this.buildParsedRule(template, mergedValues);
        
        // تشغيل الاختبارات
        const testResults = this.runTests(template, parsedRule);
        
        // التحقق من الصلاحية
        const isValid = testResults.every(r => r.passed);
        
        // إصدار الشهادة إذا نجحت الاختبارات
        const certificate = isValid ? this.issueCertificate(template, testResults) : undefined;
        
        return {
            id: `${template.id}-${Date.now()}`,
            template,
            customValues: mergedValues,
            parsedRule,
            testResults,
            isValid,
            certificate,
        };
    }
    
    /**
     * 🔧 دمج القيم
     */
    private mergeValues(
        variables: PolicyVariable[],
        customValues: Record<string, any>,
    ): Record<string, any> {
        const merged: Record<string, any> = {};
        
        for (const variable of variables) {
            merged[variable.name] = customValues[variable.name] ?? variable.defaultValue;
        }
        
        return merged;
    }
    
    /**
     * 📝 بناء القاعدة المحللة
     * ⚠️ مهم: يجب أن تتوافق مع ما يتوقعه SmartPolicyExecutorService
     */
    private buildParsedRule(
        template: PolicyTemplate,
        values: Record<string, any>,
    ): any {
        // تحويل الـ conditions للهيكل المتوقع من الـ Engine
        // مع تحويل الحقول البسيطة للمسارات الكاملة
        const conditions = template.conditions.map(c => ({
            id: c.id,
            field: FIELD_MAPPING[c.field] || c.field, // تحويل للمسار الكامل
            operator: c.operator,
            value: c.valueVariable ? values[c.valueVariable] : c.value,
            description: c.description,
        }));

        // تحويل الـ actions للهيكل المتوقع
        const actions = template.actions.map(a => {
            const baseAction: any = {
                type: a.type,
                description: a.description,
            };

            // حساب القيمة
            if (a.formula) {
                baseAction.valueType = 'FORMULA';
                baseAction.formula = a.formula;
                baseAction.value = this.evaluateFormula(a.formula, values);
            } else if (a.valueVariable) {
                baseAction.valueType = 'FIXED';
                baseAction.value = values[a.valueVariable];
            } else {
                baseAction.valueType = 'FIXED';
                baseAction.value = a.value;
            }

            // تحديد كود المكون للـ Payroll
            if (a.type === 'ADD_TO_PAYROLL') {
                baseAction.componentCode = `SMART_${template.category}_ADD`;
            } else if (a.type === 'DEDUCT_FROM_PAYROLL') {
                baseAction.componentCode = `SMART_${template.category}_DEDUCT`;
            }

            if (a.unit) baseAction.unit = a.unit;

            return baseAction;
        });

        return {
            // ✅ مهم جداً: هذا يجعل الـ Engine يقبل السياسة
            understood: true,
            
            id: template.id,
            name: template.nameAr,
            nameEn: template.nameEn,
            explanation: template.descriptionAr,
            category: template.category,
            
            // ✅ مهم: الـ scope يحدد من تُطبق عليه السياسة
            scope: {
                type: 'ALL_EMPLOYEES',
                targetName: null,
            },
            
            trigger: {
                event: template.trigger.event,
                subEvent: template.trigger.subEvent,
                timing: template.trigger.timing,
            },
            
            conditions,
            actions,
            
            // البيانات الوصفية
            metadata: {
                legalReference: template.legalReference,
                laborLawArticle: template.laborLawArticle,
                tags: template.tags,
                industry: template.industry,
                generatedAt: new Date().toISOString(),
                variables: values,
            },
        };
    }
    
    /**
     * 🧮 تقييم المعادلة
     */
    private evaluateFormula(formula: string, values: Record<string, any>): number {
        let evaluated = formula;
        
        for (const [key, value] of Object.entries(values)) {
            evaluated = evaluated.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
        }
        
        try {
            // Safe evaluation
            return Function(`"use strict"; return (${evaluated})`)();
        } catch {
            return 0;
        }
    }

    /**
     * 🔄 تحويل المعادلة لاستخدام المسارات الكاملة
     */
    private mapFormulaFields(formula: string): string {
        let mapped = formula;
        for (const [simple, full] of Object.entries(FIELD_MAPPING)) {
            mapped = mapped.replace(new RegExp(`\\{${simple}\\}`, 'g'), `{${full}}`);
        }
        return mapped;
    }
    
    /**
     * 🧪 تشغيل الاختبارات
     */
    private runTests(
        template: PolicyTemplate,
        parsedRule: any,
    ): PolicyTestResult[] {
        return template.testCases.map(testCase => {
            const startTime = Date.now();
            
            try {
                const result = this.executeTest(parsedRule, testCase.input);
                const passed = this.validateResult(result, testCase.expectedResult);
                
                return {
                    testCase,
                    passed,
                    actualResult: result,
                    executionTime: Date.now() - startTime,
                };
            } catch (error: any) {
                return {
                    testCase,
                    passed: false,
                    actualResult: null,
                    executionTime: Date.now() - startTime,
                    error: error.message,
                };
            }
        });
    }
    
    /**
     * ▶️ تنفيذ اختبار
     */
    private executeTest(parsedRule: any, input: Record<string, any>): any {
        // محاكاة تنفيذ السياسة
        const conditionsMet = parsedRule.conditions.every((c: any) => 
            this.evaluateCondition(c, input)
        );
        
        if (!conditionsMet) {
            return { triggered: false };
        }
        
        // حساب الإجراءات
        const actions = parsedRule.actions.map((a: any) => ({
            type: a.type,
            value: a.calculatedValue ?? a.value,
        }));
        
        return {
            triggered: true,
            actions,
            totalValue: actions.reduce((sum: number, a: any) => 
                sum + (typeof a.value === 'number' ? a.value : 0), 0
            ),
        };
    }
    
    /**
     * 🔍 تقييم شرط
     */
    private evaluateCondition(condition: any, input: Record<string, any>): boolean {
        // البحث بالاسم الكامل أو البسيط
        let fieldValue = input[condition.field];
        
        // إذا لم نجده، جرب الجزء الأخير من المسار
        if (fieldValue === undefined && condition.field.includes('.')) {
            const parts = condition.field.split('.');
            const simpleField = parts[parts.length - 1];
            fieldValue = input[simpleField];
        }
        
        // البحث العكسي: لو الـ input فيه الاسم البسيط
        if (fieldValue === undefined) {
            for (const [simple, full] of Object.entries(FIELD_MAPPING)) {
                if (full === condition.field && input[simple] !== undefined) {
                    fieldValue = input[simple];
                    break;
                }
            }
        }
        
        const condValue = condition.value;
        
        switch (condition.operator) {
            case 'EQUALS': return fieldValue === condValue;
            case 'NOT_EQUALS': return fieldValue !== condValue;
            case 'GREATER_THAN': return fieldValue > condValue;
            case 'GREATER_THAN_OR_EQUALS': return fieldValue >= condValue;
            case 'LESS_THAN': return fieldValue < condValue;
            case 'LESS_THAN_OR_EQUALS': return fieldValue <= condValue;
            case 'BETWEEN': return fieldValue >= condValue[0] && fieldValue <= condValue[1];
            case 'IN': return Array.isArray(condValue) && condValue.includes(fieldValue);
            case 'IS_NULL': return fieldValue == null;
            case 'IS_NOT_NULL': return fieldValue != null;
            default: return false;
        }
    }
    
    /**
     * ✅ التحقق من النتيجة
     */
    private validateResult(actual: any, expected: any): boolean {
        if (expected.shouldTrigger !== actual.triggered) return false;
        
        if (expected.expectedValue !== undefined) {
            return Math.abs(actual.totalValue - expected.expectedValue) < 0.01;
        }
        
        return true;
    }
    
    /**
     * 🏅 إصدار شهادة
     */
    private issueCertificate(
        template: PolicyTemplate,
        testResults: PolicyTestResult[],
    ): PolicyCertificate {
        const passed = testResults.filter(r => r.passed).length;
        const avgTime = testResults.reduce((sum, r) => sum + r.executionTime, 0) / testResults.length;
        
        return {
            id: `CERT-${template.id}-${Date.now()}`,
            issuedAt: new Date(),
            validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // سنة
            testsRun: testResults.length,
            testsPassed: passed,
            accuracy: Math.round((passed / testResults.length) * 100),
            performance: Math.round(avgTime),
            signature: this.generateSignature(template.id),
        };
    }
    
    /**
     * 🔐 توليد التوقيع
     */
    private generateSignature(templateId: string): string {
        const data = `${templateId}-${Date.now()}-SMART-POLICY-CERTIFIED`;
        return Buffer.from(data).toString('base64').slice(0, 32);
    }
}
