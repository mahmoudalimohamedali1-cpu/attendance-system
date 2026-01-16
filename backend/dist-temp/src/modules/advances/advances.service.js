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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancesService = exports.CEODecisionDto = exports.FinanceDecisionDto = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const permissions_service_1 = require("../permissions/permissions.service");
const approval_workflow_service_1 = require("../../common/services/approval-workflow.service");
const client_1 = require("@prisma/client");
class FinanceDecisionDto {
}
exports.FinanceDecisionDto = FinanceDecisionDto;
class CEODecisionDto {
}
exports.CEODecisionDto = CEODecisionDto;
let AdvancesService = class AdvancesService {
    constructor(prisma, notificationsService, permissionsService, approvalWorkflowService) {
        this.prisma = prisma;
        this.notificationsService = notificationsService;
        this.permissionsService = permissionsService;
        this.approvalWorkflowService = approvalWorkflowService;
    }
    async createAdvanceRequest(userId, companyId, dto) {
        const chain = await this.approvalWorkflowService.getApprovalChain({
            requestType: client_1.ApprovalRequestType.ADVANCE,
            amount: Number(dto.amount),
            companyId,
        });
        const request = await this.prisma.advanceRequest.create({
            data: {
                userId,
                companyId,
                type: dto.type,
                amount: dto.amount,
                startDate: dto.startDate,
                endDate: dto.endDate,
                periodMonths: dto.periodMonths,
                monthlyDeduction: dto.monthlyDeduction,
                notes: dto.notes,
                attachments: Array.isArray(dto.attachments) ? dto.attachments.flat().filter(att => att && typeof att === 'object' && (att.url || att.path)) : [],
                approvalChain: chain,
                financeDecision: client_1.ApprovalDecision.PENDING,
                ceoDecision: client_1.ApprovalDecision.PENDING,
            },
            include: {
                user: { select: { firstName: true, lastName: true, employeeCode: true } },
            },
        });
        const managers = await this.getApproversForStep('ADVANCES_APPROVE_MANAGER', userId, companyId);
        for (const managerId of managers) {
            await this.notificationsService.sendNotification(managerId, client_1.NotificationType.GENERAL, 'طلب سلفة جديد', `${request.user.firstName} ${request.user.lastName} قدم طلب سلفة بقيمة ${dto.amount} ريال`, { type: 'advances', requestId: request.id });
        }
        return request;
    }
    async getManagerInbox(managerId, companyId) {
        const accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(managerId, companyId, 'ADVANCES_APPROVE_MANAGER');
        if (accessibleEmployeeIds.length === 0)
            return [];
        return this.prisma.advanceRequest.findMany({
            where: {
                userId: { in: accessibleEmployeeIds },
                currentStep: client_1.ApprovalStep.MANAGER,
                status: 'PENDING',
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        jobTitle: true,
                        branch: { select: { name: true } },
                        department: { select: { name: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async managerDecision(requestId, companyId, managerId, dto) {
        const request = await this.prisma.advanceRequest.findFirst({
            where: { id: requestId, companyId },
            include: { user: { select: { firstName: true, lastName: true, id: true, companyId: true } } },
        });
        if (!request)
            throw new common_1.NotFoundException('الطلب غير موجود');
        if (request.currentStep !== client_1.ApprovalStep.MANAGER) {
            throw new common_1.ForbiddenException('هذا الطلب ليس في مرحلة موافقة المدير');
        }
        const isApproved = dto.decision === 'APPROVED';
        const updated = await this.prisma.advanceRequest.update({
            where: { id: requestId, companyId },
            data: {
                managerApproverId: managerId,
                managerDecision: isApproved ? client_1.ApprovalDecision.APPROVED : client_1.ApprovalDecision.REJECTED,
                managerDecisionAt: new Date(),
                managerNotes: dto.notes,
                currentStep: isApproved ? client_1.ApprovalStep.HR : client_1.ApprovalStep.MANAGER,
                status: isApproved ? 'MGR_APPROVED' : 'REJECTED',
            },
        });
        await this.notificationsService.sendNotification(request.userId, client_1.NotificationType.GENERAL, isApproved ? 'تمت موافقة المدير على طلب السلفة' : 'تم رفض طلب السلفة', isApproved
            ? 'طلب السلفة الخاص بك في انتظار موافقة HR'
            : `تم رفض طلب السلفة: ${dto.notes || 'بدون ملاحظات'}`, { type: 'advances', requestId });
        if (isApproved) {
            const hrUsers = await this.getApproversForStep('ADVANCES_APPROVE_HR', request.userId, companyId);
            for (const hrId of hrUsers) {
                await this.notificationsService.sendNotification(hrId, client_1.NotificationType.GENERAL, 'طلب سلفة في انتظار موافقتك', `${request.user.firstName} ${request.user.lastName} - طلب سلفة بقيمة ${request.amount} ريال`, { type: 'advances', requestId });
            }
        }
        return updated;
    }
    async getHRInbox(hrId, companyId) {
        const accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(hrId, companyId, 'ADVANCES_APPROVE_HR');
        if (accessibleEmployeeIds.length === 0)
            return [];
        return this.prisma.advanceRequest.findMany({
            where: {
                userId: { in: accessibleEmployeeIds },
                currentStep: client_1.ApprovalStep.HR,
                status: 'MGR_APPROVED',
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        jobTitle: true,
                        salary: true,
                        branch: { select: { name: true } },
                        department: { select: { name: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async hrDecision(requestId, companyId, hrId, dto) {
        const request = await this.prisma.advanceRequest.findFirst({
            where: { id: requestId, companyId },
            include: { user: { select: { firstName: true, lastName: true } } },
        });
        if (!request)
            throw new common_1.NotFoundException('الطلب غير موجود');
        if (request.currentStep !== client_1.ApprovalStep.HR) {
            throw new common_1.ForbiddenException('هذا الطلب ليس في مرحلة موافقة HR');
        }
        const isApproved = dto.decision === 'APPROVED';
        const updated = await this.prisma.advanceRequest.update({
            where: { id: requestId, companyId },
            data: {
                hrApproverId: hrId,
                hrDecision: isApproved ? client_1.ApprovalDecision.APPROVED : client_1.ApprovalDecision.REJECTED,
                hrDecisionAt: new Date(),
                hrDecisionNotes: dto.notes,
                approvedAmount: isApproved ? (dto.approvedAmount || request.amount) : null,
                approvedMonthlyDeduction: isApproved ? (dto.approvedMonthlyDeduction || request.monthlyDeduction) : null,
                status: isApproved ? 'APPROVED' : 'REJECTED',
            },
        });
        if (isApproved) {
            const amountMessage = dto.approvedAmount && dto.approvedAmount !== Number(request.amount)
                ? ` (المبلغ المعتمد: ${dto.approvedAmount} ريال)`
                : '';
            const deductionMessage = dto.approvedMonthlyDeduction && dto.approvedMonthlyDeduction !== Number(request.monthlyDeduction)
                ? ` - الاستقطاع الشهري: ${dto.approvedMonthlyDeduction} ريال`
                : '';
            await this.notificationsService.sendNotification(request.userId, client_1.NotificationType.GENERAL, '✅ تمت الموافقة على طلب السلفة', `تمت الموافقة على طلب السلفة الخاص بك${amountMessage}${deductionMessage}`, { type: 'advances', requestId });
        }
        else {
            await this.notificationsService.sendNotification(request.userId, client_1.NotificationType.GENERAL, '❌ تم رفض طلب السلفة', `تم رفض طلب السلفة: ${dto.notes || 'بدون ملاحظات'}`, { type: 'advances', requestId });
        }
        return updated;
    }
    async getMyRequests(userId, companyId) {
        return this.prisma.advanceRequest.findMany({
            where: { userId, companyId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getRequestDetails(requestId, companyId) {
        return this.prisma.advanceRequest.findFirst({
            where: { id: requestId, companyId },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        jobTitle: true,
                        salary: true,
                        branch: { select: { name: true } },
                        department: { select: { name: true } },
                    },
                },
                managerApprover: { select: { firstName: true, lastName: true } },
                hrApprover: { select: { firstName: true, lastName: true } },
            },
        });
    }
    async getEmployeePreviousAdvances(employeeId, companyId) {
        return this.prisma.advanceRequest.findMany({
            where: { userId: employeeId, companyId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getApproversForStep(permissionCode, employeeId, companyId) {
        const users = await this.prisma.userPermission.findMany({
            where: {
                permission: { code: permissionCode },
                companyId,
                user: { status: 'ACTIVE' }
            },
            select: { userId: true },
            distinct: ['userId'],
        });
        return users.map(u => u.userId);
    }
    async getFinanceInbox(financeId, companyId) {
        const accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(financeId, companyId, 'ADVANCES_APPROVE_FINANCE');
        if (accessibleEmployeeIds.length === 0)
            return [];
        return this.prisma.advanceRequest.findMany({
            where: {
                userId: { in: accessibleEmployeeIds },
                currentStep: client_1.ApprovalStep.FINANCE,
                financeDecision: client_1.ApprovalDecision.PENDING,
            },
            include: {
                user: {
                    select: {
                        id: true, firstName: true, lastName: true, employeeCode: true,
                        salary: true, branch: { select: { name: true } }, department: { select: { name: true } },
                    },
                },
                managerApprover: { select: { firstName: true, lastName: true } },
                hrApprover: { select: { firstName: true, lastName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async financeDecision(requestId, companyId, financeId, dto) {
        const request = await this.prisma.advanceRequest.findFirst({
            where: { id: requestId, companyId },
            include: { user: { select: { firstName: true, lastName: true, id: true } } },
        });
        if (!request)
            throw new common_1.NotFoundException('الطلب غير موجود');
        if (request.currentStep !== client_1.ApprovalStep.FINANCE) {
            throw new common_1.ForbiddenException('هذا الطلب ليس في مرحلة موافقة المدير المالي');
        }
        const isApproved = dto.decision === 'APPROVED';
        const chain = request.approvalChain || [client_1.ApprovalStep.MANAGER, client_1.ApprovalStep.HR, client_1.ApprovalStep.FINANCE];
        const nextStep = this.approvalWorkflowService.getNextStep(chain, client_1.ApprovalStep.FINANCE);
        const isFinal = nextStep === client_1.ApprovalStep.COMPLETED;
        const updated = await this.prisma.advanceRequest.update({
            where: { id: requestId, companyId },
            data: {
                financeApproverId: financeId,
                financeDecision: isApproved ? client_1.ApprovalDecision.APPROVED : client_1.ApprovalDecision.REJECTED,
                financeDecisionAt: new Date(),
                financeDecisionNotes: dto.notes,
                currentStep: isApproved ? nextStep : client_1.ApprovalStep.COMPLETED,
                status: isApproved ? (isFinal ? 'APPROVED' : 'FINANCE_APPROVED') : 'REJECTED',
            },
        });
        await this.notificationsService.sendNotification(request.userId, client_1.NotificationType.GENERAL, isApproved ? 'موافقة المدير المالي على السلفة' : 'رفض طلب السلفة', isApproved
            ? `وافق المدير المالي على طلب السلفة${!isFinal ? ' - في انتظار موافقة المدير العام' : ''}`
            : `تم رفض طلب السلفة: ${dto.notes || 'بدون ملاحظات'}`, { type: 'advances', requestId });
        if (isApproved && nextStep === client_1.ApprovalStep.CEO) {
            const ceoUsers = await this.getApproversForStep('ADVANCES_APPROVE_CEO', request.user.id, companyId);
            for (const ceoId of ceoUsers) {
                await this.notificationsService.sendNotification(ceoId, client_1.NotificationType.GENERAL, 'طلب سلفة ينتظر موافقة المدير العام', `${request.user.firstName} ${request.user.lastName} - طلب سلفة بقيمة ${request.amount} ريال`, { type: 'advances', requestId });
            }
        }
        return updated;
    }
    async getCEOInbox(ceoId, companyId) {
        const accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(ceoId, companyId, 'ADVANCES_APPROVE_CEO');
        if (accessibleEmployeeIds.length === 0)
            return [];
        return this.prisma.advanceRequest.findMany({
            where: {
                userId: { in: accessibleEmployeeIds },
                currentStep: client_1.ApprovalStep.CEO,
                ceoDecision: client_1.ApprovalDecision.PENDING,
            },
            include: {
                user: {
                    select: {
                        id: true, firstName: true, lastName: true, employeeCode: true,
                        salary: true, branch: { select: { name: true } }, department: { select: { name: true } },
                    },
                },
                managerApprover: { select: { firstName: true, lastName: true } },
                hrApprover: { select: { firstName: true, lastName: true } },
                financeApprover: { select: { firstName: true, lastName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async ceoDecision(requestId, companyId, ceoId, dto) {
        const request = await this.prisma.advanceRequest.findFirst({
            where: { id: requestId, companyId },
            include: { user: { select: { firstName: true, lastName: true } } },
        });
        if (!request)
            throw new common_1.NotFoundException('الطلب غير موجود');
        if (request.currentStep !== client_1.ApprovalStep.CEO) {
            throw new common_1.ForbiddenException('هذا الطلب ليس في مرحلة موافقة المدير العام');
        }
        const isApproved = dto.decision === 'APPROVED';
        const updated = await this.prisma.advanceRequest.update({
            where: { id: requestId, companyId },
            data: {
                ceoApproverId: ceoId,
                ceoDecision: isApproved ? client_1.ApprovalDecision.APPROVED : client_1.ApprovalDecision.REJECTED,
                ceoDecisionAt: new Date(),
                ceoDecisionNotes: dto.notes,
                currentStep: client_1.ApprovalStep.COMPLETED,
                status: isApproved ? 'APPROVED' : 'REJECTED',
            },
        });
        await this.notificationsService.sendNotification(request.userId, client_1.NotificationType.GENERAL, isApproved ? '✅ الموافقة النهائية على السلفة' : '❌ رفض طلب السلفة', isApproved
            ? 'تمت الموافقة النهائية على طلب السلفة وسيتم خصمها من راتبك'
            : `تم رفض طلب السلفة من المدير العام: ${dto.notes || 'بدون ملاحظات'}`, { type: 'advances', requestId });
        return updated;
    }
};
exports.AdvancesService = AdvancesService;
exports.AdvancesService = AdvancesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        permissions_service_1.PermissionsService,
        approval_workflow_service_1.ApprovalWorkflowService])
], AdvancesService);
//# sourceMappingURL=advances.service.js.map