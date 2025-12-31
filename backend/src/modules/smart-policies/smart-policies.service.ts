import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PolicyParserService, ParsedPolicyRule } from '../ai/services/policy-parser.service';
import { SmartPolicyTrigger, SmartPolicyStatus } from '@prisma/client';

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
    ) { }

    /**
     * تحليل نص السياسة بالذكاء الاصطناعي (بدون حفظ)
     */
    async analyzePolicy(originalText: string): Promise<ParsedPolicyRule> {
        const safeText = originalText || '';
        this.logger.log(`Analyzing policy: "${safeText.substring(0, 50)}..."`);
        return await this.policyParser.parsePolicy(safeText);
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

        this.logger.log(`Created smart policy ${smartPolicy.id}`);
        return smartPolicy;
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

        return await this.prisma.smartPolicy.update({
            where: { id },
            data: updateData,
        });
    }

    /**
     * حذف سياسة ذكية
     */
    async delete(id: string) {
        await this.findOne(id); // التحقق من الوجود
        return await this.prisma.smartPolicy.delete({ where: { id } });
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
