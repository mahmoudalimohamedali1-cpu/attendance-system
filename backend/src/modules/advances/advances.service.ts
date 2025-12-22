import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PermissionsService } from '../permissions/permissions.service';
import { ApprovalWorkflowService } from '../../common/services/approval-workflow.service';
import { CreateAdvanceRequestDto, ManagerDecisionDto, HrDecisionDto } from './dto/advance-request.dto';
import { ApprovalStep, ApprovalDecision, NotificationType, Role, ApprovalRequestType } from '@prisma/client';

// DTOs for Finance and CEO decisions
export class FinanceDecisionDto {
    decision: 'APPROVED' | 'REJECTED' | 'DELAYED';
    notes?: string;
}

export class CEODecisionDto {
    decision: 'APPROVED' | 'REJECTED' | 'DELAYED';
    notes?: string;
}

@Injectable()
export class AdvancesService {
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService,
        private permissionsService: PermissionsService,
        private approvalWorkflowService: ApprovalWorkflowService,
    ) { }

    // ==================== إنشاء طلب سلفة ====================

    async createAdvanceRequest(userId: string, companyId: string, dto: CreateAdvanceRequestDto) {
        // Get approval chain based on amount
        const chain = await this.approvalWorkflowService.getApprovalChain({
            requestType: ApprovalRequestType.ADVANCE,
            amount: Number(dto.amount),
            companyId,
        });

        const request = await this.prisma.advanceRequest.create({
            data: {
                userId,
                companyId,
                type: dto.type as any,
                amount: dto.amount,
                startDate: dto.startDate,
                endDate: dto.endDate,
                periodMonths: dto.periodMonths,
                monthlyDeduction: dto.monthlyDeduction,
                notes: dto.notes,
                attachments: Array.isArray(dto.attachments) ? dto.attachments.flat().filter(att => att && typeof att === 'object' && (att.url || att.path)) : [],
                approvalChain: chain, // Store the approval chain
                financeDecision: ApprovalDecision.PENDING,
                ceoDecision: ApprovalDecision.PENDING,
            },
            include: {
                user: { select: { firstName: true, lastName: true, employeeCode: true } },
            },
        });

        // إشعار للمدير
        const managers = await this.getApproversForStep('ADVANCES_APPROVE_MANAGER', userId, companyId);
        for (const managerId of managers) {
            await this.notificationsService.sendNotification(
                managerId,
                NotificationType.GENERAL,
                'طلب سلفة جديد',
                `${request.user.firstName} ${request.user.lastName} قدم طلب سلفة بقيمة ${dto.amount} ريال`,
                { type: 'advances', requestId: request.id },
            );
        }

        return request;
    }

    // ==================== صندوق المدير ====================

    async getManagerInbox(managerId: string, companyId: string) {
        const accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(
            managerId,
            companyId,
            'ADVANCES_APPROVE_MANAGER',
        );

        if (accessibleEmployeeIds.length === 0) return [];

        return this.prisma.advanceRequest.findMany({
            where: {
                userId: { in: accessibleEmployeeIds },
                currentStep: ApprovalStep.MANAGER,
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

    // ==================== قرار المدير ====================

    async managerDecision(requestId: string, companyId: string, managerId: string, dto: ManagerDecisionDto) {
        const request = await this.prisma.advanceRequest.findFirst({
            where: { id: requestId, companyId },
            include: { user: { select: { firstName: true, lastName: true, id: true, companyId: true } } },
        });

        if (!request) throw new NotFoundException('الطلب غير موجود');
        if (request.currentStep !== ApprovalStep.MANAGER) {
            throw new ForbiddenException('هذا الطلب ليس في مرحلة موافقة المدير');
        }

        const isApproved = dto.decision === 'APPROVED';

        const updated = await this.prisma.advanceRequest.update({
            where: { id: requestId, companyId },
            data: {
                managerApproverId: managerId,
                managerDecision: isApproved ? ApprovalDecision.APPROVED : ApprovalDecision.REJECTED,
                managerDecisionAt: new Date(),
                managerNotes: dto.notes,
                currentStep: isApproved ? ApprovalStep.HR : ApprovalStep.MANAGER,
                status: isApproved ? 'MGR_APPROVED' : 'REJECTED',
            },
        });

        // إشعار للموظف
        await this.notificationsService.sendNotification(
            request.userId,
            NotificationType.GENERAL,
            isApproved ? 'تمت موافقة المدير على طلب السلفة' : 'تم رفض طلب السلفة',
            isApproved
                ? 'طلب السلفة الخاص بك في انتظار موافقة HR'
                : `تم رفض طلب السلفة: ${dto.notes || 'بدون ملاحظات'}`,
            { type: 'advances', requestId },
        );

        // إذا تمت الموافقة، إشعار لـ HR
        if (isApproved) {
            const hrUsers = await this.getApproversForStep('ADVANCES_APPROVE_HR', request.userId, companyId);
            for (const hrId of hrUsers) {
                await this.notificationsService.sendNotification(
                    hrId,
                    NotificationType.GENERAL,
                    'طلب سلفة في انتظار موافقتك',
                    `${request.user.firstName} ${request.user.lastName} - طلب سلفة بقيمة ${request.amount} ريال`,
                    { type: 'advances', requestId },
                );
            }
        }

        return updated;
    }

    // ==================== صندوق HR ====================

    async getHRInbox(hrId: string, companyId: string) {
        const accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(
            hrId,
            companyId,
            'ADVANCES_APPROVE_HR',
        );

        if (accessibleEmployeeIds.length === 0) return [];

        return this.prisma.advanceRequest.findMany({
            where: {
                userId: { in: accessibleEmployeeIds },
                currentStep: ApprovalStep.HR,
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

    // ==================== قرار HR ====================

    async hrDecision(requestId: string, companyId: string, hrId: string, dto: HrDecisionDto) {
        const request = await this.prisma.advanceRequest.findFirst({
            where: { id: requestId, companyId },
            include: { user: { select: { firstName: true, lastName: true } } },
        });

        if (!request) throw new NotFoundException('الطلب غير موجود');
        if (request.currentStep !== ApprovalStep.HR) {
            throw new ForbiddenException('هذا الطلب ليس في مرحلة موافقة HR');
        }

        const isApproved = dto.decision === 'APPROVED';

        const updated = await this.prisma.advanceRequest.update({
            where: { id: requestId, companyId },
            data: {
                hrApproverId: hrId,
                hrDecision: isApproved ? ApprovalDecision.APPROVED : ApprovalDecision.REJECTED,
                hrDecisionAt: new Date(),
                hrDecisionNotes: dto.notes,
                approvedAmount: isApproved ? (dto.approvedAmount || request.amount) : null,
                approvedMonthlyDeduction: isApproved ? (dto.approvedMonthlyDeduction || request.monthlyDeduction) : null,
                status: isApproved ? 'APPROVED' : 'REJECTED',
            },
        });

        // إشعار للموظف بالنتيجة النهائية
        if (isApproved) {
            const amountMessage = dto.approvedAmount && dto.approvedAmount !== Number(request.amount)
                ? ` (المبلغ المعتمد: ${dto.approvedAmount} ريال)`
                : '';
            const deductionMessage = dto.approvedMonthlyDeduction && dto.approvedMonthlyDeduction !== Number(request.monthlyDeduction)
                ? ` - الاستقطاع الشهري: ${dto.approvedMonthlyDeduction} ريال`
                : '';

            await this.notificationsService.sendNotification(
                request.userId,
                NotificationType.GENERAL,
                '✅ تمت الموافقة على طلب السلفة',
                `تمت الموافقة على طلب السلفة الخاص بك${amountMessage}${deductionMessage}`,
                { type: 'advances', requestId },
            );
        } else {
            await this.notificationsService.sendNotification(
                request.userId,
                NotificationType.GENERAL,
                '❌ تم رفض طلب السلفة',
                `تم رفض طلب السلفة: ${dto.notes || 'بدون ملاحظات'}`,
                { type: 'advances', requestId },
            );
        }

        return updated;
    }

    // ==================== طلباتي ====================

    async getMyRequests(userId: string, companyId: string) {
        return this.prisma.advanceRequest.findMany({
            where: { userId, companyId },
            orderBy: { createdAt: 'desc' },
        });
    }

    // ==================== تفاصيل الطلب ====================

    async getRequestDetails(requestId: string, companyId: string) {
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

    // ==================== السلف السابقة للموظف (لـ HR) ====================

    async getEmployeePreviousAdvances(employeeId: string, companyId: string) {
        return this.prisma.advanceRequest.findMany({
            where: { userId: employeeId, companyId },
            orderBy: { createdAt: 'desc' },
        });
    }

    // ==================== Helper Methods ====================

    private async getApproversForStep(permissionCode: string, employeeId: string, companyId: string): Promise<string[]> {
        const users = await this.prisma.userPermission.findMany({
            where: {
                permission: { code: permissionCode },
                companyId, // التحقق من نفس الشركة
                user: { status: 'ACTIVE' }
            },
            select: { userId: true },
            distinct: ['userId'],
        });
        return users.map(u => u.userId);
    }

    // ==================== Finance Manager Inbox & Decision ====================

    async getFinanceInbox(financeId: string, companyId: string) {
        const accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(
            financeId, companyId, 'ADVANCES_APPROVE_FINANCE',
        );
        if (accessibleEmployeeIds.length === 0) return [];

        return this.prisma.advanceRequest.findMany({
            where: {
                userId: { in: accessibleEmployeeIds },
                currentStep: ApprovalStep.FINANCE,
                financeDecision: ApprovalDecision.PENDING,
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

    async financeDecision(requestId: string, companyId: string, financeId: string, dto: FinanceDecisionDto) {
        const request = await this.prisma.advanceRequest.findFirst({
            where: { id: requestId, companyId },
            include: { user: { select: { firstName: true, lastName: true, id: true } } },
        });

        if (!request) throw new NotFoundException('الطلب غير موجود');
        if (request.currentStep !== ApprovalStep.FINANCE) {
            throw new ForbiddenException('هذا الطلب ليس في مرحلة موافقة المدير المالي');
        }

        const isApproved = dto.decision === 'APPROVED';
        const chain = (request.approvalChain as ApprovalStep[]) || [ApprovalStep.MANAGER, ApprovalStep.HR, ApprovalStep.FINANCE];
        const nextStep = this.approvalWorkflowService.getNextStep(chain, ApprovalStep.FINANCE);
        const isFinal = nextStep === ApprovalStep.COMPLETED;

        const updated = await this.prisma.advanceRequest.update({
            where: { id: requestId, companyId },
            data: {
                financeApproverId: financeId,
                financeDecision: isApproved ? ApprovalDecision.APPROVED : ApprovalDecision.REJECTED,
                financeDecisionAt: new Date(),
                financeDecisionNotes: dto.notes,
                currentStep: isApproved ? nextStep : ApprovalStep.COMPLETED,
                status: isApproved ? (isFinal ? 'APPROVED' : 'FINANCE_APPROVED') : 'REJECTED',
            },
        });

        // Notify employee
        await this.notificationsService.sendNotification(
            request.userId, NotificationType.GENERAL,
            isApproved ? 'موافقة المدير المالي على السلفة' : 'رفض طلب السلفة',
            isApproved
                ? `وافق المدير المالي على طلب السلفة${!isFinal ? ' - في انتظار موافقة المدير العام' : ''}`
                : `تم رفض طلب السلفة: ${dto.notes || 'بدون ملاحظات'}`,
            { type: 'advances', requestId },
        );

        // If approved and next step is CEO, notify CEO
        if (isApproved && nextStep === ApprovalStep.CEO) {
            const ceoUsers = await this.getApproversForStep('ADVANCES_APPROVE_CEO', request.user.id, companyId);
            for (const ceoId of ceoUsers) {
                await this.notificationsService.sendNotification(
                    ceoId, NotificationType.GENERAL,
                    'طلب سلفة ينتظر موافقة المدير العام',
                    `${request.user.firstName} ${request.user.lastName} - طلب سلفة بقيمة ${request.amount} ريال`,
                    { type: 'advances', requestId },
                );
            }
        }

        return updated;
    }

    // ==================== CEO Inbox & Decision ====================

    async getCEOInbox(ceoId: string, companyId: string) {
        const accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(
            ceoId, companyId, 'ADVANCES_APPROVE_CEO',
        );
        if (accessibleEmployeeIds.length === 0) return [];

        return this.prisma.advanceRequest.findMany({
            where: {
                userId: { in: accessibleEmployeeIds },
                currentStep: ApprovalStep.CEO,
                ceoDecision: ApprovalDecision.PENDING,
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

    async ceoDecision(requestId: string, companyId: string, ceoId: string, dto: CEODecisionDto) {
        const request = await this.prisma.advanceRequest.findFirst({
            where: { id: requestId, companyId },
            include: { user: { select: { firstName: true, lastName: true } } },
        });

        if (!request) throw new NotFoundException('الطلب غير موجود');
        if (request.currentStep !== ApprovalStep.CEO) {
            throw new ForbiddenException('هذا الطلب ليس في مرحلة موافقة المدير العام');
        }

        const isApproved = dto.decision === 'APPROVED';

        const updated = await this.prisma.advanceRequest.update({
            where: { id: requestId, companyId },
            data: {
                ceoApproverId: ceoId,
                ceoDecision: isApproved ? ApprovalDecision.APPROVED : ApprovalDecision.REJECTED,
                ceoDecisionAt: new Date(),
                ceoDecisionNotes: dto.notes,
                currentStep: ApprovalStep.COMPLETED,
                status: isApproved ? 'APPROVED' : 'REJECTED',
            },
        });

        // Notify employee
        await this.notificationsService.sendNotification(
            request.userId, NotificationType.GENERAL,
            isApproved ? '✅ الموافقة النهائية على السلفة' : '❌ رفض طلب السلفة',
            isApproved
                ? 'تمت الموافقة النهائية على طلب السلفة وسيتم خصمها من راتبك'
                : `تم رفض طلب السلفة من المدير العام: ${dto.notes || 'بدون ملاحظات'}`,
            { type: 'advances', requestId },
        );

        return updated;
    }
}

