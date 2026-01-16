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
var PolicyNotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyNotificationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
let PolicyNotificationService = PolicyNotificationService_1 = class PolicyNotificationService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(PolicyNotificationService_1.name);
    }
    async notifyApprovalRequired(policyId, policyName, submitterName, companyId) {
        try {
            const approvers = await this.prisma.user.findMany({
                where: {
                    companyId,
                    status: 'ACTIVE',
                    role: { in: ['HR', 'ADMIN', 'MANAGER'] },
                },
                select: { id: true, firstName: true, lastName: true, email: true },
            });
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
        }
        catch (error) {
            this.logger.error(`Failed to notify approvers: ${error}`);
        }
    }
    async notifyApprovalResult(policyId, policyName, submitterId, companyId, approved, approverName, notes) {
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
        }
        catch (error) {
            this.logger.error(`Failed to notify approval result: ${error}`);
        }
    }
    async notifyExecutionCompleted(policyId, policyName, createdById, companyId, summary) {
        if (!createdById)
            return;
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
        }
        catch (error) {
            this.logger.error(`Failed to notify execution: ${error}`);
        }
    }
    async notifyConflictDetected(policyId, policyName, createdById, companyId, conflictingPolicies, severity) {
        if (!createdById)
            return;
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
        }
        catch (error) {
            this.logger.error(`Failed to notify conflict: ${error}`);
        }
    }
    async createNotification(data) {
        try {
            await this.prisma.notification.create({
                data: {
                    userId: data.userId,
                    companyId: data.companyId,
                    type: client_1.NotificationType.GENERAL,
                    title: data.title,
                    body: data.body,
                    entityType: data.entityType,
                    entityId: data.entityId,
                    data: data.metadata,
                    isRead: false,
                },
            });
        }
        catch (error) {
            this.logger.error(`Failed to create notification: ${error}`);
        }
    }
    async getPolicyNotifications(userId, options = {}) {
        const page = options.page || 1;
        const limit = Math.min(options.limit || 20, 100);
        const skip = (page - 1) * limit;
        const where = {
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
};
exports.PolicyNotificationService = PolicyNotificationService;
exports.PolicyNotificationService = PolicyNotificationService = PolicyNotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PolicyNotificationService);
//# sourceMappingURL=policy-notification.service.js.map