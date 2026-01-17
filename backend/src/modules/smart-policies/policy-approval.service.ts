// @ts-nocheck
import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SmartPolicyStatus } from '@prisma/client';
// Local replacement for PolicyApprovalAction enum
const PolicyApprovalAction = {
    APPROVE: 'APPROVE',
    REJECT: 'REJECT',
    REQUEST_CHANGES: 'REQUEST_CHANGES',
} as const;
type PolicyApprovalAction = typeof PolicyApprovalAction[keyof typeof PolicyApprovalAction];
import { PolicyVersioningService } from './policy-versioning.service';

/**
 * Policy Approval Service
 * يدير سير عمل الموافقة على السياسات الذكية
 * يضمن أن السياسات تمر بمراجعة قبل التفعيل
 */
@Injectable()
export class PolicyApprovalService {
    private readonly logger = new Logger(PolicyApprovalService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly versioningService: PolicyVersioningService,
    ) { }

    /**
     * إرسال السياسة للموافقة
     * يغير الحالة من DRAFT إلى PENDING
     */
    async submitForApproval(
        policyId: string,
        submitterId: string,
        submitterName: string,
        notes?: string,
    ) {
        // 1. جلب السياسة
        const policy = await this.prisma.smartPolicy.findUnique({
            where: { id: policyId },
        });

        if (!policy) {
            throw new NotFoundException(`السياسة غير موجودة: ${policyId}`);
        }

        // 2. التحقق من الحالة
        if (policy.status !== SmartPolicyStatus.DRAFT && policy.status !== SmartPolicyStatus.PAUSED) {
            throw new BadRequestException(`لا يمكن إرسال سياسة بحالة ${policy.status} للموافقة`);
        }

        // 3. تحديد مستوى الموافقة المطلوب
        const requiredLevel = this.determineRequiredApprovalLevel(policy);

        // 4. إنشاء سجل الموافقة
        const approval = await this.prisma.smartPolicyApproval.create({
            data: {
                policyId,
                submittedBy: submitterId,
                submittedByName: submitterName,
                requiredLevel,
                action: PolicyApprovalAction.SUBMITTED,
                policyVersion: policy.currentVersion,
                actionNotes: notes,
            },
        });

        // 5. تحديث حالة السياسة
        await this.prisma.smartPolicy.update({
            where: { id: policyId },
            data: { status: SmartPolicyStatus.PENDING },
        });

        this.logger.log(`تم إرسال السياسة ${policyId} للموافقة - مستوى: ${requiredLevel}`);

        return {
            approval,
            message: `تم إرسال السياسة للموافقة. المستوى المطلوب: ${requiredLevel}`,
        };
    }

    /**
     * الموافقة على السياسة
     */
    async approve(
        policyId: string,
        approverId: string,
        approverName: string,
        notes?: string,
        activateNow?: boolean,
    ) {
        // 1. جلب آخر طلب موافقة
        const approval = await this.prisma.smartPolicyApproval.findFirst({
            where: {
                policyId,
                action: PolicyApprovalAction.SUBMITTED,
            },
            orderBy: { submittedAt: 'desc' },
        });

        if (!approval) {
            throw new NotFoundException(`لا يوجد طلب موافقة معلق للسياسة ${policyId}`);
        }

        // 2. التحقق من صلاحية الموافقة
        await this.validateApproverPermission(approverId, approval.requiredLevel);

        // 3. تحديث سجل الموافقة
        await this.prisma.smartPolicyApproval.update({
            where: { id: approval.id },
            data: {
                action: PolicyApprovalAction.APPROVED,
                actionBy: approverId,
                actionByName: approverName,
                actionAt: new Date(),
                actionNotes: notes,
            },
        });

        // 4. تحديث السياسة
        const updateData: any = {
            status: SmartPolicyStatus.ACTIVE,
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

    /**
     * رفض السياسة
     */
    async reject(
        policyId: string,
        rejecterId: string,
        rejecterName: string,
        reason: string,
    ) {
        if (!reason || reason.trim().length < 5) {
            throw new BadRequestException('يجب توفير سبب الرفض (5 أحرف على الأقل)');
        }

        // 1. جلب آخر طلب موافقة
        const approval = await this.prisma.smartPolicyApproval.findFirst({
            where: {
                policyId,
                action: PolicyApprovalAction.SUBMITTED,
            },
            orderBy: { submittedAt: 'desc' },
        });

        if (!approval) {
            throw new NotFoundException(`لا يوجد طلب موافقة معلق للسياسة ${policyId}`);
        }

        // 2. تحديث سجل الموافقة
        await this.prisma.smartPolicyApproval.update({
            where: { id: approval.id },
            data: {
                action: PolicyApprovalAction.REJECTED,
                actionBy: rejecterId,
                actionByName: rejecterName,
                actionAt: new Date(),
                rejectionReason: reason,
            },
        });

        // 3. إرجاع السياسة لحالة المسودة
        await this.prisma.smartPolicy.update({
            where: { id: policyId },
            data: { status: SmartPolicyStatus.DRAFT },
        });

        this.logger.log(`تم رفض السياسة ${policyId} بواسطة ${rejecterName}: ${reason}`);

        return {
            message: 'تم رفض السياسة',
            reason,
        };
    }

    /**
     * طلب تعديلات على السياسة
     */
    async requestChanges(
        policyId: string,
        reviewerId: string,
        reviewerName: string,
        requestedChanges: string,
    ) {
        const approval = await this.prisma.smartPolicyApproval.findFirst({
            where: {
                policyId,
                action: PolicyApprovalAction.SUBMITTED,
            },
            orderBy: { submittedAt: 'desc' },
        });

        if (!approval) {
            throw new NotFoundException(`لا يوجد طلب موافقة معلق للسياسة ${policyId}`);
        }

        await this.prisma.smartPolicyApproval.update({
            where: { id: approval.id },
            data: {
                action: PolicyApprovalAction.CHANGES_REQUESTED,
                actionBy: reviewerId,
                actionByName: reviewerName,
                actionAt: new Date(),
                actionNotes: requestedChanges,
            },
        });

        // إرجاع السياسة لحالة المسودة للتعديل
        await this.prisma.smartPolicy.update({
            where: { id: policyId },
            data: { status: SmartPolicyStatus.DRAFT },
        });

        this.logger.log(`تم طلب تعديلات على السياسة ${policyId}`);

        return {
            message: 'تم طلب تعديلات على السياسة',
            requestedChanges,
        };
    }

    /**
     * جلب قائمة الموافقات المعلقة للشركة
     */
    async getApprovalQueue(companyId: string) {
        const pendingPolicies = await this.prisma.smartPolicy.findMany({
            where: {
                companyId,
                status: SmartPolicyStatus.PENDING,
            },
            include: {
                approvals: {
                    where: { action: PolicyApprovalAction.SUBMITTED },
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

    /**
     * جلب تاريخ الموافقات لسياسة معينة
     */
    async getApprovalHistory(policyId: string) {
        const approvals = await this.prisma.smartPolicyApproval.findMany({
            where: { policyId },
            orderBy: { createdAt: 'desc' },
        });

        return {
            data: approvals,
            total: approvals.length,
        };
    }

    /**
     * التحقق من صلاحية المستخدم للموافقة على السياسة
     * @param approverId - معرف المستخدم الموافق
     * @param requiredLevel - مستوى الموافقة المطلوب (HR, CEO)
     */
    private async validateApproverPermission(approverId: string, requiredLevel: string): Promise<void> {
        // جلب بيانات المستخدم الموافق
        const approver = await this.prisma.user.findUnique({
            where: { id: approverId },
            select: {
                id: true,
                role: true,
                jobTitle: true,
            },
        });

        if (!approver) {
            throw new NotFoundException(`المستخدم غير موجود: ${approverId}`);
        }

        // تحديد الأدوار المسموح لها بالموافقة لكل مستوى
        const allowedRoles: Record<string, string[]> = {
            'HR': ['ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'CEO', 'OWNER'],
            'CEO': ['CEO', 'OWNER', 'ADMIN'],
        };

        const userRole = approver.role?.toUpperCase() || '';
        const userJobTitle = approver.jobTitle?.toUpperCase() || '';
        const allowedForLevel = allowedRoles[requiredLevel] || allowedRoles['HR'];

        // التحقق من الدور أو المسمى الوظيفي
        const hasPermission = allowedForLevel.some(role =>
            userRole.includes(role) || userJobTitle.includes(role)
        );

        if (!hasPermission) {
            this.logger.warn(`المستخدم ${approverId} ليس لديه صلاحية الموافقة على مستوى ${requiredLevel}`);
            throw new ForbiddenException(
                `ليس لديك صلاحية الموافقة على هذه السياسة. المستوى المطلوب: ${requiredLevel}`
            );
        }

        this.logger.log(`تم التحقق من صلاحية الموافقة للمستخدم ${approverId} - مستوى: ${requiredLevel}`);
    }

    /**
     * تحديد مستوى الموافقة المطلوب بناءً على نوع السياسة
     * السياسات المالية الكبيرة تحتاج موافقة CEO
     */
    private determineRequiredApprovalLevel(policy: any): string {
        // فحص الإجراءات للبحث عن خصومات/إضافات مالية كبيرة
        const actions = policy.actions as any[];

        if (!Array.isArray(actions)) {
            return 'HR';
        }

        for (const action of actions) {
            // إذا كان هناك خصم أو إضافة أكبر من 500 ريال
            if (action.value && parseFloat(action.value) > 500) {
                return 'CEO';
            }
        }

        return 'HR';
    }
}
