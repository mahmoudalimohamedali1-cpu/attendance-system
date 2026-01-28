import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AiService } from '../../ai/ai.service';

/**
 * 🤖 AI Policy Builder Service
 * منشئ السياسات الذكي - يحول الأوصاف البسيطة لسياسات متكاملة
 * 
 * ✨ الميزات:
 * - فهم اللغة الطبيعية (عربي/إنجليزي)
 * - اقتراح سياسات ذكية بناءً على السياق
 * - تحسين السياسات تلقائياً
 * - التعلم من السياسات الناجحة
 * - توليد شروط معقدة من وصف بسيط
 */

// ============== Types ==============

export interface PolicySuggestion {
    id: string;
    name: string;
    description: string;
    originalText: string;
    parsedPolicy: ParsedPolicyStructure;
    confidence: number;
    estimatedImpact: ImpactEstimate;
    similarPolicies: string[];
    warnings: string[];
    optimizations: Optimization[];
}

export interface ParsedPolicyStructure {
    trigger: {
        event: string;
        subEvent?: string;
        timing?: 'BEFORE' | 'AFTER' | 'DURING';
    };
    conditions: PolicyCondition[];
    actions: PolicyAction[];
    scope: PolicyScope;
    schedule?: PolicySchedule;
    exceptions?: PolicyException[];
}

export interface PolicyCondition {
    id: string;
    field: string;
    operator: string;
    value: any;
    logicalOperator?: 'AND' | 'OR';
    group?: string;
    description: string;
}

export interface PolicyAction {
    id: string;
    type: string;
    valueType: 'FIXED' | 'PERCENTAGE' | 'FORMULA' | 'DYNAMIC';
    value: any;
    formula?: string;
    componentCode?: string;
    description: string;
    priority: number;
}

export interface PolicyScope {
    type: 'ALL' | 'DEPARTMENT' | 'BRANCH' | 'JOB_TITLE' | 'CUSTOM';
    includeIds?: string[];
    excludeIds?: string[];
    conditions?: ScopeCondition[];
}

export interface ScopeCondition {
    field: string;
    operator: string;
    value: any;
}

export interface PolicySchedule {
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'ON_EVENT';
    dayOfMonth?: number;
    dayOfWeek?: number;
    time?: string;
    timezone?: string;
}

export interface PolicyException {
    type: 'EMPLOYEE' | 'DEPARTMENT' | 'DATE_RANGE' | 'CONDITION';
    targetId?: string;
    startDate?: Date;
    endDate?: Date;
    condition?: PolicyCondition;
    reason: string;
}

export interface ImpactEstimate {
    affectedEmployees: number;
    estimatedMonthlyCost: number;
    estimatedMonthlySavings: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    complianceScore: number;
}

export interface Optimization {
    type: 'PERFORMANCE' | 'COST' | 'FAIRNESS' | 'COMPLIANCE';
    suggestion: string;
    impact: string;
    autoApplicable: boolean;
}

export interface BuilderContext {
    companyId: string;
    userId: string;
    existingPolicies: any[];
    companyProfile: CompanyProfile;
    industryBenchmarks?: IndustryBenchmark[];
}

export interface CompanyProfile {
    industry: string;
    size: 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE';
    country: string;
    workingDays: number[];
    averageSalary: number;
    employeeCount: number;
}

export interface IndustryBenchmark {
    metric: string;
    value: number;
    percentile: number;
}

// ============== Implementation ==============

@Injectable()
export class AIPolicyBuilderService {
    private readonly logger = new Logger(AIPolicyBuilderService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly aiService: AiService,
    ) { }

    /**
     * 🎯 بناء سياسة من وصف نصي
     */
    async buildFromDescription(
        description: string,
        context: BuilderContext,
    ): Promise<PolicySuggestion> {
        this.logger.log(`Building policy from description: ${description.substring(0, 50)}...`);

        // 1. تحليل الوصف باستخدام AI
        const analysis = await this.analyzeDescription(description, context);

        // 2. بناء هيكل السياسة
        const parsedPolicy = await this.buildPolicyStructure(analysis, context);

        // 3. تقدير التأثير
        const impact = await this.estimateImpact(parsedPolicy, context);

        // 4. البحث عن سياسات مشابهة
        const similarPolicies = await this.findSimilarPolicies(parsedPolicy, context);

        // 5. فحص التعارضات والتحذيرات
        const warnings = await this.checkForWarnings(parsedPolicy, context);

        // 6. اقتراح تحسينات
        const optimizations = await this.suggestOptimizations(parsedPolicy, context);

        // 7. حساب درجة الثقة
        const confidence = this.calculateConfidence(analysis, warnings);

        return {
            id: this.generateId(),
            name: analysis.suggestedName,
            description: analysis.explanation,
            originalText: description,
            parsedPolicy,
            confidence,
            estimatedImpact: impact,
            similarPolicies,
            warnings,
            optimizations,
        };
    }

    /**
     * 🧠 تحليل الوصف باستخدام AI
     */
    private async analyzeDescription(
        description: string,
        context: BuilderContext,
    ): Promise<DescriptionAnalysis> {
        const prompt = `
أنت خبير في سياسات الموارد البشرية. حلل الوصف التالي واستخرج المعلومات المطلوبة.

الوصف: "${description}"

معلومات الشركة:
- الصناعة: ${context.companyProfile.industry}
- الحجم: ${context.companyProfile.size}
- البلد: ${context.companyProfile.country}
- عدد الموظفين: ${context.companyProfile.employeeCount}

استخرج:
1. نوع الحدث المُشغّل (ATTENDANCE, LEAVE, PAYROLL, PERFORMANCE, etc.)
2. الشروط المطلوبة (كل شرط: الحقل، العامل، القيمة)
3. الإجراءات المطلوبة (النوع، القيمة، الصيغة إن وجدت)
4. نطاق التطبيق (الجميع، قسم محدد، إلخ)
5. اسم مقترح للسياسة
6. شرح مبسط للسياسة

أجب بصيغة JSON فقط.
`;

        try {
            const response = await this.aiService.generateContent(prompt);
            return this.parseAIResponse(response);
        } catch (error) {
            this.logger.error(`AI analysis failed: ${error.message}`);
            return this.fallbackAnalysis(description);
        }
    }

    /**
     * 🏗️ بناء هيكل السياسة
     */
    private async buildPolicyStructure(
        analysis: DescriptionAnalysis,
        context: BuilderContext,
    ): Promise<ParsedPolicyStructure> {
        // بناء الشروط
        const conditions = analysis.conditions.map((c, index) => ({
            id: `cond_${index}`,
            field: this.mapFieldName(c.field),
            operator: this.normalizeOperator(c.operator),
            value: c.value,
            logicalOperator: index > 0 ? (c.logicalOperator || 'AND') : undefined,
            description: c.description || this.generateConditionDescription(c),
        }));

        // بناء الإجراءات
        const actions = analysis.actions.map((a, index) => ({
            id: `act_${index}`,
            type: this.mapActionType(a.type),
            valueType: this.detectValueType(a.value),
            value: a.value,
            formula: a.formula,
            componentCode: a.componentCode || this.generateComponentCode(a.type),
            description: a.description || this.generateActionDescription(a),
            priority: index + 1,
        }));

        // بناء النطاق
        const scope = this.buildScope(analysis.scope, context);

        // تحديد الجدولة
        const schedule = this.determineSchedule(analysis.trigger);

        return {
            trigger: {
                event: analysis.trigger.event,
                subEvent: analysis.trigger.subEvent,
                timing: (analysis.trigger.timing || 'AFTER') as 'BEFORE' | 'AFTER' | 'DURING',
            },
            conditions,
            actions,
            scope,
            schedule,
        };
    }

    /**
     * 📊 تقدير تأثير السياسة
     */
    private async estimateImpact(
        policy: ParsedPolicyStructure,
        context: BuilderContext,
    ): Promise<ImpactEstimate> {
        // حساب عدد الموظفين المتأثرين
        const affectedEmployees = await this.calculateAffectedEmployees(policy, context);

        // تقدير التكلفة/التوفير الشهري
        const { cost, savings } = await this.calculateFinancialImpact(policy, context, affectedEmployees);

        // تقييم المخاطر
        const riskLevel = this.assessRisk(policy, context);

        // درجة الامتثال
        const complianceScore = await this.calculateComplianceScore(policy, context);

        return {
            affectedEmployees,
            estimatedMonthlyCost: cost,
            estimatedMonthlySavings: savings,
            riskLevel,
            complianceScore,
        };
    }

    /**
     * 🔍 البحث عن سياسات مشابهة
     */
    private async findSimilarPolicies(
        policy: ParsedPolicyStructure,
        context: BuilderContext,
    ): Promise<string[]> {
        const existing = context.existingPolicies;
        const similar: string[] = [];

        for (const existing_policy of existing) {
            const similarity = this.calculateSimilarity(policy, existing_policy.parsedPolicy);
            if (similarity > 0.7) {
                similar.push(existing_policy.id);
            }
        }

        return similar;
    }

    /**
     * ⚠️ فحص التحذيرات
     */
    private async checkForWarnings(
        policy: ParsedPolicyStructure,
        context: BuilderContext,
    ): Promise<string[]> {
        const warnings: string[] = [];

        // فحص التعارض مع سياسات موجودة
        for (const existing of context.existingPolicies) {
            if (this.hasConflict(policy, existing.parsedPolicy)) {
                warnings.push(`قد تتعارض مع السياسة: ${existing.name}`);
            }
        }

        // فحص الامتثال القانوني
        const legalWarnings = this.checkLegalCompliance(policy, context.companyProfile.country);
        warnings.push(...legalWarnings);

        // فحص التأثير المالي الكبير
        if (policy.actions.some(a => a.valueType === 'PERCENTAGE' && Number(a.value) > 20)) {
            warnings.push('السياسة تتضمن نسبة عالية قد تؤثر بشكل كبير على الميزانية');
        }

        // فحص الشروط المعقدة
        if (policy.conditions.length > 5) {
            warnings.push('السياسة تحتوي على شروط معقدة، قد يصعب فهمها');
        }

        return warnings;
    }

    /**
     * 💡 اقتراح تحسينات
     */
    private async suggestOptimizations(
        policy: ParsedPolicyStructure,
        context: BuilderContext,
    ): Promise<Optimization[]> {
        const optimizations: Optimization[] = [];

        // تحسينات الأداء
        if (policy.conditions.length > 3) {
            optimizations.push({
                type: 'PERFORMANCE',
                suggestion: 'دمج الشروط المتشابهة لتحسين سرعة التنفيذ',
                impact: 'تقليل وقت المعالجة بنسبة 20%',
                autoApplicable: true,
            });
        }

        // تحسينات التكلفة
        const avgSalary = context.companyProfile.averageSalary;
        for (const action of policy.actions) {
            if (action.valueType === 'FIXED' && Number(action.value) > avgSalary * 0.1) {
                optimizations.push({
                    type: 'COST',
                    suggestion: `استخدام نسبة من الراتب بدلاً من مبلغ ثابت (${action.value})`,
                    impact: 'تحقيق عدالة أكبر بين الموظفين',
                    autoApplicable: true,
                });
            }
        }

        // تحسينات العدالة
        if (policy.scope.type === 'ALL' && policy.conditions.length === 0) {
            optimizations.push({
                type: 'FAIRNESS',
                suggestion: 'إضافة شروط لضمان العدالة (مثل: فترة التجربة)',
                impact: 'ضمان تطبيق عادل للسياسة',
                autoApplicable: false,
            });
        }

        // تحسينات الامتثال
        const complianceOpts = this.getComplianceOptimizations(policy, context);
        optimizations.push(...complianceOpts);

        return optimizations;
    }

    // ============== Smart Suggestions ==============

    /**
     * 🎁 اقتراحات ذكية للسياسات
     */
    async getSuggestions(context: BuilderContext): Promise<PolicySuggestion[]> {
        const suggestions: PolicySuggestion[] = [];

        // 1. سياسات مبنية على الصناعة
        const industrySuggestions = await this.getIndustrySuggestions(context);
        suggestions.push(...industrySuggestions);

        // 2. سياسات مبنية على حجم الشركة
        const sizeSuggestions = await this.getSizeSuggestions(context);
        suggestions.push(...sizeSuggestions);

        // 3. سياسات مبنية على الفجوات
        const gapSuggestions = await this.getGapSuggestions(context);
        suggestions.push(...gapSuggestions);

        // 4. سياسات مبنية على التوجهات
        const trendSuggestions = await this.getTrendSuggestions(context);
        suggestions.push(...trendSuggestions);

        return suggestions.slice(0, 10); // أفضل 10 اقتراحات
    }

    /**
     * 🏭 اقتراحات بناءً على الصناعة
     */
    private async getIndustrySuggestions(context: BuilderContext): Promise<PolicySuggestion[]> {
        const industryPolicies: Record<string, string[]> = {
            'RETAIL': [
                'مكافأة 500 ريال للموظف الذي يحقق مبيعات أعلى من الهدف بـ 20%',
                'خصم 2% من الراتب عند التأخر أكثر من 3 مرات في الشهر',
                'بدل مواصلات إضافي 300 ريال للعمل في العطلات الرسمية',
            ],
            'TECHNOLOGY': [
                'مكافأة 1000 ريال لإكمال مشروع قبل الموعد المحدد',
                'بدل عمل عن بعد 500 ريال شهرياً',
                'مكافأة سنوية 10% من الراتب لمن يحصل على شهادة مهنية',
            ],
            'HEALTHCARE': [
                'بدل مخاطر 15% من الراتب الأساسي',
                'مكافأة 200 ريال لكل نوبة إضافية',
                'خصم يوم واحد من الراتب للغياب بدون عذر طبي',
            ],
            'CONSTRUCTION': [
                'بدل موقع 10% من الراتب للعمل خارج المدينة',
                'مكافأة 200 ريال شهرياً للالتزام بمواعيد الحضور',
                'بدل سكن إضافي للمشاريع البعيدة',
            ],
            'EDUCATION': [
                'مكافأة 500 ريال للمعلم المتميز شهرياً',
                'مكافأة 1000 ريال لإكمال المنهج قبل الموعد',
                'خصم 100 ريال لكل حصة متغيب عنها',
            ],
        };

        const descriptions = industryPolicies[context.companyProfile.industry] || industryPolicies['RETAIL'];
        const suggestions: PolicySuggestion[] = [];

        for (const desc of descriptions) {
            const suggestion = await this.buildFromDescription(desc, context);
            suggestions.push(suggestion);
        }

        return suggestions;
    }

    /**
     * 📏 اقتراحات بناءً على حجم الشركة
     */
    private async getSizeSuggestions(context: BuilderContext): Promise<PolicySuggestion[]> {
        const sizePolicies: Record<string, string[]> = {
            'SMALL': [
                'مكافأة نهاية السنة 50% من راتب شهر واحد لمن أكمل السنة',
            ],
            'MEDIUM': [
                'مكافأة الأداء ربع السنوية بناءً على تحقيق الأهداف',
                'برنامج التقدير الشهري للموظف المثالي',
            ],
            'LARGE': [
                'نظام النقاط للمكافآت التراكمية',
                'برنامج الترقيات المبني على الكفاءات',
            ],
            'ENTERPRISE': [
                'نظام المكافآت المتدرج حسب المستوى الوظيفي',
                'برنامج الحوافز طويلة الأجل',
                'نظام تقييم الأداء 360 درجة',
            ],
        };

        const descriptions = sizePolicies[context.companyProfile.size] || [];
        const suggestions: PolicySuggestion[] = [];

        for (const desc of descriptions) {
            const suggestion = await this.buildFromDescription(desc, context);
            suggestions.push(suggestion);
        }

        return suggestions;
    }

    /**
     * 🕳️ اقتراحات لسد الفجوات
     */
    private async getGapSuggestions(context: BuilderContext): Promise<PolicySuggestion[]> {
        const existingTypes = new Set(
            context.existingPolicies.map(p => p.parsedPolicy?.trigger?.event)
        );

        const allTypes = ['ATTENDANCE', 'LEAVE', 'PERFORMANCE', 'ANNIVERSARY', 'CUSTODY', 'PAYROLL'];
        const missingTypes = allTypes.filter(t => !existingTypes.has(t));

        const gapPolicies: Record<string, string> = {
            'ATTENDANCE': 'مكافأة 200 ريال للموظف الذي لا يتأخر طوال الشهر',
            'LEAVE': 'صرف بدل نقدي للإجازات غير المستخدمة نهاية السنة',
            'PERFORMANCE': 'مكافأة 10% من الراتب لتحقيق 100% من الأهداف',
            'ANNIVERSARY': 'مكافأة سنوية تعادل راتب أسبوع لكل سنة خدمة',
            'CUSTODY': 'خصم 500 ريال عند عدم إرجاع العهدة في الموعد',
        };

        const suggestions: PolicySuggestion[] = [];

        for (const type of missingTypes.slice(0, 3)) {
            const desc = gapPolicies[type];
            if (desc) {
                const suggestion = await this.buildFromDescription(desc, context);
                suggestions.push(suggestion);
            }
        }

        return suggestions;
    }

    /**
     * 📈 اقتراحات بناءً على التوجهات
     */
    private async getTrendSuggestions(context: BuilderContext): Promise<PolicySuggestion[]> {
        // سياسات عصرية ومطلوبة
        const trendingPolicies = [
            'بدل العمل المرن 300 ريال شهرياً',
            'مكافأة الإحالة 2000 ريال عند توظيف مرشح ناجح',
            'بدل التعلم المستمر 1000 ريال سنوياً',
            'مكافأة الأفكار الإبداعية حتى 5000 ريال',
            'برنامج الصحة النفسية - يوم إجازة شهرياً للراحة',
        ];

        const suggestions: PolicySuggestion[] = [];

        for (const desc of trendingPolicies.slice(0, 2)) {
            const suggestion = await this.buildFromDescription(desc, context);
            suggestions.push(suggestion);
        }

        return suggestions;
    }

    // ============== Helper Methods ==============

    private parseAIResponse(response: string): DescriptionAnalysis {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            this.logger.warn('Failed to parse AI response as JSON');
        }
        return this.fallbackAnalysis('');
    }

    private fallbackAnalysis(description: string): DescriptionAnalysis {
        // تحليل بسيط بدون AI
        const analysis: DescriptionAnalysis = {
            trigger: { event: 'ATTENDANCE' },
            conditions: [],
            actions: [],
            scope: { type: 'ALL' },
            suggestedName: 'سياسة جديدة',
            explanation: description,
        };

        // محاولة استخراج الأرقام كقيم
        const numbers = description.match(/\d+/g);
        if (numbers && numbers.length > 0) {
            analysis.actions.push({
                type: 'BONUS',
                value: parseInt(numbers[0]),
                description: 'قيمة مستخرجة من الوصف',
            });
        }

        return analysis;
    }

    private mapFieldName(field: string): string {
        const fieldMappings: Record<string, string> = {
            'التأخير': 'attendance.currentPeriod.lateDays',
            'الغياب': 'attendance.currentPeriod.absentDays',
            'الحضور': 'attendance.currentPeriod.presentDays',
            'الراتب': 'contract.basicSalary',
            'المبيعات': 'performance.sales',
            'الهدف': 'performance.targetAchievement',
            'سنوات الخدمة': 'employee.tenure.years',
            'القسم': 'employee.department',
        };
        return fieldMappings[field] || field;
    }

    private normalizeOperator(operator: string): string {
        const operatorMappings: Record<string, string> = {
            'أكبر من': 'GREATER_THAN',
            'أقل من': 'LESS_THAN',
            'يساوي': 'EQUALS',
            'أكثر من': 'GREATER_THAN',
            '>': 'GREATER_THAN',
            '<': 'LESS_THAN',
            '=': 'EQUALS',
            '>=': 'GREATER_THAN_OR_EQUAL',
            '<=': 'LESS_THAN_OR_EQUAL',
        };
        return operatorMappings[operator] || operator;
    }

    private mapActionType(type: string): string {
        const typeMappings: Record<string, string> = {
            'مكافأة': 'BONUS',
            'خصم': 'DEDUCTION',
            'بدل': 'ALLOWANCE',
            'عمولة': 'COMMISSION',
        };
        return typeMappings[type] || type;
    }

    private detectValueType(value: any): 'FIXED' | 'PERCENTAGE' | 'FORMULA' | 'DYNAMIC' {
        if (typeof value === 'string') {
            if (value.includes('%')) return 'PERCENTAGE';
            if (value.includes('*') || value.includes('/') || value.includes('+')) return 'FORMULA';
        }
        return 'FIXED';
    }

    private generateComponentCode(actionType: string): string {
        const codes: Record<string, string> = {
            'BONUS': 'SMART_BONUS',
            'DEDUCTION': 'SMART_DEDUCTION',
            'ALLOWANCE': 'SMART_ALLOWANCE',
        };
        return codes[actionType] || 'SMART_COMPONENT';
    }

    private generateConditionDescription(condition: any): string {
        return `${condition.field} ${condition.operator} ${condition.value}`;
    }

    private generateActionDescription(action: any): string {
        return `${action.type}: ${action.value}`;
    }

    private buildScope(scopeData: any, context: BuilderContext): PolicyScope {
        return {
            type: scopeData?.type || 'ALL',
            includeIds: scopeData?.includeIds,
            excludeIds: scopeData?.excludeIds,
        };
    }

    private determineSchedule(trigger: any): PolicySchedule | undefined {
        if (trigger.event === 'PAYROLL') {
            return { frequency: 'MONTHLY', dayOfMonth: 25 };
        }
        return undefined;
    }

    private async calculateAffectedEmployees(
        policy: ParsedPolicyStructure,
        context: BuilderContext,
    ): Promise<number> {
        if (policy.scope.type === 'ALL') {
            return context.companyProfile.employeeCount;
        }
        // تقدير تقريبي
        return Math.round(context.companyProfile.employeeCount * 0.3);
    }

    private async calculateFinancialImpact(
        policy: ParsedPolicyStructure,
        context: BuilderContext,
        affectedEmployees: number,
    ): Promise<{ cost: number; savings: number }> {
        let cost = 0;
        let savings = 0;

        for (const action of policy.actions) {
            const value = Number(action.value) || 0;

            if (['BONUS', 'ALLOWANCE'].includes(action.type)) {
                cost += value * affectedEmployees;
            } else if (action.type === 'DEDUCTION') {
                savings += value * affectedEmployees;
            }
        }

        return { cost, savings };
    }

    private assessRisk(policy: ParsedPolicyStructure, context: BuilderContext): 'LOW' | 'MEDIUM' | 'HIGH' {
        let riskScore = 0;

        // عدد الشروط
        if (policy.conditions.length > 5) riskScore += 2;

        // قيمة الإجراءات
        for (const action of policy.actions) {
            const value = Number(action.value) || 0;
            if (value > context.companyProfile.averageSalary * 0.2) {
                riskScore += 2;
            }
        }

        // النطاق
        if (policy.scope.type === 'ALL') riskScore += 1;

        if (riskScore >= 4) return 'HIGH';
        if (riskScore >= 2) return 'MEDIUM';
        return 'LOW';
    }

    private async calculateComplianceScore(
        policy: ParsedPolicyStructure,
        context: BuilderContext,
    ): Promise<number> {
        let score = 100;

        // خصم للسياسات بدون شروط
        if (policy.conditions.length === 0) score -= 10;

        // خصم للقيم العالية جداً
        for (const action of policy.actions) {
            if (Number(action.value) > context.companyProfile.averageSalary) {
                score -= 15;
            }
        }

        return Math.max(0, score);
    }

    private calculateSimilarity(policy1: ParsedPolicyStructure, policy2: any): number {
        if (!policy2) return 0;

        let similarity = 0;

        // مقارنة الـ trigger
        if (policy1.trigger.event === policy2.trigger?.event) {
            similarity += 0.3;
        }

        // مقارنة نوع الإجراءات
        const types1 = new Set(policy1.actions.map(a => a.type));
        const types2 = new Set(policy2.actions?.map((a: any) => a.type) || []);
        const commonTypes = [...types1].filter(t => types2.has(t)).length;
        similarity += (commonTypes / Math.max(types1.size, types2.size)) * 0.4;

        // مقارنة النطاق
        if (policy1.scope.type === policy2.scope?.type) {
            similarity += 0.3;
        }

        return similarity;
    }

    private hasConflict(policy1: ParsedPolicyStructure, policy2: any): boolean {
        if (!policy2) return false;

        // نفس الـ trigger ونفس الإجراءات = تعارض محتمل
        if (policy1.trigger.event === policy2.trigger?.event) {
            const types1 = new Set(policy1.actions.map(a => a.type));
            const types2 = new Set(policy2.actions?.map((a: any) => a.type) || []);
            const hasCommon = [...types1].some(t => types2.has(t));
            return hasCommon;
        }

        return false;
    }

    private checkLegalCompliance(policy: ParsedPolicyStructure, country: string): string[] {
        const warnings: string[] = [];

        // فحص الخصومات (لا تتجاوز 50% من الراتب)
        for (const action of policy.actions) {
            if (action.type === 'DEDUCTION' && action.valueType === 'PERCENTAGE') {
                if (Number(action.value) > 50) {
                    warnings.push('الخصم يتجاوز الحد القانوني (50% من الراتب)');
                }
            }
        }

        return warnings;
    }

    private getComplianceOptimizations(
        policy: ParsedPolicyStructure,
        context: BuilderContext,
    ): Optimization[] {
        const optimizations: Optimization[] = [];

        // اقتراح إضافة فترة تجربة
        const hasProbationCondition = policy.conditions.some(
            c => c.field.includes('tenure') || c.field.includes('probation')
        );

        if (!hasProbationCondition) {
            optimizations.push({
                type: 'COMPLIANCE',
                suggestion: 'إضافة شرط اجتياز فترة التجربة',
                impact: 'الامتثال لقوانين العمل',
                autoApplicable: true,
            });
        }

        return optimizations;
    }

    private generateId(): string {
        return `ps_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private calculateConfidence(analysis: DescriptionAnalysis, warnings: string[]): number {
        let confidence = 0.8;

        // خفض الثقة مع كل تحذير
        confidence -= warnings.length * 0.05;

        // خفض الثقة إذا كانت الشروط قليلة
        if (analysis.conditions.length === 0) {
            confidence -= 0.1;
        }

        // خفض الثقة إذا لم تكن هناك إجراءات
        if (analysis.actions.length === 0) {
            confidence -= 0.2;
        }

        return Math.max(0.3, Math.min(1, confidence));
    }
}

// ============== Internal Types ==============

interface DescriptionAnalysis {
    trigger: { event: string; subEvent?: string; timing?: string };
    conditions: any[];
    actions: any[];
    scope: any;
    suggestedName: string;
    explanation: string;
}
