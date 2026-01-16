import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditAction } from '@prisma/client';

/**
 * أنواع الأحداث القابلة للتسجيل (للاستخدام الداخلي فقط)
 */
export enum PolicyAuditEventType {
    POLICY_CREATED = 'POLICY_CREATED',
    POLICY_UPDATED = 'POLICY_UPDATED',
    POLICY_DELETED = 'POLICY_DELETED',
    POLICY_ACTIVATED = 'POLICY_ACTIVATED',
    POLICY_DEACTIVATED = 'POLICY_DEACTIVATED',
    APPROVAL_SUBMITTED = 'APPROVAL_SUBMITTED',
    APPROVAL_APPROVED = 'APPROVAL_APPROVED',
    APPROVAL_REJECTED = 'APPROVAL_REJECTED',
    SIMULATION_RUN = 'SIMULATION_RUN',
    VERSION_CREATED = 'VERSION_CREATED',
    CONFLICT_DETECTED = 'CONFLICT_DETECTED',
    EXECUTION_COMPLETED = 'EXECUTION_COMPLETED',
}

/**
 * تحويل نوع الحدث لـ AuditAction
 */
function mapEventToAction(eventType: PolicyAuditEventType): AuditAction {
    switch (eventType) {
        case PolicyAuditEventType.POLICY_CREATED:
            return AuditAction.CREATE;
        case PolicyAuditEventType.POLICY_UPDATED:
        case PolicyAuditEventType.POLICY_ACTIVATED:
        case PolicyAuditEventType.POLICY_DEACTIVATED:
        case PolicyAuditEventType.VERSION_CREATED:
            return AuditAction.UPDATE;
        case PolicyAuditEventType.POLICY_DELETED:
            return AuditAction.DELETE;
        default:
            return AuditAction.UPDATE;
    }
}

/**
 * Policy Audit Logging Service
 * يسجل جميع الأحداث المتعلقة بالسياسات
 */
@Injectable()
export class PolicyAuditService {
    private readonly logger = new Logger(PolicyAuditService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * تسجيل حدث في سجل التدقيق
     */
    async log(
        eventType: PolicyAuditEventType,
        policyId: string,
        userId: string,
        details: Record<string, any> = {},
        companyId?: string,
    ): Promise<void> {
        try {
            // جلب اسم السياسة و companyId
            const policy = await this.prisma.smartPolicy.findUnique({
                where: { id: policyId },
                select: { name: true, originalText: true, companyId: true },
            });

            const policyName = policy?.name || policy?.originalText?.slice(0, 50) || 'سياسة';
            const actualCompanyId = companyId || policy?.companyId;

            // تحويل نوع الحدث لـ AuditAction
            const action = mapEventToAction(eventType);

            await this.prisma.auditLog.create({
                data: {
                    companyId: actualCompanyId,
                    userId,
                    action,
                    entity: 'SmartPolicy',
                    entityId: policyId,
                    description: `${eventType}: ${policyName}`,
                    newValue: {
                        eventType,
                        policyName,
                        ...details,
                    } as any,
                },
            });

            this.logger.log(`[AUDIT] ${eventType} | Policy: ${policyName} | User: ${userId}`);
        } catch (error) {
            this.logger.error(`Failed to log audit event: ${error}`);
        }
    }

    /**
     * تسجيل إنشاء سياسة
     */
    async logPolicyCreated(
        policyId: string,
        userId: string,
        policyData: { name?: string; triggerEvent: string; originalText: string },
        companyId?: string,
    ): Promise<void> {
        await this.log(PolicyAuditEventType.POLICY_CREATED, policyId, userId, {
            name: policyData.name,
            triggerEvent: policyData.triggerEvent,
            originalText: policyData.originalText.slice(0, 200),
        }, companyId);
    }

    /**
     * تسجيل تحديث سياسة
     */
    async logPolicyUpdated(
        policyId: string,
        userId: string,
        changes: Record<string, { old: any; new: any }>,
    ): Promise<void> {
        await this.log(PolicyAuditEventType.POLICY_UPDATED, policyId, userId, {
            changes,
            changedFields: Object.keys(changes),
        });
    }

    /**
     * تسجيل حذف سياسة
     */
    async logPolicyDeleted(
        policyId: string,
        userId: string,
        policySnapshot: { name?: string; originalText: string },
    ): Promise<void> {
        await this.log(PolicyAuditEventType.POLICY_DELETED, policyId, userId, {
            deletedPolicy: policySnapshot,
        });
    }

    /**
     * تسجيل تفعيل سياسة
     */
    async logPolicyActivated(policyId: string, userId: string): Promise<void> {
        await this.log(PolicyAuditEventType.POLICY_ACTIVATED, policyId, userId);
    }

    /**
     * تسجيل إيقاف سياسة
     */
    async logPolicyDeactivated(policyId: string, userId: string): Promise<void> {
        await this.log(PolicyAuditEventType.POLICY_DEACTIVATED, policyId, userId);
    }

    /**
     * تسجيل إرسال للموافقة
     */
    async logApprovalSubmitted(policyId: string, userId: string, notes?: string): Promise<void> {
        await this.log(PolicyAuditEventType.APPROVAL_SUBMITTED, policyId, userId, { notes });
    }

    /**
     * تسجيل الموافقة
     */
    async logApprovalApproved(
        policyId: string,
        userId: string,
        notes?: string,
        activatedNow?: boolean,
    ): Promise<void> {
        await this.log(PolicyAuditEventType.APPROVAL_APPROVED, policyId, userId, { notes, activatedNow });
    }

    /**
     * تسجيل الرفض
     */
    async logApprovalRejected(policyId: string, userId: string, reason: string): Promise<void> {
        await this.log(PolicyAuditEventType.APPROVAL_REJECTED, policyId, userId, { reason });
    }

    /**
     * تسجيل تنفيذ السياسة
     */
    async logExecutionCompleted(
        policyId: string,
        executionDetails: {
            employeesAffected: number;
            totalAdditions: number;
            totalDeductions: number;
        },
    ): Promise<void> {
        await this.log(PolicyAuditEventType.EXECUTION_COMPLETED, policyId, 'SYSTEM', executionDetails);
    }

    /**
     * تسجيل محاكاة
     */
    async logSimulationRun(
        policyId: string,
        userId: string,
        simulationSummary: { period: string; employeesAffected: number; netImpact: number },
    ): Promise<void> {
        await this.log(PolicyAuditEventType.SIMULATION_RUN, policyId, userId, simulationSummary);
    }

    /**
     * جلب سجل التدقيق لسياسة معينة
     */
    async getAuditLogForPolicy(
        policyId: string,
        options: { page?: number; limit?: number } = {},
    ): Promise<{
        data: any[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
    }> {
        const page = options.page || 1;
        const limit = Math.min(options.limit || 20, 100);
        const skip = (page - 1) * limit;

        const where = {
            entity: 'SmartPolicy',
            entityId: policyId,
        };

        const [logs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: { user: { select: { id: true, firstName: true, lastName: true } } },
            }),
            this.prisma.auditLog.count({ where }),
        ]);

        return {
            data: logs.map(log => ({
                id: log.id,
                action: log.action,
                description: log.description,
                userId: log.userId,
                userName: log.user ? `${log.user.firstName} ${log.user.lastName}` : 'النظام',
                details: log.newValue,
                createdAt: log.createdAt,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * جلب سجل التدقيق للشركة
     */
    async getCompanyAuditLog(
        companyId: string,
        options: { page?: number; limit?: number } = {},
    ): Promise<{
        data: any[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
    }> {
        const page = options.page || 1;
        const limit = Math.min(options.limit || 50, 200);
        const skip = (page - 1) * limit;

        const where = {
            companyId,
            entity: 'SmartPolicy',
        };

        const [logs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: { user: { select: { id: true, firstName: true, lastName: true } } },
            }),
            this.prisma.auditLog.count({ where }),
        ]);

        return {
            data: logs.map(log => ({
                id: log.id,
                action: log.action,
                policyId: log.entityId,
                description: log.description,
                userId: log.userId,
                userName: log.user ? `${log.user.firstName} ${log.user.lastName}` : 'النظام',
                details: log.newValue,
                createdAt: log.createdAt,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
}
