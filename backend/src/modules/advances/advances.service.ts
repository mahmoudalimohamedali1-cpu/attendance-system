import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PermissionsService } from '../permissions/permissions.service';
import { CreateAdvanceRequestDto, ManagerDecisionDto, HrDecisionDto } from './dto/advance-request.dto';
import { ApprovalStep, ApprovalDecision, NotificationType, Role } from '@prisma/client';

@Injectable()
export class AdvancesService {
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService,
        private permissionsService: PermissionsService,
    ) { }

    // ==================== إنشاء طلب سلفة ====================

    async createAdvanceRequest(userId: string, dto: CreateAdvanceRequestDto) {
        const request = await this.prisma.advanceRequest.create({
            data: {
                userId,
                type: dto.type as any,
                amount: dto.amount,
                startDate: dto.startDate,
                endDate: dto.endDate,
                periodMonths: dto.periodMonths,
                monthlyDeduction: dto.monthlyDeduction,
                notes: dto.notes,
                attachments: Array.isArray(dto.attachments) ? dto.attachments.flat().filter(att => att && typeof att === 'object' && (att.url || att.path)) : [],
            },
            include: {
                user: { select: { firstName: true, lastName: true, employeeCode: true } },
            },
        });

        // إشعار للمدير
        const managers = await this.getApproversForStep('ADVANCES_APPROVE_MANAGER', userId);
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

    async managerDecision(requestId: string, managerId: string, dto: ManagerDecisionDto) {
        const request = await this.prisma.advanceRequest.findUnique({
            where: { id: requestId },
            include: { user: { select: { firstName: true, lastName: true } } },
        });

        if (!request) throw new NotFoundException('الطلب غير موجود');
        if (request.currentStep !== ApprovalStep.MANAGER) {
            throw new ForbiddenException('هذا الطلب ليس في مرحلة موافقة المدير');
        }

        const isApproved = dto.decision === 'APPROVED';

        const updated = await this.prisma.advanceRequest.update({
            where: { id: requestId },
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
            const hrUsers = await this.getApproversForStep('ADVANCES_APPROVE_HR', request.userId);
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

    async hrDecision(requestId: string, hrId: string, dto: HrDecisionDto) {
        const request = await this.prisma.advanceRequest.findUnique({
            where: { id: requestId },
            include: { user: { select: { firstName: true, lastName: true } } },
        });

        if (!request) throw new NotFoundException('الطلب غير موجود');
        if (request.currentStep !== ApprovalStep.HR) {
            throw new ForbiddenException('هذا الطلب ليس في مرحلة موافقة HR');
        }

        const isApproved = dto.decision === 'APPROVED';

        const updated = await this.prisma.advanceRequest.update({
            where: { id: requestId },
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

    async getMyRequests(userId: string) {
        return this.prisma.advanceRequest.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    // ==================== تفاصيل الطلب ====================

    async getRequestDetails(requestId: string) {
        return this.prisma.advanceRequest.findUnique({
            where: { id: requestId },
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

    async getEmployeePreviousAdvances(employeeId: string) {
        return this.prisma.advanceRequest.findMany({
            where: { userId: employeeId },
            orderBy: { createdAt: 'desc' },
        });
    }

    // ==================== Helper Methods ====================

    private async getApproversForStep(permissionCode: string, employeeId: string): Promise<string[]> {
        const users = await this.prisma.userPermission.findMany({
            where: {
                permission: { code: permissionCode },
            },
            select: { userId: true },
            distinct: ['userId'],
        });
        return users.map(u => u.userId);
    }
}
