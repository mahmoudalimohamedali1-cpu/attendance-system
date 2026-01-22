/**
 * 🧠 Smart Policy Template Registry
 * Professional rule-based policy engine without AI dependencies
 * 
 * Architecture:
 * - Templates are pre-defined policy configurations
 * - Each template produces a valid parsedRule JSON
 * - Templates can be customized with parameters
 * - Categories: ATTENDANCE, OVERTIME, LEAVE, PENALTIES, BONUSES, SAUDI_LABOR_LAW
 */

import { Injectable, Logger } from '@nestjs/common';
import { SmartPolicyTrigger } from '@prisma/client';

// ============== Types ==============

export interface PolicyTemplate {
    id: string;
    code: string;
    nameAr: string;
    nameEn: string;
    descriptionAr: string;
    descriptionEn: string;
    category: PolicyTemplateCategory;
    trigger: SmartPolicyTrigger;
    icon: string;

    // Template configuration
    parameters: TemplateParameter[];
    defaultConditions: TemplateCondition[];
    defaultActions: TemplateAction[];

    // Metadata
    isPopular?: boolean;
    isSaudiCompliant?: boolean;
    tags: string[];
}

export type PolicyTemplateCategory =
    | 'ATTENDANCE'
    | 'OVERTIME'
    | 'LEAVE'
    | 'PENALTIES'
    | 'BONUSES'
    | 'ALLOWANCES'
    | 'SAUDI_LABOR_LAW'
    | 'TENURE'
    | 'PERFORMANCE';

export interface TemplateParameter {
    id: string;
    nameAr: string;
    nameEn: string;
    type: 'number' | 'percentage' | 'days' | 'months' | 'select' | 'boolean';
    defaultValue: any;
    min?: number;
    max?: number;
    options?: { value: any; labelAr: string; labelEn: string }[];
    required: boolean;
}

export interface TemplateCondition {
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'between';
    value: any;
    valueFromParam?: string; // Reference to parameter
}

export interface TemplateAction {
    type: 'ADD' | 'DEDUCT' | 'SET';
    valueType: 'FIXED' | 'PERCENTAGE' | 'FORMULA' | 'PER_UNIT';
    value: any;
    valueFromParam?: string;
    base?: 'BASIC' | 'TOTAL' | 'DAILY_RATE' | 'HOURLY_RATE';
    componentCode: string;
    descriptionAr: string;
    descriptionEn: string;
}

export interface GeneratedParsedRule {
    understood: boolean;
    explanation: string;
    conditions: any[];
    actions: any[];
    scope?: { type: string; value?: string[] };
    tieredConfig?: {
        eventType: string;
        tiers: { min: number; max: number; multiplier?: number; fixedAmount?: number }[];
    };
}

// ============== Template Registry Service ==============

@Injectable()
export class PolicyTemplateRegistryService {
    private readonly logger = new Logger(PolicyTemplateRegistryService.name);
    private readonly templates: Map<string, PolicyTemplate> = new Map();

    constructor() {
        this.registerAllTemplates();
    }

    // ============== Public API ==============

    /**
     * Get all templates, optionally filtered by category
     */
    getTemplates(category?: PolicyTemplateCategory): PolicyTemplate[] {
        const all = Array.from(this.templates.values());
        if (!category) return all;
        return all.filter(t => t.category === category);
    }

    /**
     * Get a specific template by ID
     */
    getTemplate(id: string): PolicyTemplate | undefined {
        return this.templates.get(id);
    }

    /**
     * Get popular templates for quick access
     */
    getPopularTemplates(limit: number = 10): PolicyTemplate[] {
        return Array.from(this.templates.values())
            .filter(t => t.isPopular)
            .slice(0, limit);
    }

    /**
     * Get Saudi-compliant templates
     */
    getSaudiCompliantTemplates(): PolicyTemplate[] {
        return Array.from(this.templates.values())
            .filter(t => t.isSaudiCompliant);
    }

    /**
     * Search templates by keyword (Arabic or English)
     */
    searchTemplates(query: string): PolicyTemplate[] {
        const q = query.toLowerCase();
        return Array.from(this.templates.values()).filter(t =>
            t.nameAr.includes(q) ||
            t.nameEn.toLowerCase().includes(q) ||
            t.descriptionAr.includes(q) ||
            t.descriptionEn.toLowerCase().includes(q) ||
            t.tags.some(tag => tag.toLowerCase().includes(q))
        );
    }

    /**
     * Generate a complete parsedRule from template with parameters
     */
    generateParsedRule(
        templateId: string,
        parameters: Record<string, any> = {}
    ): GeneratedParsedRule {
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }

        // Merge default parameters with provided ones
        const mergedParams: Record<string, any> = {};
        for (const param of template.parameters) {
            mergedParams[param.id] = parameters[param.id] ?? param.defaultValue;
        }

        // Build conditions from template
        const conditions = template.defaultConditions.map(cond => ({
            field: cond.field,
            operator: cond.operator,
            value: cond.valueFromParam ? mergedParams[cond.valueFromParam] : cond.value,
        }));

        // Build actions from template
        const actions = template.defaultActions.map(action => ({
            type: action.type,
            valueType: action.valueType,
            value: action.valueFromParam ? mergedParams[action.valueFromParam] : action.value,
            base: action.base,
            componentCode: action.componentCode,
            descriptionAr: action.descriptionAr,
            descriptionEn: action.descriptionEn,
        }));

        return {
            understood: true,
            explanation: `Generated from template: ${template.nameAr}`,
            conditions,
            actions,
            scope: { type: 'ALL_EMPLOYEES' },
        };
    }

    /**
     * Get default template for a category (fallback when AI fails)
     */
    getDefaultTemplate(category: PolicyTemplateCategory): GeneratedParsedRule {
        const templates = this.getTemplates(category);
        const defaultTemplate = templates.find(t => t.isPopular) || templates[0];

        if (!defaultTemplate) {
            return {
                understood: false,
                explanation: 'No default template found for category',
                conditions: [],
                actions: [],
            };
        }

        return this.generateParsedRule(defaultTemplate.id);
    }

    // ============== Template Registration ==============

    private registerAllTemplates(): void {
        // ATTENDANCE Templates
        this.registerAttendanceTemplates();

        // PENALTY Templates
        this.registerPenaltyTemplates();

        // BONUS Templates
        this.registerBonusTemplates();

        // OVERTIME Templates
        this.registerOvertimeTemplates();

        // SAUDI LABOR LAW Templates
        this.registerSaudiLaborTemplates();

        // TENURE Templates
        this.registerTenureTemplates();

        this.logger.log(`📋 Registered ${this.templates.size} policy templates`);
    }

    private register(template: PolicyTemplate): void {
        this.templates.set(template.id, template);
    }

    // ============== ATTENDANCE Templates ==============

    private registerAttendanceTemplates(): void {
        // ATT-001: Perfect Attendance Bonus
        this.register({
            id: 'ATT-001',
            code: 'PERFECT_ATTENDANCE',
            nameAr: 'مكافأة الانضباط الكامل',
            nameEn: 'Perfect Attendance Bonus',
            descriptionAr: 'منح مكافأة للموظف الذي لم يتغيب ولم يتأخر خلال الشهر',
            descriptionEn: 'Award bonus to employees with no absences and no late arrivals during the month',
            category: 'ATTENDANCE',
            trigger: SmartPolicyTrigger.PAYROLL,
            icon: '🎯',
            isPopular: true,
            isSaudiCompliant: true,
            tags: ['انضباط', 'مكافأة', 'حضور', 'attendance', 'bonus'],
            parameters: [
                {
                    id: 'bonusAmount',
                    nameAr: 'قيمة المكافأة',
                    nameEn: 'Bonus Amount',
                    type: 'number',
                    defaultValue: 500,
                    min: 0,
                    max: 10000,
                    required: true,
                },
            ],
            defaultConditions: [
                { field: 'absentDays', operator: 'eq', value: 0 },
                { field: 'lateDays', operator: 'eq', value: 0 },
            ],
            defaultActions: [
                {
                    type: 'ADD',
                    valueType: 'FIXED',
                    value: 500,
                    valueFromParam: 'bonusAmount',
                    componentCode: 'ATTENDANCE_BONUS',
                    descriptionAr: 'مكافأة الانضباط الكامل',
                    descriptionEn: 'Perfect Attendance Bonus',
                },
            ],
        });

        // ATT-002: High Attendance Bonus (>95%)
        this.register({
            id: 'ATT-002',
            code: 'HIGH_ATTENDANCE_BONUS',
            nameAr: 'مكافأة الحضور العالي',
            nameEn: 'High Attendance Bonus',
            descriptionAr: 'منح مكافأة للموظف الذي تجاوزت نسبة حضوره 95%',
            descriptionEn: 'Award bonus to employees with attendance rate above 95%',
            category: 'ATTENDANCE',
            trigger: SmartPolicyTrigger.PAYROLL,
            icon: '📈',
            isPopular: true,
            tags: ['حضور', 'نسبة', 'مكافأة'],
            parameters: [
                {
                    id: 'minAttendance',
                    nameAr: 'الحد الأدنى للحضور (%)',
                    nameEn: 'Minimum Attendance (%)',
                    type: 'percentage',
                    defaultValue: 95,
                    min: 80,
                    max: 100,
                    required: true,
                },
                {
                    id: 'bonusPercentage',
                    nameAr: 'نسبة المكافأة من الراتب (%)',
                    nameEn: 'Bonus Percentage of Salary (%)',
                    type: 'percentage',
                    defaultValue: 5,
                    min: 1,
                    max: 50,
                    required: true,
                },
            ],
            defaultConditions: [
                { field: 'attendancePercentage', operator: 'gte', value: 95, valueFromParam: 'minAttendance' },
            ],
            defaultActions: [
                {
                    type: 'ADD',
                    valueType: 'PERCENTAGE',
                    value: 5,
                    valueFromParam: 'bonusPercentage',
                    base: 'BASIC',
                    componentCode: 'ATTENDANCE_BONUS',
                    descriptionAr: 'مكافأة الحضور العالي',
                    descriptionEn: 'High Attendance Bonus',
                },
            ],
        });

        // ATT-003: Early Arrival Incentive
        this.register({
            id: 'ATT-003',
            code: 'EARLY_ARRIVAL_INCENTIVE',
            nameAr: 'حافز الحضور المبكر',
            nameEn: 'Early Arrival Incentive',
            descriptionAr: 'مكافأة الموظفين الذين يحضرون قبل موعد الدوام بـ 15 دقيقة',
            descriptionEn: 'Reward employees who arrive 15 minutes before shift',
            category: 'ATTENDANCE',
            trigger: SmartPolicyTrigger.ATTENDANCE,
            icon: '⏰',
            tags: ['حضور مبكر', 'حافز', 'early'],
            parameters: [
                {
                    id: 'earlyMinutes',
                    nameAr: 'الحضور المبكر (دقائق)',
                    nameEn: 'Early Minutes',
                    type: 'number',
                    defaultValue: 15,
                    min: 5,
                    max: 60,
                    required: true,
                },
                {
                    id: 'dailyBonus',
                    nameAr: 'المكافأة اليومية',
                    nameEn: 'Daily Bonus',
                    type: 'number',
                    defaultValue: 20,
                    min: 0,
                    max: 100,
                    required: true,
                },
            ],
            defaultConditions: [
                { field: 'earlyArrivalMinutes', operator: 'gte', value: 15, valueFromParam: 'earlyMinutes' },
            ],
            defaultActions: [
                {
                    type: 'ADD',
                    valueType: 'FIXED',
                    value: 20,
                    valueFromParam: 'dailyBonus',
                    componentCode: 'EARLY_BONUS',
                    descriptionAr: 'حافز الحضور المبكر',
                    descriptionEn: 'Early Arrival Incentive',
                },
            ],
        });
    }

    // ============== PENALTY Templates ==============

    private registerPenaltyTemplates(): void {
        // PEN-001: Late Arrival Penalty (Fixed)
        this.register({
            id: 'PEN-001',
            code: 'LATE_PENALTY_FIXED',
            nameAr: 'خصم التأخير (مبلغ ثابت)',
            nameEn: 'Late Arrival Penalty (Fixed)',
            descriptionAr: 'خصم مبلغ ثابت عند التأخير عن موعد الدوام',
            descriptionEn: 'Deduct fixed amount for late arrival',
            category: 'PENALTIES',
            trigger: SmartPolicyTrigger.ATTENDANCE,
            icon: '⏱️',
            isPopular: true,
            isSaudiCompliant: true,
            tags: ['تأخير', 'خصم', 'late', 'penalty'],
            parameters: [
                {
                    id: 'graceMinutes',
                    nameAr: 'فترة السماح (دقائق)',
                    nameEn: 'Grace Period (minutes)',
                    type: 'number',
                    defaultValue: 15,
                    min: 0,
                    max: 60,
                    required: true,
                },
                {
                    id: 'deductionAmount',
                    nameAr: 'قيمة الخصم',
                    nameEn: 'Deduction Amount',
                    type: 'number',
                    defaultValue: 50,
                    min: 0,
                    max: 500,
                    required: true,
                },
            ],
            defaultConditions: [
                { field: 'lateMinutes', operator: 'gte', value: 15, valueFromParam: 'graceMinutes' },
            ],
            defaultActions: [
                {
                    type: 'DEDUCT',
                    valueType: 'FIXED',
                    value: 50,
                    valueFromParam: 'deductionAmount',
                    componentCode: 'LATE_DEDUCTION',
                    descriptionAr: 'خصم تأخير',
                    descriptionEn: 'Late Arrival Deduction',
                },
            ],
        });

        // PEN-002: Tiered Late Penalty (Saudi Labor Law)
        this.register({
            id: 'PEN-002',
            code: 'LATE_PENALTY_TIERED',
            nameAr: 'خصم التأخير المتدرج (نظام العمل)',
            nameEn: 'Tiered Late Penalty (Saudi Labor Law)',
            descriptionAr: 'خصم متدرج حسب عدد مرات التأخير وفقاً لنظام العمل السعودي',
            descriptionEn: 'Progressive penalty based on late count per Saudi Labor Law',
            category: 'PENALTIES',
            trigger: SmartPolicyTrigger.PAYROLL,
            icon: '📊',
            isPopular: true,
            isSaudiCompliant: true,
            tags: ['تأخير', 'متدرج', 'نظام العمل', 'tiered'],
            parameters: [],
            defaultConditions: [
                { field: 'lateDays', operator: 'gte', value: 1 },
            ],
            defaultActions: [
                {
                    type: 'DEDUCT',
                    valueType: 'FORMULA',
                    value: 'TIERED_LATE_PENALTY',
                    componentCode: 'LATE_DEDUCTION',
                    descriptionAr: 'خصم تأخير متدرج',
                    descriptionEn: 'Tiered Late Deduction',
                },
            ],
        });

        // PEN-003: Absence Penalty (Daily Rate)
        this.register({
            id: 'PEN-003',
            code: 'ABSENCE_PENALTY_DAILY',
            nameAr: 'خصم الغياب (الراتب اليومي)',
            nameEn: 'Absence Penalty (Daily Rate)',
            descriptionAr: 'خصم الراتب اليومي عن كل يوم غياب بدون إذن',
            descriptionEn: 'Deduct daily rate for each unauthorized absence',
            category: 'PENALTIES',
            trigger: SmartPolicyTrigger.PAYROLL,
            icon: '❌',
            isPopular: true,
            isSaudiCompliant: true,
            tags: ['غياب', 'خصم', 'absence'],
            parameters: [
                {
                    id: 'deductionMultiplier',
                    nameAr: 'معامل الخصم (× الراتب اليومي)',
                    nameEn: 'Deduction Multiplier (× Daily Rate)',
                    type: 'number',
                    defaultValue: 1,
                    min: 0.5,
                    max: 3,
                    required: true,
                },
            ],
            defaultConditions: [
                { field: 'absentDays', operator: 'gte', value: 1 },
            ],
            defaultActions: [
                {
                    type: 'DEDUCT',
                    valueType: 'PER_UNIT',
                    value: 1,
                    valueFromParam: 'deductionMultiplier',
                    base: 'DAILY_RATE',
                    componentCode: 'ABSENCE_DEDUCTION',
                    descriptionAr: 'خصم غياب',
                    descriptionEn: 'Absence Deduction',
                },
            ],
        });

        // PEN-004: Early Departure Penalty
        this.register({
            id: 'PEN-004',
            code: 'EARLY_DEPARTURE_PENALTY',
            nameAr: 'خصم الانصراف المبكر',
            nameEn: 'Early Departure Penalty',
            descriptionAr: 'خصم عند الانصراف قبل نهاية الدوام الرسمي',
            descriptionEn: 'Deduct for leaving before shift end',
            category: 'PENALTIES',
            trigger: SmartPolicyTrigger.ATTENDANCE,
            icon: '🚪',
            isSaudiCompliant: true,
            tags: ['انصراف مبكر', 'خصم', 'early departure'],
            parameters: [
                {
                    id: 'graceMinutes',
                    nameAr: 'فترة السماح (دقائق)',
                    nameEn: 'Grace Period (minutes)',
                    type: 'number',
                    defaultValue: 10,
                    min: 0,
                    max: 30,
                    required: true,
                },
                {
                    id: 'deductionPerMinute',
                    nameAr: 'الخصم لكل دقيقة',
                    nameEn: 'Deduction Per Minute',
                    type: 'number',
                    defaultValue: 2,
                    min: 0,
                    max: 10,
                    required: true,
                },
            ],
            defaultConditions: [
                { field: 'earlyDepartureMinutes', operator: 'gte', value: 10, valueFromParam: 'graceMinutes' },
            ],
            defaultActions: [
                {
                    type: 'DEDUCT',
                    valueType: 'FORMULA',
                    value: 'earlyDepartureMinutes * deductionPerMinute',
                    componentCode: 'EARLY_DEPARTURE_DED',
                    descriptionAr: 'خصم انصراف مبكر',
                    descriptionEn: 'Early Departure Deduction',
                },
            ],
        });

        // PEN-005: Consecutive Absence Penalty
        this.register({
            id: 'PEN-005',
            code: 'CONSECUTIVE_ABSENCE',
            nameAr: 'الغياب المتتالي (إنذار + خصم)',
            nameEn: 'Consecutive Absence Warning',
            descriptionAr: 'إنذار وخصم مضاعف عند الغياب لأيام متتالية',
            descriptionEn: 'Warning and double deduction for consecutive absences',
            category: 'PENALTIES',
            trigger: SmartPolicyTrigger.PAYROLL,
            icon: '⚠️',
            isSaudiCompliant: true,
            tags: ['غياب متتالي', 'إنذار'],
            parameters: [
                {
                    id: 'consecutiveDays',
                    nameAr: 'عدد الأيام المتتالية',
                    nameEn: 'Consecutive Days',
                    type: 'number',
                    defaultValue: 3,
                    min: 2,
                    max: 7,
                    required: true,
                },
            ],
            defaultConditions: [
                { field: 'consecutiveAbsent', operator: 'gte', value: 3, valueFromParam: 'consecutiveDays' },
            ],
            defaultActions: [
                {
                    type: 'DEDUCT',
                    valueType: 'PER_UNIT',
                    value: 2, // Double daily rate
                    base: 'DAILY_RATE',
                    componentCode: 'ABSENCE_DEDUCTION',
                    descriptionAr: 'خصم غياب متتالي',
                    descriptionEn: 'Consecutive Absence Deduction',
                },
            ],
        });
    }

    // ============== BONUS Templates ==============

    private registerBonusTemplates(): void {
        // BON-001: Annual Performance Bonus
        this.register({
            id: 'BON-001',
            code: 'ANNUAL_PERFORMANCE',
            nameAr: 'مكافأة الأداء السنوية',
            nameEn: 'Annual Performance Bonus',
            descriptionAr: 'مكافأة سنوية بناءً على تقييم الأداء',
            descriptionEn: 'Annual bonus based on performance evaluation',
            category: 'BONUSES',
            trigger: SmartPolicyTrigger.PERFORMANCE,
            icon: '🏆',
            isPopular: true,
            tags: ['أداء', 'سنوي', 'مكافأة', 'performance'],
            parameters: [
                {
                    id: 'minRating',
                    nameAr: 'الحد الأدنى للتقييم',
                    nameEn: 'Minimum Rating',
                    type: 'number',
                    defaultValue: 4,
                    min: 1,
                    max: 5,
                    required: true,
                },
                {
                    id: 'bonusMonths',
                    nameAr: 'عدد أشهر المكافأة',
                    nameEn: 'Bonus Months',
                    type: 'number',
                    defaultValue: 1,
                    min: 0.5,
                    max: 3,
                    required: true,
                },
            ],
            defaultConditions: [
                { field: 'performanceRating', operator: 'gte', value: 4, valueFromParam: 'minRating' },
            ],
            defaultActions: [
                {
                    type: 'ADD',
                    valueType: 'FORMULA',
                    value: 'basicSalary * bonusMonths',
                    componentCode: 'PERFORMANCE_BONUS',
                    descriptionAr: 'مكافأة أداء سنوية',
                    descriptionEn: 'Annual Performance Bonus',
                },
            ],
        });

        // BON-002: Eid Bonus (العيدية)
        this.register({
            id: 'BON-002',
            code: 'EID_BONUS',
            nameAr: 'العيدية (مكافأة العيد)',
            nameEn: 'Eid Bonus',
            descriptionAr: 'مكافأة بمناسبة عيد الفطر أو الأضحى',
            descriptionEn: 'Bonus for Eid Al-Fitr or Eid Al-Adha',
            category: 'BONUSES',
            trigger: SmartPolicyTrigger.CUSTOM,
            icon: '🌙',
            isPopular: true,
            isSaudiCompliant: true,
            tags: ['عيد', 'عيدية', 'مكافأة', 'eid'],
            parameters: [
                {
                    id: 'bonusAmount',
                    nameAr: 'قيمة العيدية',
                    nameEn: 'Eid Bonus Amount',
                    type: 'number',
                    defaultValue: 1000,
                    min: 0,
                    max: 10000,
                    required: true,
                },
            ],
            defaultConditions: [],
            defaultActions: [
                {
                    type: 'ADD',
                    valueType: 'FIXED',
                    value: 1000,
                    valueFromParam: 'bonusAmount',
                    componentCode: 'EID_BONUS',
                    descriptionAr: 'مكافأة العيد',
                    descriptionEn: 'Eid Bonus',
                },
            ],
        });

        // BON-003: Referral Bonus
        this.register({
            id: 'BON-003',
            code: 'REFERRAL_BONUS',
            nameAr: 'مكافأة الإحالة',
            nameEn: 'Referral Bonus',
            descriptionAr: 'مكافأة عند ترشيح موظف جديد ينضم للشركة',
            descriptionEn: 'Bonus for referring a new employee who joins',
            category: 'BONUSES',
            trigger: SmartPolicyTrigger.CUSTOM,
            icon: '🤝',
            tags: ['إحالة', 'ترشيح', 'توظيف', 'referral'],
            parameters: [
                {
                    id: 'referralBonus',
                    nameAr: 'مكافأة الإحالة',
                    nameEn: 'Referral Bonus',
                    type: 'number',
                    defaultValue: 2000,
                    min: 500,
                    max: 10000,
                    required: true,
                },
            ],
            defaultConditions: [
                { field: 'hasActiveReferral', operator: 'eq', value: true },
            ],
            defaultActions: [
                {
                    type: 'ADD',
                    valueType: 'FIXED',
                    value: 2000,
                    valueFromParam: 'referralBonus',
                    componentCode: 'REFERRAL_BONUS',
                    descriptionAr: 'مكافأة إحالة موظف',
                    descriptionEn: 'Employee Referral Bonus',
                },
            ],
        });

        // BON-004: Project Completion Bonus
        this.register({
            id: 'BON-004',
            code: 'PROJECT_COMPLETION',
            nameAr: 'مكافأة إنجاز المشروع',
            nameEn: 'Project Completion Bonus',
            descriptionAr: 'مكافأة عند الانتهاء من مشروع قبل الموعد المحدد',
            descriptionEn: 'Bonus for completing project before deadline',
            category: 'BONUSES',
            trigger: SmartPolicyTrigger.CUSTOM,
            icon: '🎯',
            tags: ['مشروع', 'إنجاز', 'project'],
            parameters: [
                {
                    id: 'bonusPercentage',
                    nameAr: 'نسبة المكافأة من الراتب (%)',
                    nameEn: 'Bonus Percentage (%)',
                    type: 'percentage',
                    defaultValue: 10,
                    min: 5,
                    max: 50,
                    required: true,
                },
            ],
            defaultConditions: [
                { field: 'projectCompleted', operator: 'eq', value: true },
                { field: 'projectOnTime', operator: 'eq', value: true },
            ],
            defaultActions: [
                {
                    type: 'ADD',
                    valueType: 'PERCENTAGE',
                    value: 10,
                    valueFromParam: 'bonusPercentage',
                    base: 'BASIC',
                    componentCode: 'PROJECT_BONUS',
                    descriptionAr: 'مكافأة إنجاز مشروع',
                    descriptionEn: 'Project Completion Bonus',
                },
            ],
        });
    }

    // ============== OVERTIME Templates ==============

    private registerOvertimeTemplates(): void {
        // OT-001: Standard Overtime (1.5x)
        this.register({
            id: 'OT-001',
            code: 'OVERTIME_STANDARD',
            nameAr: 'العمل الإضافي (1.5x)',
            nameEn: 'Standard Overtime (1.5x)',
            descriptionAr: 'دفع أجر إضافي بمعدل 1.5 ضعف الراتب العادي',
            descriptionEn: 'Pay overtime at 1.5 times regular rate',
            category: 'OVERTIME',
            trigger: SmartPolicyTrigger.PAYROLL,
            icon: '⏱️',
            isPopular: true,
            isSaudiCompliant: true,
            tags: ['إضافي', 'overtime', 'عمل'],
            parameters: [
                {
                    id: 'overtimeRate',
                    nameAr: 'معدل الأجر الإضافي',
                    nameEn: 'Overtime Rate',
                    type: 'number',
                    defaultValue: 1.5,
                    min: 1,
                    max: 3,
                    required: true,
                },
            ],
            defaultConditions: [
                { field: 'overtimeHours', operator: 'gt', value: 0 },
            ],
            defaultActions: [
                {
                    type: 'ADD',
                    valueType: 'FORMULA',
                    value: 'overtimeHours * hourlyRate * overtimeRate',
                    base: 'HOURLY_RATE',
                    componentCode: 'OVERTIME',
                    descriptionAr: 'بدل عمل إضافي',
                    descriptionEn: 'Overtime Pay',
                },
            ],
        });

        // OT-002: Weekend Overtime (2x)
        this.register({
            id: 'OT-002',
            code: 'OVERTIME_WEEKEND',
            nameAr: 'العمل الإضافي في الإجازات (2x)',
            nameEn: 'Weekend/Holiday Overtime (2x)',
            descriptionAr: 'دفع أجر مضاعف عند العمل في أيام الراحة أو العطل',
            descriptionEn: 'Pay double rate for work on weekends/holidays',
            category: 'OVERTIME',
            trigger: SmartPolicyTrigger.PAYROLL,
            icon: '📅',
            isSaudiCompliant: true,
            tags: ['إضافي', 'إجازة', 'عطلة', 'weekend'],
            parameters: [
                {
                    id: 'weekendRate',
                    nameAr: 'معدل أجر الإجازات',
                    nameEn: 'Weekend Rate',
                    type: 'number',
                    defaultValue: 2,
                    min: 1.5,
                    max: 3,
                    required: true,
                },
            ],
            defaultConditions: [
                { field: 'weekendHours', operator: 'gt', value: 0 },
            ],
            defaultActions: [
                {
                    type: 'ADD',
                    valueType: 'FORMULA',
                    value: 'weekendHours * hourlyRate * weekendRate',
                    base: 'HOURLY_RATE',
                    componentCode: 'WEEKEND_OVERTIME',
                    descriptionAr: 'بدل عمل إضافي في الإجازات',
                    descriptionEn: 'Weekend Overtime Pay',
                },
            ],
        });
    }

    // ============== SAUDI LABOR LAW Templates ==============

    private registerSaudiLaborTemplates(): void {
        // SL-001: End of Service Award (مكافأة نهاية الخدمة)
        this.register({
            id: 'SL-001',
            code: 'END_OF_SERVICE',
            nameAr: 'مكافأة نهاية الخدمة',
            nameEn: 'End of Service Award',
            descriptionAr: 'مكافأة نهاية الخدمة وفقاً لنظام العمل السعودي',
            descriptionEn: 'End of service benefits per Saudi Labor Law',
            category: 'SAUDI_LABOR_LAW',
            trigger: SmartPolicyTrigger.CONTRACT,
            icon: '🎖️',
            isPopular: true,
            isSaudiCompliant: true,
            tags: ['نهاية خدمة', 'end of service', 'مكافأة'],
            parameters: [],
            defaultConditions: [
                { field: 'yearsOfService', operator: 'gte', value: 2 },
            ],
            defaultActions: [
                {
                    type: 'ADD',
                    valueType: 'FORMULA',
                    value: 'EOS_SAUDI_FORMULA',
                    componentCode: 'END_OF_SERVICE',
                    descriptionAr: 'مكافأة نهاية الخدمة',
                    descriptionEn: 'End of Service Award',
                },
            ],
        });

        // SL-002: Housing Allowance (بدل سكن)
        this.register({
            id: 'SL-002',
            code: 'HOUSING_ALLOWANCE',
            nameAr: 'بدل السكن',
            nameEn: 'Housing Allowance',
            descriptionAr: 'بدل السكن كنسبة من الراتب الأساسي (25%)',
            descriptionEn: 'Housing allowance as percentage of basic salary',
            category: 'SAUDI_LABOR_LAW',
            trigger: SmartPolicyTrigger.PAYROLL,
            icon: '🏠',
            isPopular: true,
            isSaudiCompliant: true,
            tags: ['سكن', 'بدل', 'housing'],
            parameters: [
                {
                    id: 'housingPercentage',
                    nameAr: 'نسبة بدل السكن (%)',
                    nameEn: 'Housing Percentage (%)',
                    type: 'percentage',
                    defaultValue: 25,
                    min: 0,
                    max: 50,
                    required: true,
                },
            ],
            defaultConditions: [],
            defaultActions: [
                {
                    type: 'ADD',
                    valueType: 'PERCENTAGE',
                    value: 25,
                    valueFromParam: 'housingPercentage',
                    base: 'BASIC',
                    componentCode: 'HOUSING_ALLOWANCE',
                    descriptionAr: 'بدل السكن',
                    descriptionEn: 'Housing Allowance',
                },
            ],
        });

        // SL-003: Transportation Allowance (بدل مواصلات)
        this.register({
            id: 'SL-003',
            code: 'TRANSPORTATION_ALLOWANCE',
            nameAr: 'بدل المواصلات',
            nameEn: 'Transportation Allowance',
            descriptionAr: 'بدل مواصلات شهري ثابت',
            descriptionEn: 'Fixed monthly transportation allowance',
            category: 'SAUDI_LABOR_LAW',
            trigger: SmartPolicyTrigger.PAYROLL,
            icon: '🚗',
            isSaudiCompliant: true,
            tags: ['مواصلات', 'بدل', 'transportation'],
            parameters: [
                {
                    id: 'transportAmount',
                    nameAr: 'قيمة بدل المواصلات',
                    nameEn: 'Transportation Amount',
                    type: 'number',
                    defaultValue: 500,
                    min: 0,
                    max: 2000,
                    required: true,
                },
            ],
            defaultConditions: [],
            defaultActions: [
                {
                    type: 'ADD',
                    valueType: 'FIXED',
                    value: 500,
                    valueFromParam: 'transportAmount',
                    componentCode: 'TRANSPORTATION',
                    descriptionAr: 'بدل المواصلات',
                    descriptionEn: 'Transportation Allowance',
                },
            ],
        });

        // SL-004: GOSI Employee Contribution (اشتراك التأمينات)
        this.register({
            id: 'SL-004',
            code: 'GOSI_EMPLOYEE',
            nameAr: 'اشتراك التأمينات الاجتماعية (الموظف)',
            nameEn: 'GOSI Employee Contribution',
            descriptionAr: 'خصم حصة الموظف في التأمينات الاجتماعية (9.75%)',
            descriptionEn: 'Deduct employee GOSI contribution (9.75%)',
            category: 'SAUDI_LABOR_LAW',
            trigger: SmartPolicyTrigger.PAYROLL,
            icon: '🏛️',
            isPopular: true,
            isSaudiCompliant: true,
            tags: ['تأمينات', 'gosi', 'اشتراك'],
            parameters: [
                {
                    id: 'gosiRate',
                    nameAr: 'نسبة التأمينات (%)',
                    nameEn: 'GOSI Rate (%)',
                    type: 'percentage',
                    defaultValue: 9.75,
                    min: 0,
                    max: 15,
                    required: true,
                },
            ],
            defaultConditions: [
                { field: 'isGosiApplicable', operator: 'eq', value: true },
            ],
            defaultActions: [
                {
                    type: 'DEDUCT',
                    valueType: 'PERCENTAGE',
                    value: 9.75,
                    valueFromParam: 'gosiRate',
                    base: 'BASIC',
                    componentCode: 'GOSI_EMPLOYEE',
                    descriptionAr: 'اشتراك التأمينات الاجتماعية',
                    descriptionEn: 'GOSI Employee Contribution',
                },
            ],
        });
    }

    // ============== TENURE Templates ==============

    private registerTenureTemplates(): void {
        // TEN-001: Annual Increment
        this.register({
            id: 'TEN-001',
            code: 'ANNUAL_INCREMENT',
            nameAr: 'الزيادة السنوية',
            nameEn: 'Annual Increment',
            descriptionAr: 'زيادة سنوية في الراتب بعد إتمام سنة',
            descriptionEn: 'Annual salary increment after completing year',
            category: 'TENURE',
            trigger: SmartPolicyTrigger.ANNIVERSARY,
            icon: '📈',
            isPopular: true,
            tags: ['سنوية', 'زيادة', 'increment'],
            parameters: [
                {
                    id: 'incrementPercentage',
                    nameAr: 'نسبة الزيادة (%)',
                    nameEn: 'Increment Percentage (%)',
                    type: 'percentage',
                    defaultValue: 5,
                    min: 1,
                    max: 20,
                    required: true,
                },
            ],
            defaultConditions: [
                { field: 'yearsOfService', operator: 'gte', value: 1 },
            ],
            defaultActions: [
                {
                    type: 'ADD',
                    valueType: 'PERCENTAGE',
                    value: 5,
                    valueFromParam: 'incrementPercentage',
                    base: 'BASIC',
                    componentCode: 'ANNUAL_INCREMENT',
                    descriptionAr: 'زيادة سنوية',
                    descriptionEn: 'Annual Increment',
                },
            ],
        });

        // TEN-002: Loyalty Bonus (5+ years)
        this.register({
            id: 'TEN-002',
            code: 'LOYALTY_BONUS',
            nameAr: 'مكافأة الولاء (5 سنوات فأكثر)',
            nameEn: 'Loyalty Bonus (5+ years)',
            descriptionAr: 'مكافأة للموظفين الذين أتموا 5 سنوات أو أكثر',
            descriptionEn: 'Bonus for employees with 5+ years of service',
            category: 'TENURE',
            trigger: SmartPolicyTrigger.ANNIVERSARY,
            icon: '🎖️',
            isPopular: true,
            tags: ['ولاء', 'سنوات', 'loyalty'],
            parameters: [
                {
                    id: 'minYears',
                    nameAr: 'الحد الأدنى للسنوات',
                    nameEn: 'Minimum Years',
                    type: 'number',
                    defaultValue: 5,
                    min: 1,
                    max: 20,
                    required: true,
                },
                {
                    id: 'bonusAmount',
                    nameAr: 'قيمة المكافأة',
                    nameEn: 'Bonus Amount',
                    type: 'number',
                    defaultValue: 5000,
                    min: 1000,
                    max: 50000,
                    required: true,
                },
            ],
            defaultConditions: [
                { field: 'yearsOfService', operator: 'gte', value: 5, valueFromParam: 'minYears' },
            ],
            defaultActions: [
                {
                    type: 'ADD',
                    valueType: 'FIXED',
                    value: 5000,
                    valueFromParam: 'bonusAmount',
                    componentCode: 'LOYALTY_BONUS',
                    descriptionAr: 'مكافأة الولاء',
                    descriptionEn: 'Loyalty Bonus',
                },
            ],
        });
    }
}
