import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationType } from '@prisma/client';

/**
 * Policy Notification Service
 * يُرسل إشعارات داخلية للمستخدمين
 */
@Injectable()
export class PolicyNotificationService {
    private readonly logger = new Logger(PolicyNotificationService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * إرسال إشعار طلب موافقة
     */
    async notifyApprovalRequired(
        policyId: string,
        policyName: string,
        submitterName: string,
        companyId: string,
    ): Promise<void> {
        try {
            // جلب المستخدمين المطلوب إخطارهم (HR/Admin)
            const approvers = await this.prisma.user.findMany({
                where: {
                    companyId,
                    status: 'ACTIVE',
                    role: { in: ['HR', 'ADMIN', 'MANAGER'] },
                },
                select: { id: true, firstName: true, lastName: true, email: true },
            });

            // إنشاء إشعارات داخلية
            for (const approver of approvers) {
                await this.createNotification({
                    userId: approver.id,
                    companyId,
                    title: '🔔 مطلوب موافقتك على سياسة جديدة',
                    body: `قام ${submitterName} بإرسال سياسة "${policyName}" للموافقة`,
                    entityType: 'SmartPolicy',
                    entityId: policyId,
                    metadata: { policyId, policyName, action: 'APPROVAL_REQUIRED' },
                });
            }

            this.logger.log(`Notified ${approvers.length} approvers for policy ${policyId}`);
        } catch (error) {
            this.logger.error(`Failed to notify approvers: ${error}`);
        }
    }

    /**
     * إرسال إشعار الموافقة/الرفض للمُرسل
     */
    async notifyApprovalResult(
        policyId: string,
        policyName: string,
        submitterId: string,
        companyId: string,
        approved: boolean,
        approverName: string,
        notes?: string,
    ): Promise<void> {
        try {
            const title = approved
                ? `✅ تمت الموافقة على سياستك: ${policyName}`
                : `❌ تم رفض سياستك: ${policyName}`;

            const body = approved
                ? `قام ${approverName} بالموافقة على سياستك${notes ? ` - "${notes}"` : ''}`
                : `قام ${approverName} برفض سياستك${notes ? ` - "${notes}"` : ''}`;

            await this.createNotification({
                userId: submitterId,
                companyId,
                title,
                body,
                entityType: 'SmartPolicy',
                entityId: policyId,
                metadata: { policyId, approved, approverName, action: approved ? 'APPROVED' : 'REJECTED' },
            });
        } catch (error) {
            this.logger.error(`Failed to notify approval result: ${error}`);
        }
    }

    /**
     * إرسال إشعار تنفيذ السياسة
     */
    async notifyExecutionCompleted(
        policyId: string,
        policyName: string,
        createdById: string | null,
        companyId: string,
        summary: {
            affectedEmployees: number;
            totalAdditions: number;
            totalDeductions: number;
        },
    ): Promise<void> {
        if (!createdById) return;

        try {
            await this.createNotification({
                userId: createdById,
                companyId,
                title: `⚡ تم تنفيذ سياسة: ${policyName}`,
                body: `تأثر ${summary.affectedEmployees} موظف. إضافات: ${summary.totalAdditions} ر.س، خصومات: ${summary.totalDeductions} ر.س`,
                entityType: 'SmartPolicy',
                entityId: policyId,
                metadata: { policyId, ...summary, action: 'EXECUTION_COMPLETED' },
            });
        } catch (error) {
            this.logger.error(`Failed to notify execution: ${error}`);
        }
    }

    /**
     * إرسال إشعار اكتشاف تعارض
     */
    async notifyConflictDetected(
        policyId: string,
        policyName: string,
        createdById: string | null,
        companyId: string,
        conflictingPolicies: string[],
        severity: string,
    ): Promise<void> {
        if (!createdById) return;

        try {
            await this.createNotification({
                userId: createdById,
                companyId,
                title: `⚠️ تعارض مكتشف في سياسة: ${policyName}`,
                body: `تتعارض مع ${conflictingPolicies.length} سياسة أخرى (${severity})`,
                entityType: 'SmartPolicy',
                entityId: policyId,
                metadata: { policyId, conflictingPolicies, severity, action: 'CONFLICT_DETECTED' },
            });
        } catch (error) {
            this.logger.error(`Failed to notify conflict: ${error}`);
        }
    }

    /**
     * إنشاء إشعار داخلي
     */
    private async createNotification(data: {
        userId: string;
        companyId: string;
        title: string;
        body: string;
        entityType?: string;
        entityId?: string;
        metadata?: Record<string, any>;
    }): Promise<void> {
        try {
            await this.prisma.notification.create({
                data: {
                    userId: data.userId,
                    companyId: data.companyId,
                    type: NotificationType.GENERAL,
                    title: data.title,
                    body: data.body,
                    entityType: data.entityType,
                    entityId: data.entityId,
                    data: data.metadata as any,
                    isRead: false,
                },
            });
        } catch (error) {
            this.logger.error(`Failed to create notification: ${error}`);
        }
    }

    /**
     * جلب إشعارات السياسات للمستخدم
     */
    async getPolicyNotifications(
        userId: string,
        options: { page?: number; limit?: number; unreadOnly?: boolean } = {},
    ): Promise<{
        data: any[];
        pagination: { page: number; limit: number; total: number };
    }> {
        const page = options.page || 1;
        const limit = Math.min(options.limit || 20, 100);
        const skip = (page - 1) * limit;

        const where: any = {
            userId,
            entityType: 'SmartPolicy',
        };

        if (options.unreadOnly) {
            where.isRead = false;
        }

        const [notifications, total] = await Promise.all([
            this.prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.notification.count({ where }),
        ]);

        return {
            data: notifications.map(n => ({
                id: n.id,
                title: n.title,
                body: n.body,
                isRead: n.isRead,
                policyId: n.entityId,
                metadata: n.data,
                createdAt: n.createdAt,
            })),
            pagination: { page, limit, total },
        };
    }
}
