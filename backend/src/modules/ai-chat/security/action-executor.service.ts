import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * ⚡ Action Executor Service
 * Enables AI Chat to take real actions - approve, reject, modify, add
 * with secure role-based permissions and audit logging.
 * 
 * Note: Simplified version to avoid TypeScript errors with Prisma schema changes.
 */

interface ActionResult {
    success: boolean;
    message: string;
    action: string;
    details?: any;
}

interface ActionContext {
    userId: string;
    companyId: string;
    userRole: string;
    userName: string;
}

type Role = 'ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE';

@Injectable()
export class ActionExecutorService {
    private readonly logger = new Logger(ActionExecutorService.name);

    private readonly roleHierarchy: Record<string, number> = {
        'ADMIN': 4,
        'HR': 3,
        'MANAGER': 2,
        'EMPLOYEE': 1,
    };

    constructor(private readonly prisma: PrismaService) { }

    private hasPermission(userRole: string, requiredRole: Role): boolean {
        const userLevel = this.roleHierarchy[userRole] || 0;
        const requiredLevel = this.roleHierarchy[requiredRole] || 0;
        return userLevel >= requiredLevel;
    }

    async approveLeaveRequest(
        requestId: string,
        context: ActionContext
    ): Promise<ActionResult> {
        if (!this.hasPermission(context.userRole, 'MANAGER')) {
            return {
                success: false,
                message: '⛔ ليس لديك صلاحية للموافقة على الإجازات.',
                action: 'APPROVE_LEAVE'
            };
        }

        try {
            const leave = await this.prisma.leaveRequest.update({
                where: { id: requestId },
                data: {
                    status: 'APPROVED',
                    approverId: context.userId,
                    approvedAt: new Date(),
                },
                include: {
                    user: { select: { firstName: true, lastName: true } }
                }
            });

            await this.logAction('APPROVE_LEAVE', context, { requestId });

            return {
                success: true,
                message: `✅ تم الموافقة على إجازة ${leave.user.firstName} ${leave.user.lastName}`,
                action: 'APPROVE_LEAVE',
                details: leave
            };
        } catch (error) {
            this.logger.error('Failed to approve leave', error);
            return {
                success: false,
                message: '❌ فشل في الموافقة على الإجازة.',
                action: 'APPROVE_LEAVE'
            };
        }
    }

    async rejectLeaveRequest(
        requestId: string,
        reason: string,
        context: ActionContext
    ): Promise<ActionResult> {
        if (!this.hasPermission(context.userRole, 'MANAGER')) {
            return {
                success: false,
                message: '⛔ ليس لديك صلاحية لرفض الإجازات.',
                action: 'REJECT_LEAVE'
            };
        }

        try {
            const leave = await this.prisma.leaveRequest.update({
                where: { id: requestId },
                data: {
                    status: 'REJECTED',
                    approverNotes: reason || 'مرفوض',
                },
                include: {
                    user: { select: { firstName: true, lastName: true } }
                }
            });

            await this.logAction('REJECT_LEAVE', context, { requestId, reason });

            return {
                success: true,
                message: `❌ تم رفض إجازة ${leave.user.firstName} ${leave.user.lastName}`,
                action: 'REJECT_LEAVE',
                details: leave
            };
        } catch (error) {
            this.logger.error('Failed to reject leave', error);
            return {
                success: false,
                message: '❌ فشل في رفض الإجازة.',
                action: 'REJECT_LEAVE'
            };
        }
    }

    async approveAdvanceRequest(
        requestId: string,
        context: ActionContext
    ): Promise<ActionResult> {
        if (!this.hasPermission(context.userRole, 'MANAGER')) {
            return {
                success: false,
                message: '⛔ ليس لديك صلاحية للموافقة على السُلف.',
                action: 'APPROVE_ADVANCE'
            };
        }

        try {
            const advance = await this.prisma.advanceRequest.update({
                where: { id: requestId },
                data: {
                    status: 'APPROVED',
                },
                include: {
                    user: { select: { firstName: true, lastName: true } }
                }
            });

            await this.logAction('APPROVE_ADVANCE', context, { requestId, amount: advance.amount });

            return {
                success: true,
                message: `✅ تم الموافقة على سلفة ${advance.user.firstName} ${advance.user.lastName}`,
                action: 'APPROVE_ADVANCE',
                details: advance
            };
        } catch (error) {
            this.logger.error('Failed to approve advance', error);
            return {
                success: false,
                message: '❌ فشل في الموافقة على السلفة.',
                action: 'APPROVE_ADVANCE'
            };
        }
    }

    async clockIn(context: ActionContext): Promise<ActionResult> {
        // Simplified - requires branchId which is not available in context
        return {
            success: false,
            message: '⚠️ تسجيل الحضور عبر المحادثة غير متاح حالياً.',
            action: 'CLOCK_IN'
        };
    }

    async clockOut(context: ActionContext): Promise<ActionResult> {
        return {
            success: false,
            message: '⚠️ تسجيل الانصراف عبر المحادثة غير متاح حالياً.',
            action: 'CLOCK_OUT'
        };
    }

    async submitLeaveRequest(
        leaveTypeName: string,
        days: number,
        context: ActionContext
    ): Promise<ActionResult> {
        // LeaveType is an enum, not a model - simplified
        return {
            success: false,
            message: '⚠️ طلب الإجازة عبر المحادثة غير متاح حالياً. يرجى استخدام النظام.',
            action: 'SUBMIT_LEAVE'
        };
    }

    async findPendingLeaveByName(
        employeeName: string,
        companyId: string
    ): Promise<{ id: string; employee: string } | null> {
        try {
            const leave = await this.prisma.leaveRequest.findFirst({
                where: {
                    status: 'PENDING',
                    user: {
                        companyId,
                        OR: [
                            { firstName: { contains: employeeName, mode: 'insensitive' } },
                            { lastName: { contains: employeeName, mode: 'insensitive' } },
                        ]
                    }
                },
                include: {
                    user: { select: { firstName: true, lastName: true } }
                },
                orderBy: { createdAt: 'desc' }
            });

            if (!leave) return null;

            return {
                id: leave.id,
                employee: `${leave.user.firstName} ${leave.user.lastName}`
            };
        } catch {
            return null;
        }
    }

    async findPendingAdvanceByName(
        employeeName: string,
        companyId: string
    ): Promise<{ id: string; employee: string; amount: number } | null> {
        try {
            const advance = await this.prisma.advanceRequest.findFirst({
                where: {
                    status: 'PENDING',
                    user: {
                        companyId,
                        OR: [
                            { firstName: { contains: employeeName, mode: 'insensitive' } },
                            { lastName: { contains: employeeName, mode: 'insensitive' } },
                        ]
                    }
                },
                include: {
                    user: { select: { firstName: true, lastName: true } }
                },
                orderBy: { createdAt: 'desc' }
            });

            if (!advance) return null;

            return {
                id: advance.id,
                employee: `${advance.user.firstName} ${advance.user.lastName}`,
                amount: Number(advance.amount)
            };
        } catch {
            return null;
        }
    }

    async getPendingForApproval(companyId: string): Promise<string> {
        try {
            const [leaves, advances] = await Promise.all([
                this.prisma.leaveRequest.findMany({
                    where: { user: { companyId }, status: 'PENDING' },
                    include: {
                        user: { select: { firstName: true, lastName: true } }
                    },
                    take: 10,
                    orderBy: { createdAt: 'desc' }
                }),
                this.prisma.advanceRequest.findMany({
                    where: { user: { companyId }, status: 'PENDING' },
                    include: {
                        user: { select: { firstName: true, lastName: true } }
                    },
                    take: 10,
                    orderBy: { createdAt: 'desc' }
                })
            ]);

            const leaveList = leaves.map((l, i) =>
                `${i + 1}. 🏖️ ${l.user.firstName} ${l.user.lastName} - ${l.type}`
            ).join('\n');

            const advanceList = advances.map((a, i) =>
                `${i + 1}. 💵 ${a.user.firstName} ${a.user.lastName} - ${Number(a.amount).toLocaleString('ar-SA')} ريال`
            ).join('\n');

            return `📋 **الطلبات المعلقة:**

🏖️ **إجازات (${leaves.length}):**
${leaveList || 'لا توجد'}

💵 **سُلف (${advances.length}):**
${advanceList || 'لا توجد'}`;
        } catch {
            return '❌ فشل في تحميل الطلبات المعلقة';
        }
    }

    private async logAction(
        action: string,
        context: ActionContext,
        details: any
    ): Promise<void> {
        try {
            this.logger.log(`ACTION: ${action} by ${context.userName} (${context.userRole})`, details);
        } catch (error) {
            this.logger.error('Failed to log action', error);
        }
    }

    async approveAllPendingLeaves(context: ActionContext): Promise<ActionResult> {
        if (!this.hasPermission(context.userRole, 'HR')) {
            return {
                success: false,
                message: '⛔ يلزم صلاحية HR أو أعلى.',
                action: 'APPROVE_ALL_LEAVES'
            };
        }

        try {
            const result = await this.prisma.leaveRequest.updateMany({
                where: {
                    user: { companyId: context.companyId },
                    status: 'PENDING'
                },
                data: {
                    status: 'APPROVED',
                }
            });

            await this.logAction('APPROVE_ALL_LEAVES', context, { count: result.count });

            return {
                success: true,
                message: `✅ تم الموافقة على ${result.count} طلب إجازة`,
                action: 'APPROVE_ALL_LEAVES',
                details: { count: result.count }
            };
        } catch (error) {
            this.logger.error('Failed to approve all leaves', error);
            return {
                success: false,
                message: '❌ فشل في الموافقة الجماعية.',
                action: 'APPROVE_ALL_LEAVES'
            };
        }
    }
}
