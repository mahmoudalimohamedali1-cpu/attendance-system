import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateRaiseRequestDto, RaiseTypeDto } from './dto/create-raise-request.dto';
import { ManagerDecisionDto, HRDecisionDto, DecisionType } from './dto/raise-decision.dto';
import { RaiseStatus, ApprovalStep, ApprovalDecision, NotificationType, Role } from '@prisma/client';
import { PermissionsService } from '../permissions/permissions.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RaisesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly permissionsService: PermissionsService,
        private readonly notificationsService: NotificationsService,
    ) { }

    // ============ Helper Methods ============

    private mapTypeToEnum(type: RaiseTypeDto): any {
        return type as any;
    }

    private mapDecisionToEnum(decision: DecisionType): ApprovalDecision {
        return decision as ApprovalDecision;
    }

    // ============ Employee Endpoints ============

    async createRaiseRequest(userId: string, companyId: string, dto: CreateRaiseRequestDto) {
        return this.prisma.raiseRequest.create({
            data: {
                userId,
                companyId,
                type: this.mapTypeToEnum(dto.type),
                amount: dto.amount,
                effectiveMonth: new Date(dto.effectiveMonth),
                notes: dto.notes,
                attachments: dto.attachments,
                status: RaiseStatus.PENDING,
                currentStep: ApprovalStep.MANAGER,
                managerDecision: ApprovalDecision.PENDING,
                hrDecision: ApprovalDecision.PENDING,
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

    async getMyRaiseRequests(userId: string, companyId: string) {
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

    async getRaiseRequestById(id: string, userId: string, companyId: string) {
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
            throw new NotFoundException('طلب الزيادة غير موجود');
        }

        return request;
    }

    async cancelRaiseRequest(id: string, userId: string, companyId: string) {
        const request = await this.prisma.raiseRequest.findFirst({
            where: { id, userId, companyId },
        });

        if (!request) {
            throw new NotFoundException('طلب الزيادة غير موجود');
        }

        if (request.status !== RaiseStatus.PENDING) {
            throw new BadRequestException('لا يمكن إلغاء طلب تمت معالجته');
        }

        return this.prisma.raiseRequest.update({
            where: { id, companyId },
            data: { status: RaiseStatus.CANCELLED },
        });
    }

    // ============ Manager Inbox ============

    async getManagerInbox(managerId: string, companyId: string) {
        // استخدام نظام الصلاحيات للحصول على الموظفين المتاحين
        // يشمل: المرؤوسين المباشرين + أي موظفين ضمن نطاق صلاحية RAISES_APPROVE_MANAGER
        const accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(
            managerId,
            companyId,
            'RAISES_APPROVE_MANAGER',
        );

        if (accessibleEmployeeIds.length === 0) {
            return [];
        }

        return this.prisma.raiseRequest.findMany({
            where: {
                userId: { in: accessibleEmployeeIds },
                companyId,
                currentStep: ApprovalStep.MANAGER,
                managerDecision: ApprovalDecision.PENDING,
                status: RaiseStatus.PENDING,
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

    async managerDecision(requestId: string, companyId: string, managerId: string, dto: ManagerDecisionDto) {
        const request = await this.prisma.raiseRequest.findFirst({
            where: { id: requestId, companyId },
            include: { user: true },
        });

        if (!request) {
            throw new NotFoundException('طلب الزيادة غير موجود');
        }

        if (request.currentStep !== ApprovalStep.MANAGER) {
            throw new BadRequestException('هذا الطلب ليس في مرحلة موافقة المدير');
        }

        // Verify manager is the user's manager
        if (request.user.managerId !== managerId) {
            throw new ForbiddenException('لا يمكنك الموافقة على هذا الطلب');
        }

        const decision = this.mapDecisionToEnum(dto.decision);
        let newStatus: RaiseStatus;
        let newStep: ApprovalStep;

        if (decision === ApprovalDecision.APPROVED) {
            newStatus = RaiseStatus.MGR_APPROVED;
            newStep = ApprovalStep.HR;
        } else if (decision === ApprovalDecision.REJECTED) {
            newStatus = RaiseStatus.MGR_REJECTED;
            newStep = ApprovalStep.COMPLETED;
        } else {
            newStatus = RaiseStatus.DELAYED;
            newStep = ApprovalStep.MANAGER;
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

        // Log the approval
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

        // Notify employee
        await this.notificationsService.sendNotification(
            request.userId,
            NotificationType.GENERAL,
            decision === ApprovalDecision.APPROVED ? 'موافقة المدير على طلب الزيادة' : 'تم رفض طلب الزيادة',
            decision === ApprovalDecision.APPROVED
                ? 'وافق المدير على طلب الزيادة الخاص بك وتم تحويله للـ HR'
                : `تم رفض طلب الزيادة الخاص بك من قبل المدير${dto.notes ? ': ' + dto.notes : ''}`,
            { raiseRequestId: requestId },
        );

        if (decision === ApprovalDecision.APPROVED) {
            const hrUsers = await this.prisma.user.findMany({
                where: {
                    companyId,
                    status: 'ACTIVE',
                    OR: [
                        { role: Role.ADMIN },
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
                await this.notificationsService.sendNotification(
                    hr.id,
                    NotificationType.GENERAL,
                    'طلب زيادة جديد ينتظر موافقة HR',
                    `طلب زيادة جديد من ${updated.user.firstName} ${updated.user.lastName} ينتظر موافقتك`,
                    { raiseRequestId: requestId },
                );
            }
        }

        return updated;
    }

    // ============ HR Inbox ============

    async getHRInbox(hrUserId: string, companyId: string) {
        // HR sees requests based on RAISES_APPROVE_HR permission
        const accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(
            hrUserId,
            companyId,
            'RAISES_APPROVE_HR',
        );

        if (accessibleEmployeeIds.length === 0) {
            return [];
        }

        return this.prisma.raiseRequest.findMany({
            where: {
                userId: { in: accessibleEmployeeIds },
                companyId,
                currentStep: ApprovalStep.HR,
                hrDecision: ApprovalDecision.PENDING,
                status: RaiseStatus.MGR_APPROVED,
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

    async hrDecision(requestId: string, companyId: string, hrUserId: string, dto: HRDecisionDto) {
        const request = await this.prisma.raiseRequest.findFirst({
            where: { id: requestId, companyId },
            include: { user: true },
        });

        if (!request) {
            throw new NotFoundException('طلب الزيادة غير موجود');
        }

        if (request.currentStep !== ApprovalStep.HR) {
            throw new BadRequestException('هذا الطلب ليس في مرحلة موافقة HR');
        }

        // Verify HR has permission to approve this employee's requests
        const accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(
            hrUserId,
            companyId,
            'RAISES_APPROVE_HR',
        );

        if (!accessibleEmployeeIds.includes(request.userId)) {
            throw new ForbiddenException('لا يمكنك الموافقة على هذا الطلب');
        }

        const decision = this.mapDecisionToEnum(dto.decision);
        let newStatus: RaiseStatus;

        if (decision === ApprovalDecision.APPROVED) {
            newStatus = RaiseStatus.APPROVED;
        } else if (decision === ApprovalDecision.REJECTED) {
            newStatus = RaiseStatus.REJECTED;
        } else {
            newStatus = RaiseStatus.DELAYED;
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
                currentStep: ApprovalStep.COMPLETED,
            },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });

        // Log the approval
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

        // Notify employee
        await this.notificationsService.sendNotification(
            request.userId,
            NotificationType.GENERAL,
            decision === ApprovalDecision.APPROVED ? 'الموافقة النهائية على طلب الزيادة' : 'تم رفض طلب الزيادة من HR',
            decision === ApprovalDecision.APPROVED
                ? 'تمت الموافقة النهائية على طلب الزيادة الخاص بك'
                : `تم رفض طلب الزيادة الخاص بك من قبل HR${dto.notes ? ': ' + dto.notes : ''}`,
            { raiseRequestId: requestId },
        );

        return updated;
    }

    // ============ Admin Endpoints ============

    async getAllRaiseRequests(companyId: string, status?: RaiseStatus) {
        const where: any = { companyId };
        if (status) where.status = status;

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

    // ============ Statistics ============

    async getRaiseStats(companyId: string, userId?: string) {
        const where: any = { companyId };
        if (userId) where.userId = userId;

        const [pending, approved, rejected] = await Promise.all([
            this.prisma.raiseRequest.count({ where: { ...where, status: RaiseStatus.PENDING } }),
            this.prisma.raiseRequest.count({ where: { ...where, status: RaiseStatus.APPROVED } }),
            this.prisma.raiseRequest.count({ where: { ...where, status: RaiseStatus.REJECTED } }),
        ]);

        return { pending, approved, rejected, total: pending + approved + rejected };
    }
}
