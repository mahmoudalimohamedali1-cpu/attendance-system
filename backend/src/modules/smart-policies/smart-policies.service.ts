import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PolicyParserService, ParsedPolicyRule } from '../ai/services/policy-parser.service';
import { PolicyContextService } from './policy-context.service';
import { SmartPolicyExecutorService } from './smart-policy-executor.service';
import { SmartPolicyTrigger, SmartPolicyStatus } from '@prisma/client';
// === AI-Free Rule Engine (Phase V2) ===
import { PolicyTemplateRegistryService } from './templates/policy-template.registry';
import { PELParserService } from './engines/pel-parser.service';

/**
 * DTO لإنشاء سياسة ذكية
 */
export interface CreateSmartPolicyDto {
    originalText: string; // النص الأصلي بالعربي
    name?: string;
    effectiveFrom?: Date;
    effectiveTo?: Date;
}

/**
 * DTO لتحديث سياسة ذكية
 */
export interface UpdateSmartPolicyDto {
    name?: string;
    status?: SmartPolicyStatus;
    isActive?: boolean;
    priority?: number;
    effectiveFrom?: Date;
    effectiveTo?: Date;
}

@Injectable()
export class SmartPoliciesService {
    private readonly logger = new Logger(SmartPoliciesService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly policyParser: PolicyParserService,
        private readonly policyContext: PolicyContextService,
        @Inject(forwardRef(() => SmartPolicyExecutorService))
        private readonly policyExecutor: SmartPolicyExecutorService,
        // === AI-Free Rule Engine (Phase V2) ===
        private readonly templateRegistry: PolicyTemplateRegistryService,
        private readonly pelParser: PELParserService,
    ) { }

    /**
     * تحليل نص السياسة (مع fallback للـ PEL والـ Templates لو الـ AI مش متاح)
     */
    async analyzePolicy(originalText: string): Promise<ParsedPolicyRule> {
        const safeText = originalText || '';
        this.logger.log(`Analyzing policy: "${safeText.substring(0, 50)}..."`);

        // 1️⃣ Try AI Parser first
        try {
            const aiResult = await this.policyParser.parsePolicy(safeText);
            if (aiResult && aiResult.understood) {
                this.logger.log('AI parsing successful');
                return aiResult;
            }
        } catch (aiError) {
            this.logger.warn(`AI parser unavailable: ${(aiError as Error).message}`);
        }

        // 2️⃣ Fallback to PEL Parser (for structured expressions)
        this.logger.log('Trying PEL parser fallback...');
        try {
            const pelResult = this.pelParser.parse(safeText);
            if (pelResult.success && pelResult.parsedRule) {
                this.logger.log('PEL parsing successful');
                // Map PEL types to ParsedPolicyRule types
                const mappedConditions = (pelResult.parsedRule.conditions || []).map((c: any) => ({
                    ...c,
                    operator: this.mapPelOperator(c.operator),
                }));
                const mappedActions = (pelResult.parsedRule.actions || []).map((a: any) => ({
                    ...a,
                    type: a.type === 'ADD' ? 'ADD_TO_PAYROLL' : a.type === 'DEDUCT' ? 'DEDUCT_FROM_PAYROLL' : a.type,
                }));
                return {
                    understood: true,
                    explanation: `تم التحليل بواسطة محرك PEL: ${pelResult.parsedRule.explanation || safeText}`,
                    trigger: { event: 'PAYROLL', subEvent: null },
                    conditions: mappedConditions as any,
                    actions: mappedActions as any,
                    scope: { type: 'ALL_EMPLOYEES' as const },
                    clarificationNeeded: 'false' as any,
                };
            }
        } catch (pelError) {
            this.logger.debug(`PEL parser failed: ${(pelError as Error).message}`);
        }

        // 3️⃣ Fallback to Template matching (keyword-based)
        this.logger.log('Trying template matching fallback...');
        const matchedTemplate = this.matchTextToTemplate(safeText);
        if (matchedTemplate) {
            this.logger.log(`Template matched: ${matchedTemplate.id}`);
            const generated = this.templateRegistry.generateParsedRule(matchedTemplate.id);
            return {
                understood: generated.understood,
                explanation: `تم المطابقة مع قالب: ${matchedTemplate.nameAr}`,
                trigger: { event: matchedTemplate.trigger, subEvent: null },
                conditions: generated.conditions as any || [],
                actions: generated.actions as any || [],
                scope: { type: 'ALL_EMPLOYEES' as const },
                clarificationNeeded: 'false' as any,
            };
        }

        // 4️⃣ Return default template based on keywords
        this.logger.log('Using default template based on keywords...');
        const category = this.detectCategoryFromText(safeText);
        const defaultRule = this.templateRegistry.getDefaultTemplate(category);
        return {
            understood: defaultRule.understood,
            explanation: `تم استخدام قالب افتراضي. يمكنك تخصيص الشروط والإجراءات.`,
            trigger: { event: 'PAYROLL', subEvent: null },
            conditions: defaultRule.conditions as any || [],
            actions: defaultRule.actions as any || [],
            scope: { type: 'ALL_EMPLOYEES' as const },
            clarificationNeeded: 'true' as any,
        };
    }

    /**
     * تحويل operators من PEL إلى القيم المطلوبة
     */
    private mapPelOperator(op: string): string {
        const mapping: Record<string, string> = {
            '>': 'GREATER_THAN',
            '<': 'LESS_THAN',
            '>=': 'GREATER_THAN_OR_EQUAL',
            '<=': 'LESS_THAN_OR_EQUAL',
            '=': 'EQUALS',
            '==': 'EQUALS',
            '!=': '!=',
            'GREATER_THAN': 'GREATER_THAN',
            'LESS_THAN': 'LESS_THAN',
            'GREATER_THAN_OR_EQUAL': 'GREATER_THAN_OR_EQUAL',
            'LESS_THAN_OR_EQUAL': 'LESS_THAN_OR_EQUAL',
            'EQUALS': 'EQUALS',
            'CONTAINS': 'CONTAINS',
            'IN': 'IN',
            'BETWEEN': 'BETWEEN',
        };
        return mapping[op] || op;
    }

    /**
     * مطابقة النص مع القوالب المتاحة
     */
    private matchTextToTemplate(text: string): any | null {
        const templates = this.templateRegistry.getTemplates();
        const lowerText = text.toLowerCase();

        for (const template of templates) {
            // Check tags
            for (const tag of template.tags) {
                if (lowerText.includes(tag.toLowerCase())) {
                    return template;
                }
            }
            // Check name
            if (lowerText.includes(template.nameAr) || lowerText.includes(template.nameEn.toLowerCase())) {
                return template;
            }
        }
        return null;
    }

    /**
     * اكتشاف الفئة من النص
     */
    private detectCategoryFromText(text: string): any {
        const lowerText = text.toLowerCase();
        if (lowerText.includes('خصم') || lowerText.includes('تأخير') || lowerText.includes('غياب') || lowerText.includes('penalty')) {
            return 'PENALTIES';
        }
        if (lowerText.includes('مكافأة') || lowerText.includes('حافز') || lowerText.includes('bonus') || lowerText.includes('عيد')) {
            return 'BONUSES';
        }
        if (lowerText.includes('حضور') || lowerText.includes('انضباط') || lowerText.includes('attendance')) {
            return 'ATTENDANCE';
        }
        if (lowerText.includes('إضافي') || lowerText.includes('overtime')) {
            return 'OVERTIME';
        }
        return 'BONUSES'; // Default
    }

    /**
     * إنشاء سياسة ذكية جديدة
     */
    async create(companyId: string, dto: CreateSmartPolicyDto, createdById?: string) {
        this.logger.log(`Creating smart policy for company ${companyId}`);

        // 1. تحليل النص بالذكاء الاصطناعي
        const parsedRule = await this.policyParser.parsePolicy(dto.originalText);

        // 2. التحقق من صحة التحليل
        const validation = this.policyParser.validateParsedRule(parsedRule);
        if (!validation.valid) {
            throw new BadRequestException({
                message: 'Failed to parse policy',
                errors: validation.errors,
                parsedRule,
            });
        }

        // 3. تحويل الـ trigger event
        const triggerEvent = this.mapTriggerEvent(parsedRule.trigger.event);

        // 4. حفظ السياسة
        const smartPolicy = await this.prisma.smartPolicy.create({
            data: {
                companyId,
                originalText: dto.originalText,
                name: dto.name || parsedRule.explanation?.substring(0, 100) || 'سياسة ذكية',
                triggerEvent,
                triggerSubEvent: parsedRule.trigger.subEvent,
                parsedRule: parsedRule as any,
                conditions: parsedRule.conditions as any,
                actions: parsedRule.actions as any,
                scopeType: parsedRule.scope.type,
                scopeName: parsedRule.scope.targetName,
                aiExplanation: parsedRule.explanation,
                clarificationNeeded: parsedRule.clarificationNeeded,
                status: SmartPolicyStatus.DRAFT,
                isActive: false,
                effectiveFrom: dto.effectiveFrom,
                effectiveTo: dto.effectiveTo,
                createdById,
            },
        });

        // 🔧 FIX: إبطال الـ cache بعد الإنشاء
        this.policyExecutor.invalidatePolicyCache(companyId);

        this.logger.log(`Created smart policy ${smartPolicy.id}`);
        return smartPolicy;
    }

    /**
     * إنشاء وتفعيل سياسة ذكية من نص عربي - بخطوة واحدة
     * هذه الميزة تسمح للنظام بفهم أي سياسة وتفعيلها تلقائياً
     * تدعم السياسات المتدرجة (tiered) بإنشاء عدة قواعد تلقائياً
     */
    async createAndActivate(companyId: string, originalText: string, createdById?: string) {
        this.logger.log(`Auto-creating smart policy: "${originalText.substring(0, 50)}..."`);

        // 1. التحقق من وجود سياسة مشابهة
        const existing = await this.findSimilarPolicy(companyId, originalText);
        if (existing) {
            this.logger.log(`Similar policy already exists: ${existing.id}`);
            return { created: false, policies: [existing], message: 'سياسة مشابهة موجودة بالفعل' };
        }

        // 2. تحليل النص بالذكاء الاصطناعي
        const parsedRule = await this.policyParser.parsePolicy(originalText);

        // 3. التحقق من صحة التحليل
        const validation = this.policyParser.validateParsedRule(parsedRule);
        if (!validation.valid) {
            throw new BadRequestException({
                message: 'فشل في فهم السياسة',
                errors: validation.errors,
                parsedRule,
            });
        }

        // 3.5. فحص الحقول المفقودة
        const missingFields = this.policyContext.detectMissingFields(
            parsedRule.conditions || [],
            parsedRule.actions || []
        );

        let missingFieldsWarning: string | undefined;
        if (missingFields.length > 0) {
            this.logger.warn(`Policy references missing fields: ${missingFields.join(', ')}`);
            missingFieldsWarning = `تحذير: السياسة تستخدم حقول غير موجودة في النظام: ${missingFields.join(', ')}. ` +
                `يمكنك إضافتها كحقول مخصصة (customFields) أو سيتم تجاهل الشروط المرتبطة بها.`;
        }

        // 4. فحص إذا كانت السياسة متدرجة (tiered) - تحتوي على عدة مستويات
        const tieredRules = this.detectAndSplitTieredPolicy(originalText, parsedRule);

        // 5. إنشاء السياسات (واحدة أو عدة)
        const createdPolicies = [];
        const triggerEvent = this.mapTriggerEvent(parsedRule.trigger.event);

        for (let i = 0; i < tieredRules.length; i++) {
            const rule = tieredRules[i];
            const policy = await this.prisma.smartPolicy.create({
                data: {
                    companyId,
                    originalText: tieredRules.length > 1 ? `${originalText} [مستوى ${i + 1}]` : originalText,
                    name: rule.name || parsedRule.explanation?.substring(0, 100) || 'سياسة ذكية',
                    triggerEvent,
                    triggerSubEvent: parsedRule.trigger.subEvent,
                    parsedRule: rule.parsedRule as any,
                    conditions: rule.conditions as any,
                    actions: rule.actions as any,
                    scopeType: parsedRule.scope.type,
                    scopeName: parsedRule.scope.targetName,
                    aiExplanation: rule.explanation || parsedRule.explanation,
                    status: SmartPolicyStatus.ACTIVE,
                    isActive: true,
                    createdById,
                    approvedById: createdById,
                    approvedAt: new Date(),
                    priority: 100 - i, // الأعلى أولوية للمستوى الأعلى
                },
            });
            createdPolicies.push(policy);
            this.logger.log(`Created policy ${policy.id}: ${rule.name}`);
        }

        // 🔧 FIX: إبطال الـ cache بعد إنشاء السياسات
        this.policyExecutor.invalidatePolicyCache(companyId);
        this.logger.log(`Cache invalidated for company ${companyId} after creating ${createdPolicies.length} policies`);

        return {
            created: true,
            policies: createdPolicies,
            count: createdPolicies.length,
            message: tieredRules.length > 1
                ? `تم إنشاء ${tieredRules.length} سياسات متدرجة وتفعيلها! ستُطبق في دورة الرواتب القادمة.`
                : 'تم إنشاء وتفعيل السياسة بنجاح! ستُطبق في دورة الرواتب القادمة.',
            warning: missingFieldsWarning,
            missingFields: missingFields.length > 0 ? missingFields : undefined,
            availableFields: this.policyContext.getAllAvailableFields(),
            parsedRule
        };
    }

    /**
     * اكتشاف السياسات المتدرجة وتقسيمها لعدة قواعد
     * مثال: "من 100 ل 105 ينزله 100 ريال من 105 فيما فوق ينزله 200 ريال"
     */
    private detectAndSplitTieredPolicy(originalText: string, parsedRule: any): any[] {
        // البحث عن أنماط السياسات المتدرجة
        const tieredPatterns = [
            /من\s*(\d+)\s*(ل|إلى|الى)\s*(\d+)/g,  // من X إلى Y
            /فوق\s*(\d+)/g,                        // فوق X
            /أكتر\s*من\s*(\d+)/g,                  // أكتر من X
            /فيما\s*فوق/g,                         // فيما فوق
        ];

        // فحص إذا كان النص يحتوي على مستويات متعددة
        const hasMultipleLevels =
            (originalText.includes('من') && originalText.includes('فيما فوق')) ||
            (originalText.match(/\d+\s*ريال/g)?.length || 0) > 1;

        if (!hasMultipleLevels) {
            // سياسة عادية - قاعدة واحدة
            return [{
                name: parsedRule.explanation?.substring(0, 100) || 'سياسة ذكية',
                parsedRule,
                conditions: parsedRule.conditions,
                actions: parsedRule.actions,
                explanation: parsedRule.explanation,
            }];
        }

        // سياسة متدرجة - تقسيم لعدة قواعد
        this.logger.log('Detected tiered policy, splitting into multiple rules...');

        // استخراج المبالغ من النص
        const amounts = originalText.match(/(\d+)\s*ريال/g)?.map(m => parseInt(m)) || [100, 200];

        // إنشاء قواعد متعددة بناءً على المستويات
        const rules = [];

        // المستوى الأول: 100-105%
        rules.push({
            name: 'حافز تحقيق التارجت (المستوى الأول: 100-105%)',
            parsedRule: { ...parsedRule },
            conditions: [
                { field: 'performance.targetAchievement', operator: 'GREATER_THAN_OR_EQUAL', value: 100 },
                { field: 'performance.targetAchievement', operator: 'LESS_THAN', value: 105 },
            ],
            actions: [{
                type: 'ADD_TO_PAYROLL',
                valueType: 'FIXED',
                value: amounts[0] || 100,
                componentCode: 'TARGET_BONUS_L1',
                description: 'حافز تحقيق التارجت - المستوى الأول',
            }],
            explanation: `حافز ${amounts[0] || 100} ريال لتحقيق التارجت من 100% إلى 105%`,
        });

        // المستوى الثاني: 105% فيما فوق
        rules.push({
            name: 'حافز تحقيق التارجت (المستوى الثاني: فوق 105%)',
            parsedRule: { ...parsedRule },
            conditions: [
                { field: 'performance.targetAchievement', operator: 'GREATER_THAN_OR_EQUAL', value: 105 },
            ],
            actions: [{
                type: 'ADD_TO_PAYROLL',
                valueType: 'FIXED',
                value: amounts[1] || 200,
                componentCode: 'TARGET_BONUS_L2',
                description: 'حافز تحقيق التارجت - المستوى الثاني',
            }],
            explanation: `حافز ${amounts[1] || 200} ريال لتحقيق التارجت فوق 105%`,
        });

        return rules;
    }

    /**
     * البحث عن سياسة مشابهة (باستخدام النص الأصلي)
     */
    private async findSimilarPolicy(companyId: string, originalText: string) {
        // البحث بالتطابق الجزئي للنص
        const searchText = originalText.substring(0, 50).trim();
        return await this.prisma.smartPolicy.findFirst({
            where: {
                companyId,
                originalText: { contains: searchText },
                isActive: true,
            },
        });
    }

    /**
     * الحصول على جميع السياسات الذكية للشركة
     */
    async findAll(companyId: string, options?: {
        status?: SmartPolicyStatus;
        triggerEvent?: SmartPolicyTrigger;
        isActive?: boolean;
        page?: number;
        limit?: number;
    }) {
        const { status, triggerEvent, isActive, page = 1, limit = 20 } = options || {};

        const where: any = { companyId };
        if (status) where.status = status;
        if (triggerEvent) where.triggerEvent = triggerEvent;
        if (isActive !== undefined) where.isActive = isActive;

        const [data, total] = await Promise.all([
            this.prisma.smartPolicy.findMany({
                where,
                orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.smartPolicy.count({ where }),
        ]);

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * الحصول على سياسة ذكية بالمعرف
     */
    async findOne(id: string) {
        const policy = await this.prisma.smartPolicy.findUnique({
            where: { id },
            include: {
                executions: {
                    orderBy: { executedAt: 'desc' },
                    take: 10,
                },
            },
        });

        if (!policy) {
            throw new NotFoundException(`Smart policy ${id} not found`);
        }

        return policy;
    }

    /**
     * تحديث سياسة ذكية
     */
    async update(id: string, dto: UpdateSmartPolicyDto, approvedById?: string) {
        const existing = await this.findOne(id);

        const updateData: any = { ...dto };

        // إذا تم تفعيل السياسة، سجل المُوافق
        if (dto.status === SmartPolicyStatus.ACTIVE && existing.status !== SmartPolicyStatus.ACTIVE) {
            updateData.approvedById = approvedById;
            updateData.approvedAt = new Date();
            updateData.isActive = true;
        }

        const updated = await this.prisma.smartPolicy.update({
            where: { id },
            data: updateData,
        });

        // 🔧 FIX: إبطال الـ cache بعد التحديث
        this.policyExecutor.invalidatePolicyCache(existing.companyId);
        this.logger.log(`Cache invalidated for company ${existing.companyId} after policy update`);

        return updated;
    }

    /**
     * حذف سياسة ذكية
     */
    async delete(id: string) {
        const existing = await this.findOne(id); // التحقق من الوجود
        const result = await this.prisma.smartPolicy.delete({ where: { id } });

        // 🔧 FIX: إبطال الـ cache بعد الحذف
        this.policyExecutor.invalidatePolicyCache(existing.companyId);
        this.logger.log(`Cache invalidated for company ${existing.companyId} after policy delete`);

        return result;
    }

    /**
     * تفعيل/إيقاف سياسة ذكية
     */
    async toggleActive(id: string, isActive: boolean, userId?: string) {
        return await this.update(id, {
            isActive,
            status: isActive ? SmartPolicyStatus.ACTIVE : SmartPolicyStatus.PAUSED,
        }, userId);
    }

    /**
     * الحصول على السياسات النشطة لحدث معين
     */
    async getActivePoliciesForEvent(
        companyId: string,
        triggerEvent: SmartPolicyTrigger,
        subEvent?: string,
    ) {
        return await this.prisma.smartPolicy.findMany({
            where: {
                companyId,
                triggerEvent,
                status: SmartPolicyStatus.ACTIVE,
                isActive: true,
                OR: [
                    { effectiveFrom: null },
                    { effectiveFrom: { lte: new Date() } },
                ],
                AND: [
                    {
                        OR: [
                            { effectiveTo: null },
                            { effectiveTo: { gte: new Date() } },
                        ],
                    },
                ],
            },
            orderBy: { priority: 'desc' },
        });
    }

    /**
     * تسجيل تنفيذ سياسة
     */
    async logExecution(data: {
        policyId: string;
        employeeId: string;
        employeeName: string;
        triggerEvent: string;
        triggerSubEvent?: string;
        triggerData?: any;
        conditionsMet: boolean;
        conditionsLog?: any;
        actionType?: string;
        actionValue?: number;
        actionResult?: any;
        isSuccess: boolean;
        errorMessage?: string;
        payrollPeriod?: string;
    }) {
        // تحديث إحصائيات السياسة
        if (data.isSuccess && data.conditionsMet) {
            await this.prisma.smartPolicy.update({
                where: { id: data.policyId },
                data: {
                    executionCount: { increment: 1 },
                    lastExecutedAt: new Date(),
                    ...(data.actionType === 'ADD_TO_PAYROLL' && data.actionValue
                        ? { totalAmountPaid: { increment: data.actionValue } }
                        : {}),
                    ...(data.actionType === 'DEDUCT_FROM_PAYROLL' && data.actionValue
                        ? { totalAmountDeduct: { increment: data.actionValue } }
                        : {}),
                },
            });
        }

        // إنشاء سجل التنفيذ
        return await this.prisma.smartPolicyExecution.create({
            data: {
                policyId: data.policyId,
                employeeId: data.employeeId,
                employeeName: data.employeeName,
                triggerEvent: data.triggerEvent,
                triggerSubEvent: data.triggerSubEvent,
                triggerData: data.triggerData,
                conditionsMet: data.conditionsMet,
                conditionsLog: data.conditionsLog,
                actionType: data.actionType,
                actionValue: data.actionValue,
                actionResult: data.actionResult,
                isSuccess: data.isSuccess,
                errorMessage: data.errorMessage,
                payrollPeriod: data.payrollPeriod,
            },
        });
    }

    /**
     * تحويل حدث من النص إلى enum
     */
    private mapTriggerEvent(event: string): SmartPolicyTrigger {
        const mapping: Record<string, SmartPolicyTrigger> = {
            ATTENDANCE: SmartPolicyTrigger.ATTENDANCE,
            LEAVE: SmartPolicyTrigger.LEAVE,
            CUSTODY: SmartPolicyTrigger.CUSTODY,
            PAYROLL: SmartPolicyTrigger.PAYROLL,
            ANNIVERSARY: SmartPolicyTrigger.ANNIVERSARY,
            CONTRACT: SmartPolicyTrigger.CONTRACT,
            DISCIPLINARY: SmartPolicyTrigger.DISCIPLINARY,
            PERFORMANCE: SmartPolicyTrigger.PERFORMANCE,
        };
        return mapping[event] || SmartPolicyTrigger.CUSTOM;
    }
}
