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
var PolicyApprovalService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyApprovalService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
const policy_versioning_service_1 = require("./policy-versioning.service");
let PolicyApprovalService = PolicyApprovalService_1 = class PolicyApprovalService {
    constructor(prisma, versioningService) {
        this.prisma = prisma;
        this.versioningService = versioningService;
        this.logger = new common_1.Logger(PolicyApprovalService_1.name);
    }
    async submitForApproval(policyId, submitterId, submitterName, notes) {
        const policy = await this.prisma.smartPolicy.findUnique({
            where: { id: policyId },
        });
        if (!policy) {
            throw new common_1.NotFoundException(`السياسة غير موجودة: ${policyId}`);
        }
        if (policy.status !== client_1.SmartPolicyStatus.DRAFT && policy.status !== client_1.SmartPolicyStatus.PAUSED) {
            throw new common_1.BadRequestException(`لا يمكن إرسال سياسة بحالة ${policy.status} للموافقة`);
        }
        const requiredLevel = this.determineRequiredApprovalLevel(policy);
        const approval = await this.prisma.smartPolicyApproval.create({
            data: {
                policyId,
                submittedBy: submitterId,
                submittedByName: submitterName,
                requiredLevel,
                action: client_1.PolicyApprovalAction.SUBMITTED,
                policyVersion: policy.currentVersion,
                actionNotes: notes,
            },
        });
        await this.prisma.smartPolicy.update({
            where: { id: policyId },
            data: { status: client_1.SmartPolicyStatus.PENDING },
        });
        this.logger.log(`تم إرسال السياسة ${policyId} للموافقة - مستوى: ${requiredLevel}`);
        return {
            approval,
            message: `تم إرسال السياسة للموافقة. المستوى المطلوب: ${requiredLevel}`,
        };
    }
    async approve(policyId, approverId, approverName, notes, activateNow) {
        const approval = await this.prisma.smartPolicyApproval.findFirst({
            where: {
                policyId,
                action: client_1.PolicyApprovalAction.SUBMITTED,
            },
            orderBy: { submittedAt: 'desc' },
        });
        if (!approval) {
            throw new common_1.NotFoundException(`لا يوجد طلب موافقة معلق للسياسة ${policyId}`);
        }
        await this.prisma.smartPolicyApproval.update({
            where: { id: approval.id },
            data: {
                action: client_1.PolicyApprovalAction.APPROVED,
                actionBy: approverId,
                actionByName: approverName,
                actionAt: new Date(),
                actionNotes: notes,
            },
        });
        const updateData = {
            status: client_1.SmartPolicyStatus.ACTIVE,
            approvedById: approverId,
            approvedAt: new Date(),
        };
        if (activateNow) {
            updateData.isActive = true;
        }
        const updatedPolicy = await this.prisma.smartPolicy.update({
            where: { id: policyId },
            data: updateData,
        });
        this.logger.log(`تمت الموافقة على السياسة ${policyId} بواسطة ${approverName}`);
        return {
            policy: updatedPolicy,
            message: activateNow ? 'تمت الموافقة وتفعيل السياسة' : 'تمت الموافقة على السياسة',
        };
    }
    async reject(policyId, rejecterId, rejecterName, reason) {
        if (!reason || reason.trim().length < 5) {
            throw new common_1.BadRequestException('يجب توفير سبب الرفض (5 أحرف على الأقل)');
        }
        const approval = await this.prisma.smartPolicyApproval.findFirst({
            where: {
                policyId,
                action: client_1.PolicyApprovalAction.SUBMITTED,
            },
            orderBy: { submittedAt: 'desc' },
        });
        if (!approval) {
            throw new common_1.NotFoundException(`لا يوجد طلب موافقة معلق للسياسة ${policyId}`);
        }
        await this.prisma.smartPolicyApproval.update({
            where: { id: approval.id },
            data: {
                action: client_1.PolicyApprovalAction.REJECTED,
                actionBy: rejecterId,
                actionByName: rejecterName,
                actionAt: new Date(),
                rejectionReason: reason,
            },
        });
        await this.prisma.smartPolicy.update({
            where: { id: policyId },
            data: { status: client_1.SmartPolicyStatus.DRAFT },
        });
        this.logger.log(`تم رفض السياسة ${policyId} بواسطة ${rejecterName}: ${reason}`);
        return {
            message: 'تم رفض السياسة',
            reason,
        };
    }
    async requestChanges(policyId, reviewerId, reviewerName, requestedChanges) {
        const approval = await this.prisma.smartPolicyApproval.findFirst({
            where: {
                policyId,
                action: client_1.PolicyApprovalAction.SUBMITTED,
            },
            orderBy: { submittedAt: 'desc' },
        });
        if (!approval) {
            throw new common_1.NotFoundException(`لا يوجد طلب موافقة معلق للسياسة ${policyId}`);
        }
        await this.prisma.smartPolicyApproval.update({
            where: { id: approval.id },
            data: {
                action: client_1.PolicyApprovalAction.CHANGES_REQUESTED,
                actionBy: reviewerId,
                actionByName: reviewerName,
                actionAt: new Date(),
                actionNotes: requestedChanges,
            },
        });
        await this.prisma.smartPolicy.update({
            where: { id: policyId },
            data: { status: client_1.SmartPolicyStatus.DRAFT },
        });
        this.logger.log(`تم طلب تعديلات على السياسة ${policyId}`);
        return {
            message: 'تم طلب تعديلات على السياسة',
            requestedChanges,
        };
    }
    async getApprovalQueue(companyId) {
        const pendingPolicies = await this.prisma.smartPolicy.findMany({
            where: {
                companyId,
                status: client_1.SmartPolicyStatus.PENDING,
            },
            include: {
                approvals: {
                    where: { action: client_1.PolicyApprovalAction.SUBMITTED },
                    orderBy: { submittedAt: 'desc' },
                    take: 1,
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return {
            data: pendingPolicies.map(policy => ({
                id: policy.id,
                name: policy.name || policy.originalText.substring(0, 50),
                originalText: policy.originalText,
                triggerEvent: policy.triggerEvent,
                priority: policy.priority,
                currentVersion: policy.currentVersion,
                submittedBy: policy.approvals[0]?.submittedByName,
                submittedAt: policy.approvals[0]?.submittedAt,
                requiredLevel: policy.approvals[0]?.requiredLevel,
            })),
            total: pendingPolicies.length,
        };
    }
    async getApprovalHistory(policyId) {
        const approvals = await this.prisma.smartPolicyApproval.findMany({
            where: { policyId },
            orderBy: { createdAt: 'desc' },
        });
        return {
            data: approvals,
            total: approvals.length,
        };
    }
    determineRequiredApprovalLevel(policy) {
        const actions = policy.actions;
        if (!Array.isArray(actions)) {
            return 'HR';
        }
        for (const action of actions) {
            if (action.value && parseFloat(action.value) > 500) {
                return 'CEO';
            }
        }
        return 'HR';
    }
};
exports.PolicyApprovalService = PolicyApprovalService;
exports.PolicyApprovalService = PolicyApprovalService = PolicyApprovalService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        policy_versioning_service_1.PolicyVersioningService])
], PolicyApprovalService);
//# sourceMappingURL=policy-approval.service.js.map