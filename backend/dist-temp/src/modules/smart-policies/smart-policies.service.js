"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SmartPoliciesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartPoliciesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const policy_parser_service_1 = require("../ai/services/policy-parser.service");
const policy_context_service_1 = require("./policy-context.service");
const client_1 = require("@prisma/client");
let SmartPoliciesService = SmartPoliciesService_1 = class SmartPoliciesService {
    constructor(prisma, policyParser, policyContext) {
        this.prisma = prisma;
        this.policyParser = policyParser;
        this.policyContext = policyContext;
        this.logger = new common_1.Logger(SmartPoliciesService_1.name);
    }
    async analyzePolicy(originalText) {
        const safeText = originalText || '';
        this.logger.log(`Analyzing policy: "${safeText.substring(0, 50)}..."`);
        return await this.policyParser.parsePolicy(safeText);
    }
    async create(companyId, dto, createdById) {
        this.logger.log(`Creating smart policy for company ${companyId}`);
        const parsedRule = await this.policyParser.parsePolicy(dto.originalText);
        const validation = this.policyParser.validateParsedRule(parsedRule);
        if (!validation.valid) {
            throw new common_1.BadRequestException({
                message: 'Failed to parse policy',
                errors: validation.errors,
                parsedRule,
            });
        }
        const triggerEvent = this.mapTriggerEvent(parsedRule.trigger.event);
        const smartPolicy = await this.prisma.smartPolicy.create({
            data: {
                companyId,
                originalText: dto.originalText,
                name: dto.name || parsedRule.explanation?.substring(0, 100) || 'سياسة ذكية',
                triggerEvent,
                triggerSubEvent: parsedRule.trigger.subEvent,
                parsedRule: parsedRule,
                conditions: parsedRule.conditions,
                actions: parsedRule.actions,
                scopeType: parsedRule.scope.type,
                scopeName: parsedRule.scope.targetName,
                aiExplanation: parsedRule.explanation,
                clarificationNeeded: parsedRule.clarificationNeeded,
                status: client_1.SmartPolicyStatus.DRAFT,
                isActive: false,
                effectiveFrom: dto.effectiveFrom,
                effectiveTo: dto.effectiveTo,
                createdById,
            },
        });
        this.logger.log(`Created smart policy ${smartPolicy.id}`);
        return smartPolicy;
    }
    async createAndActivate(companyId, originalText, createdById) {
        this.logger.log(`Auto-creating smart policy: "${originalText.substring(0, 50)}..."`);
        const existing = await this.findSimilarPolicy(companyId, originalText);
        if (existing) {
            this.logger.log(`Similar policy already exists: ${existing.id}`);
            return { created: false, policies: [existing], message: 'سياسة مشابهة موجودة بالفعل' };
        }
        const parsedRule = await this.policyParser.parsePolicy(originalText);
        const validation = this.policyParser.validateParsedRule(parsedRule);
        if (!validation.valid) {
            throw new common_1.BadRequestException({
                message: 'فشل في فهم السياسة',
                errors: validation.errors,
                parsedRule,
            });
        }
        const missingFields = this.policyContext.detectMissingFields(parsedRule.conditions || [], parsedRule.actions || []);
        let missingFieldsWarning;
        if (missingFields.length > 0) {
            this.logger.warn(`Policy references missing fields: ${missingFields.join(', ')}`);
            missingFieldsWarning = `تحذير: السياسة تستخدم حقول غير موجودة في النظام: ${missingFields.join(', ')}. ` +
                `يمكنك إضافتها كحقول مخصصة (customFields) أو سيتم تجاهل الشروط المرتبطة بها.`;
        }
        const tieredRules = this.detectAndSplitTieredPolicy(originalText, parsedRule);
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
                    parsedRule: rule.parsedRule,
                    conditions: rule.conditions,
                    actions: rule.actions,
                    scopeType: parsedRule.scope.type,
                    scopeName: parsedRule.scope.targetName,
                    aiExplanation: rule.explanation || parsedRule.explanation,
                    status: client_1.SmartPolicyStatus.ACTIVE,
                    isActive: true,
                    createdById,
                    approvedById: createdById,
                    approvedAt: new Date(),
                    priority: 100 - i,
                },
            });
            createdPolicies.push(policy);
            this.logger.log(`Created policy ${policy.id}: ${rule.name}`);
        }
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
    detectAndSplitTieredPolicy(originalText, parsedRule) {
        const tieredPatterns = [
            /من\s*(\d+)\s*(ل|إلى|الى)\s*(\d+)/g,
            /فوق\s*(\d+)/g,
            /أكتر\s*من\s*(\d+)/g,
            /فيما\s*فوق/g,
        ];
        const hasMultipleLevels = (originalText.includes('من') && originalText.includes('فيما فوق')) ||
            (originalText.match(/\d+\s*ريال/g)?.length || 0) > 1;
        if (!hasMultipleLevels) {
            return [{
                    name: parsedRule.explanation?.substring(0, 100) || 'سياسة ذكية',
                    parsedRule,
                    conditions: parsedRule.conditions,
                    actions: parsedRule.actions,
                    explanation: parsedRule.explanation,
                }];
        }
        this.logger.log('Detected tiered policy, splitting into multiple rules...');
        const amounts = originalText.match(/(\d+)\s*ريال/g)?.map(m => parseInt(m)) || [100, 200];
        const rules = [];
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
    async findSimilarPolicy(companyId, originalText) {
        const searchText = originalText.substring(0, 50).trim();
        return await this.prisma.smartPolicy.findFirst({
            where: {
                companyId,
                originalText: { contains: searchText },
                isActive: true,
            },
        });
    }
    async findAll(companyId, options) {
        const { status, triggerEvent, isActive, page = 1, limit = 20 } = options || {};
        const where = { companyId };
        if (status)
            where.status = status;
        if (triggerEvent)
            where.triggerEvent = triggerEvent;
        if (isActive !== undefined)
            where.isActive = isActive;
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
    async findOne(id) {
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
            throw new common_1.NotFoundException(`Smart policy ${id} not found`);
        }
        return policy;
    }
    async update(id, dto, approvedById) {
        const existing = await this.findOne(id);
        const updateData = { ...dto };
        if (dto.status === client_1.SmartPolicyStatus.ACTIVE && existing.status !== client_1.SmartPolicyStatus.ACTIVE) {
            updateData.approvedById = approvedById;
            updateData.approvedAt = new Date();
            updateData.isActive = true;
        }
        return await this.prisma.smartPolicy.update({
            where: { id },
            data: updateData,
        });
    }
    async delete(id) {
        await this.findOne(id);
        return await this.prisma.smartPolicy.delete({ where: { id } });
    }
    async toggleActive(id, isActive, userId) {
        return await this.update(id, {
            isActive,
            status: isActive ? client_1.SmartPolicyStatus.ACTIVE : client_1.SmartPolicyStatus.PAUSED,
        }, userId);
    }
    async getActivePoliciesForEvent(companyId, triggerEvent, subEvent) {
        return await this.prisma.smartPolicy.findMany({
            where: {
                companyId,
                triggerEvent,
                status: client_1.SmartPolicyStatus.ACTIVE,
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
    async logExecution(data) {
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
    mapTriggerEvent(event) {
        const mapping = {
            ATTENDANCE: client_1.SmartPolicyTrigger.ATTENDANCE,
            LEAVE: client_1.SmartPolicyTrigger.LEAVE,
            CUSTODY: client_1.SmartPolicyTrigger.CUSTODY,
            PAYROLL: client_1.SmartPolicyTrigger.PAYROLL,
            ANNIVERSARY: client_1.SmartPolicyTrigger.ANNIVERSARY,
            CONTRACT: client_1.SmartPolicyTrigger.CONTRACT,
            DISCIPLINARY: client_1.SmartPolicyTrigger.DISCIPLINARY,
            PERFORMANCE: client_1.SmartPolicyTrigger.PERFORMANCE,
        };
        return mapping[event] || client_1.SmartPolicyTrigger.CUSTOM;
    }
};
exports.SmartPoliciesService = SmartPoliciesService;
exports.SmartPoliciesService = SmartPoliciesService = SmartPoliciesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        policy_parser_service_1.PolicyParserService,
        policy_context_service_1.PolicyContextService])
], SmartPoliciesService);
//# sourceMappingURL=smart-policies.service.js.map