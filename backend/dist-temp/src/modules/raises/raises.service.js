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
exports.RaisesService = exports.CEODecisionDto = exports.FinanceDecisionDto = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
const permissions_service_1 = require("../permissions/permissions.service");
const notifications_service_1 = require("../notifications/notifications.service");
const approval_workflow_service_1 = require("../../common/services/approval-workflow.service");
class FinanceDecisionDto {
}
exports.FinanceDecisionDto = FinanceDecisionDto;
class CEODecisionDto {
}
exports.CEODecisionDto = CEODecisionDto;
let RaisesService = class RaisesService {
    constructor(prisma, permissionsService, notificationsService, approvalWorkflowService) {
        this.prisma = prisma;
        this.permissionsService = permissionsService;
        this.notificationsService = notificationsService;
        this.approvalWorkflowService = approvalWorkflowService;
    }
    mapTypeToEnum(type) {
        return type;
    }
    mapDecisionToEnum(decision) {
        return decision;
    }
    async createRaiseRequest(userId, companyId, dto) {
        return this.prisma.raiseRequest.create({
            data: {
                userId,
                companyId,
                type: this.mapTypeToEnum(dto.type),
                amount: dto.amount,
                effectiveMonth: new Date(dto.effectiveMonth),
                notes: dto.notes,
                attachments: dto.attachments,
                status: client_1.RaiseStatus.PENDING,
                currentStep: client_1.ApprovalStep.MANAGER,
                managerDecision: client_1.ApprovalDecision.PENDING,
                hrDecision: client_1.ApprovalDecision.PENDING,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        employeeCode: true,
                    },
                },
            },
        });
    }
    async getMyRaiseRequests(userId, companyId) {
        return this.prisma.raiseRequest.findMany({
            where: { userId, companyId },
            orderBy: { createdAt: 'desc' },
            include: {
                managerApprover: {
                    select: { id: true, firstName: true, lastName: true },
                },
                hrApprover: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
    }
    async getRaiseRequestById(id, userId, companyId) {
        const request = await this.prisma.raiseRequest.findFirst({
            where: { id, companyId },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        employeeCode: true,
                        department: true,
                        branch: true,
                        salary: true,
                        hireDate: true,
                    },
                },
                managerApprover: {
                    select: { id: true, firstName: true, lastName: true },
                },
                hrApprover: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
        if (!request) {
            throw new common_1.NotFoundException('طلب الزيادة غير موجود');
        }
        return request;
    }
    async cancelRaiseRequest(id, userId, companyId) {
        const request = await this.prisma.raiseRequest.findFirst({
            where: { id, userId, companyId },
        });
        if (!request) {
            throw new common_1.NotFoundException('طلب الزيادة غير موجود');
        }
        if (request.status !== client_1.RaiseStatus.PENDING) {
            throw new common_1.BadRequestException('لا يمكن إلغاء طلب تمت معالجته');
        }
        return this.prisma.raiseRequest.update({
            where: { id, companyId },
            data: { status: client_1.RaiseStatus.CANCELLED },
        });
    }
    async getManagerInbox(managerId, companyId) {
        const accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(managerId, companyId, 'RAISES_APPROVE_MANAGER');
        if (accessibleEmployeeIds.length === 0) {
            return [];
        }
        return this.prisma.raiseRequest.findMany({
            where: {
                userId: { in: accessibleEmployeeIds },
                companyId,
                currentStep: client_1.ApprovalStep.MANAGER,
                managerDecision: client_1.ApprovalDecision.PENDING,
                status: client_1.RaiseStatus.PENDING,
            },
            orderBy: { createdAt: 'asc' },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        employeeCode: true,
                        department: { select: { name: true } },
                        branch: { select: { name: true } },
                        salary: true,
                        hireDate: true,
                    },
                },
            },
        });
    }
    async managerDecision(requestId, companyId, managerId, dto) {
        const request = await this.prisma.raiseRequest.findFirst({
            where: { id: requestId, companyId },
            include: { user: true },
        });
        if (!request) {
            throw new common_1.NotFoundException('طلب الزيادة غير موجود');
        }
        if (request.currentStep !== client_1.ApprovalStep.MANAGER) {
            throw new common_1.BadRequestException('هذا الطلب ليس في مرحلة موافقة المدير');
        }
        if (request.user.managerId !== managerId) {
            throw new common_1.ForbiddenException('لا يمكنك الموافقة على هذا الطلب');
        }
        const decision = this.mapDecisionToEnum(dto.decision);
        let newStatus;
        let newStep;
        if (decision === client_1.ApprovalDecision.APPROVED) {
            newStatus = client_1.RaiseStatus.MGR_APPROVED;
            newStep = client_1.ApprovalStep.HR;
        }
        else if (decision === client_1.ApprovalDecision.REJECTED) {
            newStatus = client_1.RaiseStatus.MGR_REJECTED;
            newStep = client_1.ApprovalStep.COMPLETED;
        }
        else {
            newStatus = client_1.RaiseStatus.DELAYED;
            newStep = client_1.ApprovalStep.MANAGER;
        }
        const updated = await this.prisma.raiseRequest.update({
            where: { id: requestId, companyId },
            data: {
                managerApproverId: managerId,
                managerDecision: decision,
                managerDecisionAt: new Date(),
                managerNotes: dto.notes,
                status: newStatus,
                currentStep: newStep,
            },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
        await this.prisma.approvalLog.create({
            data: {
                companyId,
                requestType: 'RAISE',
                requestId,
                step: 'MANAGER',
                decision: dto.decision,
                notes: dto.notes,
                byUserId: managerId,
            },
        });
        await this.notificationsService.sendNotification(request.userId, client_1.NotificationType.GENERAL, decision === client_1.ApprovalDecision.APPROVED ? 'موافقة المدير على طلب الزيادة' : 'تم رفض طلب الزيادة', decision === client_1.ApprovalDecision.APPROVED
            ? 'وافق المدير على طلب الزيادة الخاص بك وتم تحويله للـ HR'
            : `تم رفض طلب الزيادة الخاص بك من قبل المدير${dto.notes ? ': ' + dto.notes : ''}`, { raiseRequestId: requestId });
        if (decision === client_1.ApprovalDecision.APPROVED) {
            const hrUsers = await this.prisma.user.findMany({
                where: {
                    companyId,
                    status: 'ACTIVE',
                    OR: [
                        { role: client_1.Role.ADMIN },
                        {
                            userPermissions: {
                                some: {
                                    permission: { code: 'RAISES_APPROVE_HR' },
                                    companyId
                                }
                            }
                        },
                        {
                            jobTitleRef: {
                                defaultPermissions: {
                                    some: {
                                        permission: { code: 'RAISES_APPROVE_HR' }
                                    }
                                }
                            }
                        }
                    ]
                },
                select: { id: true }
            });
            for (const hr of hrUsers) {
                await this.notificationsService.sendNotification(hr.id, client_1.NotificationType.GENERAL, 'طلب زيادة جديد ينتظر موافقة HR', `طلب زيادة جديد من ${updated.user.firstName} ${updated.user.lastName} ينتظر موافقتك`, { raiseRequestId: requestId });
            }
        }
        return updated;
    }
    async getHRInbox(hrUserId, companyId) {
        const accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(hrUserId, companyId, 'RAISES_APPROVE_HR');
        if (accessibleEmployeeIds.length === 0) {
            return [];
        }
        return this.prisma.raiseRequest.findMany({
            where: {
                userId: { in: accessibleEmployeeIds },
                companyId,
                currentStep: client_1.ApprovalStep.HR,
                hrDecision: client_1.ApprovalDecision.PENDING,
                status: client_1.RaiseStatus.MGR_APPROVED,
            },
            orderBy: { createdAt: 'asc' },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        employeeCode: true,
                        department: { select: { name: true } },
                        branch: { select: { name: true } },
                        salary: true,
                        hireDate: true,
                    },
                },
                managerApprover: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
    }
    async hrDecision(requestId, companyId, hrUserId, dto) {
        const request = await this.prisma.raiseRequest.findFirst({
            where: { id: requestId, companyId },
            include: { user: true },
        });
        if (!request) {
            throw new common_1.NotFoundException('طلب الزيادة غير موجود');
        }
        if (request.currentStep !== client_1.ApprovalStep.HR) {
            throw new common_1.BadRequestException('هذا الطلب ليس في مرحلة موافقة HR');
        }
        const accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(hrUserId, companyId, 'RAISES_APPROVE_HR');
        if (!accessibleEmployeeIds.includes(request.userId)) {
            throw new common_1.ForbiddenException('لا يمكنك الموافقة على هذا الطلب');
        }
        const decision = this.mapDecisionToEnum(dto.decision);
        const chain = request.approvalChain || [client_1.ApprovalStep.MANAGER, client_1.ApprovalStep.HR, client_1.ApprovalStep.FINANCE, client_1.ApprovalStep.CEO];
        const nextStep = this.approvalWorkflowService.getNextStep(chain, client_1.ApprovalStep.HR);
        let newStatus;
        let newCurrentStep;
        if (decision === client_1.ApprovalDecision.APPROVED) {
            newStatus = nextStep === client_1.ApprovalStep.COMPLETED ? client_1.RaiseStatus.APPROVED : client_1.RaiseStatus.MGR_APPROVED;
            newCurrentStep = nextStep;
        }
        else if (decision === client_1.ApprovalDecision.REJECTED) {
            newStatus = client_1.RaiseStatus.REJECTED;
            newCurrentStep = client_1.ApprovalStep.COMPLETED;
        }
        else {
            newStatus = client_1.RaiseStatus.DELAYED;
            newCurrentStep = client_1.ApprovalStep.HR;
        }
        const updated = await this.prisma.raiseRequest.update({
            where: { id: requestId, companyId },
            data: {
                hrApproverId: hrUserId,
                hrDecision: decision,
                hrDecisionAt: new Date(),
                hrDecisionNotes: dto.notes,
                hrAttachments: dto.attachments,
                status: newStatus,
                currentStep: newCurrentStep,
            },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
        await this.prisma.approvalLog.create({
            data: {
                companyId,
                requestType: 'RAISE',
                requestId,
                step: 'HR',
                decision: dto.decision,
                notes: dto.notes,
                byUserId: hrUserId,
            },
        });
        await this.notificationsService.sendNotification(request.userId, client_1.NotificationType.GENERAL, decision === client_1.ApprovalDecision.APPROVED ? 'الموافقة النهائية على طلب الزيادة' : 'تم رفض طلب الزيادة من HR', decision === client_1.ApprovalDecision.APPROVED
            ? 'تمت الموافقة النهائية على طلب الزيادة الخاص بك'
            : `تم رفض طلب الزيادة الخاص بك من قبل HR${dto.notes ? ': ' + dto.notes : ''}`, { raiseRequestId: requestId });
        return updated;
    }
    async getAllRaiseRequests(companyId, status) {
        const where = { companyId };
        if (status)
            where.status = status;
        return this.prisma.raiseRequest.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        employeeCode: true,
                        department: { select: { name: true } },
                        branch: { select: { name: true } },
                    },
                },
                managerApprover: {
                    select: { id: true, firstName: true, lastName: true },
                },
                hrApprover: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
    }
    async getRaiseStats(companyId, userId) {
        const where = { companyId };
        if (userId)
            where.userId = userId;
        const [pending, approved, rejected] = await Promise.all([
            this.prisma.raiseRequest.count({ where: { ...where, status: client_1.RaiseStatus.PENDING } }),
            this.prisma.raiseRequest.count({ where: { ...where, status: client_1.RaiseStatus.APPROVED } }),
            this.prisma.raiseRequest.count({ where: { ...where, status: client_1.RaiseStatus.REJECTED } }),
        ]);
        return { pending, approved, rejected, total: pending + approved + rejected };
    }
    async getFinanceInbox(financeUserId, companyId) {
        const accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(financeUserId, companyId, 'RAISES_APPROVE_FINANCE');
        if (accessibleEmployeeIds.length === 0)
            return [];
        return this.prisma.raiseRequest.findMany({
            where: {
                userId: { in: accessibleEmployeeIds },
                companyId,
                currentStep: client_1.ApprovalStep.FINANCE,
                financeDecision: client_1.ApprovalDecision.PENDING,
            },
            orderBy: { createdAt: 'asc' },
            include: {
                user: {
                    select: {
                        id: true, firstName: true, lastName: true, email: true, employeeCode: true,
                        department: { select: { name: true } },
                        branch: { select: { name: true } },
                        salary: true, hireDate: true,
                    },
                },
                managerApprover: { select: { id: true, firstName: true, lastName: true } },
                hrApprover: { select: { id: true, firstName: true, lastName: true } },
            },
        });
    }
    async financeDecision(requestId, companyId, financeUserId, dto) {
        const request = await this.prisma.raiseRequest.findFirst({
            where: { id: requestId, companyId },
            include: { user: true },
        });
        if (!request)
            throw new common_1.NotFoundException('طلب الزيادة غير موجود');
        if (request.currentStep !== client_1.ApprovalStep.FINANCE) {
            throw new common_1.BadRequestException('هذا الطلب ليس في مرحلة موافقة المدير المالي');
        }
        const accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(financeUserId, companyId, 'RAISES_APPROVE_FINANCE');
        if (!accessibleEmployeeIds.includes(request.userId)) {
            throw new common_1.ForbiddenException('لا يمكنك الموافقة على هذا الطلب');
        }
        const decision = this.mapDecisionToEnum(dto.decision);
        const chain = request.approvalChain || [client_1.ApprovalStep.MANAGER, client_1.ApprovalStep.HR, client_1.ApprovalStep.FINANCE, client_1.ApprovalStep.CEO];
        const nextStep = this.approvalWorkflowService.getNextStep(chain, client_1.ApprovalStep.FINANCE);
        let newStatus;
        let newCurrentStep;
        if (decision === client_1.ApprovalDecision.APPROVED) {
            newStatus = nextStep === client_1.ApprovalStep.COMPLETED ? client_1.RaiseStatus.APPROVED : client_1.RaiseStatus.MGR_APPROVED;
            newCurrentStep = nextStep;
        }
        else if (decision === client_1.ApprovalDecision.REJECTED) {
            newStatus = client_1.RaiseStatus.REJECTED;
            newCurrentStep = client_1.ApprovalStep.COMPLETED;
        }
        else {
            newStatus = client_1.RaiseStatus.DELAYED;
            newCurrentStep = client_1.ApprovalStep.FINANCE;
        }
        const updated = await this.prisma.raiseRequest.update({
            where: { id: requestId, companyId },
            data: {
                financeApproverId: financeUserId,
                financeDecision: decision,
                financeDecisionAt: new Date(),
                financeDecisionNotes: dto.notes,
                status: newStatus,
                currentStep: newCurrentStep,
            },
            include: { user: { select: { id: true, firstName: true, lastName: true } } },
        });
        await this.prisma.approvalLog.create({
            data: {
                companyId, requestType: 'RAISE', requestId,
                step: 'FINANCE', decision: dto.decision,
                notes: dto.notes, byUserId: financeUserId,
            },
        });
        if (decision === client_1.ApprovalDecision.APPROVED && newCurrentStep === client_1.ApprovalStep.COMPLETED) {
            await this.applyRaiseToSalary(requestId, companyId);
        }
        await this.notificationsService.sendNotification(request.userId, client_1.NotificationType.GENERAL, decision === client_1.ApprovalDecision.APPROVED ? 'موافقة المدير المالي على طلب الزيادة' : 'رفض طلب الزيادة', decision === client_1.ApprovalDecision.APPROVED
            ? `وافق المدير المالي على طلب الزيادة${nextStep !== client_1.ApprovalStep.COMPLETED ? ' - في انتظار موافقة المدير العام' : ''}`
            : `تم رفض طلب الزيادة${dto.notes ? ': ' + dto.notes : ''}`, { raiseRequestId: requestId });
        if (decision === client_1.ApprovalDecision.APPROVED && nextStep === client_1.ApprovalStep.CEO) {
            const ceoUsers = await this.prisma.user.findMany({
                where: {
                    companyId, status: 'ACTIVE',
                    OR: [
                        { role: client_1.Role.ADMIN },
                        { userPermissions: { some: { permission: { code: 'RAISES_APPROVE_CEO' }, companyId } } },
                    ],
                },
                select: { id: true },
            });
            for (const ceo of ceoUsers) {
                await this.notificationsService.sendNotification(ceo.id, client_1.NotificationType.GENERAL, 'طلب زيادة ينتظر موافقة المدير العام', `طلب زيادة من ${updated.user.firstName} ${updated.user.lastName} ينتظر موافقتك`, { raiseRequestId: requestId });
            }
        }
        return updated;
    }
    async getCEOInbox(ceoUserId, companyId) {
        const accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(ceoUserId, companyId, 'RAISES_APPROVE_CEO');
        if (accessibleEmployeeIds.length === 0)
            return [];
        return this.prisma.raiseRequest.findMany({
            where: {
                userId: { in: accessibleEmployeeIds },
                companyId,
                currentStep: client_1.ApprovalStep.CEO,
                ceoDecision: client_1.ApprovalDecision.PENDING,
            },
            orderBy: { createdAt: 'asc' },
            include: {
                user: {
                    select: {
                        id: true, firstName: true, lastName: true, email: true, employeeCode: true,
                        department: { select: { name: true } },
                        branch: { select: { name: true } },
                        salary: true, hireDate: true,
                    },
                },
                managerApprover: { select: { id: true, firstName: true, lastName: true } },
                hrApprover: { select: { id: true, firstName: true, lastName: true } },
                financeApprover: { select: { id: true, firstName: true, lastName: true } },
            },
        });
    }
    async ceoDecision(requestId, companyId, ceoUserId, dto) {
        const request = await this.prisma.raiseRequest.findFirst({
            where: { id: requestId, companyId },
            include: { user: true },
        });
        if (!request)
            throw new common_1.NotFoundException('طلب الزيادة غير موجود');
        if (request.currentStep !== client_1.ApprovalStep.CEO) {
            throw new common_1.BadRequestException('هذا الطلب ليس في مرحلة موافقة المدير العام');
        }
        const accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(ceoUserId, companyId, 'RAISES_APPROVE_CEO');
        if (!accessibleEmployeeIds.includes(request.userId)) {
            throw new common_1.ForbiddenException('لا يمكنك الموافقة على هذا الطلب');
        }
        const decision = this.mapDecisionToEnum(dto.decision);
        let newStatus;
        if (decision === client_1.ApprovalDecision.APPROVED) {
            newStatus = client_1.RaiseStatus.APPROVED;
        }
        else if (decision === client_1.ApprovalDecision.REJECTED) {
            newStatus = client_1.RaiseStatus.REJECTED;
        }
        else {
            newStatus = client_1.RaiseStatus.DELAYED;
        }
        const updated = await this.prisma.raiseRequest.update({
            where: { id: requestId, companyId },
            data: {
                ceoApproverId: ceoUserId,
                ceoDecision: decision,
                ceoDecisionAt: new Date(),
                ceoDecisionNotes: dto.notes,
                status: newStatus,
                currentStep: decision === client_1.ApprovalDecision.DELAYED ? client_1.ApprovalStep.CEO : client_1.ApprovalStep.COMPLETED,
            },
            include: { user: { select: { id: true, firstName: true, lastName: true } } },
        });
        await this.prisma.approvalLog.create({
            data: {
                companyId, requestType: 'RAISE', requestId,
                step: 'CEO', decision: dto.decision,
                notes: dto.notes, byUserId: ceoUserId,
            },
        });
        if (decision === client_1.ApprovalDecision.APPROVED) {
            await this.applyRaiseToSalary(requestId, companyId);
        }
        await this.notificationsService.sendNotification(request.userId, client_1.NotificationType.GENERAL, decision === client_1.ApprovalDecision.APPROVED ? 'الموافقة النهائية على طلب الزيادة 🎉' : 'رفض طلب الزيادة', decision === client_1.ApprovalDecision.APPROVED
            ? 'تمت الموافقة النهائية على طلب الزيادة وتم تطبيقها على راتبك'
            : `تم رفض طلب الزيادة من قبل المدير العام${dto.notes ? ': ' + dto.notes : ''}`, { raiseRequestId: requestId });
        return updated;
    }
    async applyRaiseToSalary(requestId, companyId) {
        const request = await this.prisma.raiseRequest.findFirst({
            where: { id: requestId, companyId, appliedToSalary: false },
            include: { user: { include: { salaryAssignments: { where: { isActive: true } } } } },
        });
        if (!request || request.appliedToSalary)
            return;
        const assignment = request.user.salaryAssignments[0];
        if (!assignment)
            return;
        const currentBaseSalary = Number(assignment.baseSalary);
        const raiseAmount = Number(request.amount);
        let newBaseSalary = currentBaseSalary;
        newBaseSalary = currentBaseSalary + raiseAmount;
        await this.prisma.employeeSalaryAssignment.update({
            where: { id: assignment.id },
            data: { baseSalary: newBaseSalary },
        });
        await this.prisma.raiseRequest.update({
            where: { id: requestId },
            data: { appliedToSalary: true },
        });
        await this.prisma.auditLog.create({
            data: {
                companyId,
                userId: request.userId,
                action: 'UPDATE',
                entity: 'SalaryAssignment',
                entityId: assignment.id,
                oldValue: { baseSalary: currentBaseSalary },
                newValue: { baseSalary: newBaseSalary, raiseRequestId: requestId },
            },
        });
    }
};
exports.RaisesService = RaisesService;
exports.RaisesService = RaisesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        permissions_service_1.PermissionsService,
        notifications_service_1.NotificationsService,
        approval_workflow_service_1.ApprovalWorkflowService])
], RaisesService);
//# sourceMappingURL=raises.service.js.map