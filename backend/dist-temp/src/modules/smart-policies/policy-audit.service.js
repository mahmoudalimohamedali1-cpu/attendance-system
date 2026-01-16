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
var PolicyAuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyAuditService = exports.PolicyAuditEventType = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
var PolicyAuditEventType;
(function (PolicyAuditEventType) {
    PolicyAuditEventType["POLICY_CREATED"] = "POLICY_CREATED";
    PolicyAuditEventType["POLICY_UPDATED"] = "POLICY_UPDATED";
    PolicyAuditEventType["POLICY_DELETED"] = "POLICY_DELETED";
    PolicyAuditEventType["POLICY_ACTIVATED"] = "POLICY_ACTIVATED";
    PolicyAuditEventType["POLICY_DEACTIVATED"] = "POLICY_DEACTIVATED";
    PolicyAuditEventType["APPROVAL_SUBMITTED"] = "APPROVAL_SUBMITTED";
    PolicyAuditEventType["APPROVAL_APPROVED"] = "APPROVAL_APPROVED";
    PolicyAuditEventType["APPROVAL_REJECTED"] = "APPROVAL_REJECTED";
    PolicyAuditEventType["SIMULATION_RUN"] = "SIMULATION_RUN";
    PolicyAuditEventType["VERSION_CREATED"] = "VERSION_CREATED";
    PolicyAuditEventType["CONFLICT_DETECTED"] = "CONFLICT_DETECTED";
    PolicyAuditEventType["EXECUTION_COMPLETED"] = "EXECUTION_COMPLETED";
})(PolicyAuditEventType || (exports.PolicyAuditEventType = PolicyAuditEventType = {}));
function mapEventToAction(eventType) {
    switch (eventType) {
        case PolicyAuditEventType.POLICY_CREATED:
            return client_1.AuditAction.CREATE;
        case PolicyAuditEventType.POLICY_UPDATED:
        case PolicyAuditEventType.POLICY_ACTIVATED:
        case PolicyAuditEventType.POLICY_DEACTIVATED:
        case PolicyAuditEventType.VERSION_CREATED:
            return client_1.AuditAction.UPDATE;
        case PolicyAuditEventType.POLICY_DELETED:
            return client_1.AuditAction.DELETE;
        default:
            return client_1.AuditAction.UPDATE;
    }
}
let PolicyAuditService = PolicyAuditService_1 = class PolicyAuditService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(PolicyAuditService_1.name);
    }
    async log(eventType, policyId, userId, details = {}, companyId) {
        try {
            const policy = await this.prisma.smartPolicy.findUnique({
                where: { id: policyId },
                select: { name: true, originalText: true, companyId: true },
            });
            const policyName = policy?.name || policy?.originalText?.slice(0, 50) || 'سياسة';
            const actualCompanyId = companyId || policy?.companyId;
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
                    },
                },
            });
            this.logger.log(`[AUDIT] ${eventType} | Policy: ${policyName} | User: ${userId}`);
        }
        catch (error) {
            this.logger.error(`Failed to log audit event: ${error}`);
        }
    }
    async logPolicyCreated(policyId, userId, policyData, companyId) {
        await this.log(PolicyAuditEventType.POLICY_CREATED, policyId, userId, {
            name: policyData.name,
            triggerEvent: policyData.triggerEvent,
            originalText: policyData.originalText.slice(0, 200),
        }, companyId);
    }
    async logPolicyUpdated(policyId, userId, changes) {
        await this.log(PolicyAuditEventType.POLICY_UPDATED, policyId, userId, {
            changes,
            changedFields: Object.keys(changes),
        });
    }
    async logPolicyDeleted(policyId, userId, policySnapshot) {
        await this.log(PolicyAuditEventType.POLICY_DELETED, policyId, userId, {
            deletedPolicy: policySnapshot,
        });
    }
    async logPolicyActivated(policyId, userId) {
        await this.log(PolicyAuditEventType.POLICY_ACTIVATED, policyId, userId);
    }
    async logPolicyDeactivated(policyId, userId) {
        await this.log(PolicyAuditEventType.POLICY_DEACTIVATED, policyId, userId);
    }
    async logApprovalSubmitted(policyId, userId, notes) {
        await this.log(PolicyAuditEventType.APPROVAL_SUBMITTED, policyId, userId, { notes });
    }
    async logApprovalApproved(policyId, userId, notes, activatedNow) {
        await this.log(PolicyAuditEventType.APPROVAL_APPROVED, policyId, userId, { notes, activatedNow });
    }
    async logApprovalRejected(policyId, userId, reason) {
        await this.log(PolicyAuditEventType.APPROVAL_REJECTED, policyId, userId, { reason });
    }
    async logExecutionCompleted(policyId, executionDetails) {
        await this.log(PolicyAuditEventType.EXECUTION_COMPLETED, policyId, 'SYSTEM', executionDetails);
    }
    async logSimulationRun(policyId, userId, simulationSummary) {
        await this.log(PolicyAuditEventType.SIMULATION_RUN, policyId, userId, simulationSummary);
    }
    async getAuditLogForPolicy(policyId, options = {}) {
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
    async getCompanyAuditLog(companyId, options = {}) {
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
};
exports.PolicyAuditService = PolicyAuditService;
exports.PolicyAuditService = PolicyAuditService = PolicyAuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PolicyAuditService);
//# sourceMappingURL=policy-audit.service.js.map