import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Task Recovery Service
 * يتعامل مع استعادة المهام المحذوفة وسلة المهملات
 * هذا الـ service يعمل مع المهام التي تم حذفها (soft delete)
 */
@Injectable()
export class TaskRecoveryService {
    constructor(private prisma: PrismaService) { }

    /**
     * Soft delete a task - marks as DELETED instead of permanent deletion
     */
    async softDeleteTask(taskId: string, companyId: string, userId: string) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
        });

        if (!task) {
            throw new NotFoundException('المهمة غير موجودة');
        }

        // Check permission
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (task.createdById !== userId && user?.role !== 'ADMIN' && user?.role !== 'HR') {
            throw new ForbiddenException('ليس لديك صلاحية حذف هذه المهمة');
        }

        const deletedAt = new Date().toISOString();
        const cf = (task.customFields as any) || {};
        cf.deletedAt = deletedAt;
        cf.deletedBy = userId;
        cf.previousStatus = task.status;

        await this.prisma.task.update({
            where: { id: taskId },
            data: {
                status: 'DELETED' as any,
                customFields: cf,
            },
        });

        // Log activity
        await this.prisma.taskActivityLog.create({
            data: {
                taskId,
                userId,
                action: 'SOFT_DELETED',
                oldValue: task.status,
                newValue: 'DELETED',
                description: 'تم نقل المهمة إلى سلة المهملات',
            },
        });

        return { message: 'تم حذف المهمة (يمكن استعادتها)', canRestore: true };
    }

    /**
     * Permanently delete a task - only ADMIN can do this
     */
    async hardDeleteTask(taskId: string, companyId: string, userId: string) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
        });

        if (!task) {
            throw new NotFoundException('المهمة غير موجودة');
        }

        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (user?.role !== 'ADMIN') {
            throw new ForbiddenException('فقط المدير يمكنه الحذف النهائي');
        }

        await this.prisma.task.delete({ where: { id: taskId } });

        return { message: 'تم حذف المهمة نهائياً' };
    }

    /**
     * Restore a soft-deleted task
     */
    async restoreDeletedTask(taskId: string, companyId: string, userId: string) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId, status: 'DELETED' as any },
        });

        if (!task) {
            throw new NotFoundException('المهمة المحذوفة غير موجودة');
        }

        const cf = (task.customFields as any) || {};
        const previousStatus = cf.previousStatus || 'TODO';

        // Clear deletion metadata
        delete cf.deletedAt;
        delete cf.deletedBy;
        delete cf.previousStatus;

        await this.prisma.task.update({
            where: { id: taskId },
            data: {
                status: previousStatus,
                customFields: Object.keys(cf).length > 0 ? cf : null,
            },
        });

        // Log activity
        await this.prisma.taskActivityLog.create({
            data: {
                taskId,
                userId,
                action: 'RESTORED',
                oldValue: 'DELETED',
                newValue: previousStatus,
                description: 'تم استعادة المهمة من سلة المهملات',
            },
        });

        return { message: 'تم استعادة المهمة بنجاح', restoredStatus: previousStatus };
    }

    /**
     * Get all deleted tasks (trash bin)
     */
    async getDeletedTasks(companyId: string) {
        const tasks = await this.prisma.task.findMany({
            where: { companyId, status: 'DELETED' as any },
            include: {
                createdBy: { select: { id: true, firstName: true, lastName: true } },
                assignee: { select: { id: true, firstName: true, lastName: true } },
                category: true,
            },
            orderBy: { updatedAt: 'desc' },
        });

        return {
            data: tasks.map(t => {
                const cf = (t.customFields as any) || {};
                return {
                    ...t,
                    deletedAt: cf.deletedAt,
                    deletedBy: cf.deletedBy,
                    previousStatus: cf.previousStatus,
                };
            }),
            total: tasks.length,
        };
    }

    /**
     * Bulk soft delete tasks
     */
    async bulkSoftDeleteTasks(companyId: string, userId: string, taskIds: string[]) {
        const tasks = await this.prisma.task.findMany({
            where: { id: { in: taskIds }, companyId },
        });

        if (tasks.length === 0) {
            throw new BadRequestException('لا توجد مهام للحذف');
        }

        const deletedAt = new Date().toISOString();

        for (const task of tasks) {
            const cf = (task.customFields as any) || {};
            cf.deletedAt = deletedAt;
            cf.deletedBy = userId;
            cf.previousStatus = task.status;
            cf.bulkDeleted = true;

            await this.prisma.task.update({
                where: { id: task.id },
                data: {
                    status: 'DELETED' as any,
                    customFields: cf,
                },
            });

            await this.prisma.taskActivityLog.create({
                data: {
                    taskId: task.id,
                    userId,
                    action: 'BULK_SOFT_DELETED',
                    oldValue: task.status,
                    newValue: 'DELETED',
                    description: 'تم نقل المهمة إلى سلة المهملات (حذف جماعي)',
                },
            });
        }

        return {
            deleted: tasks.length,
            type: 'soft',
            message: 'تم حذف المهام (يمكن استعادتها من سلة المهملات)',
            canRestore: true,
        };
    }

    /**
     * Bulk restore deleted tasks
     */
    async bulkRestoreDeletedTasks(companyId: string, userId: string, taskIds: string[]) {
        const tasks = await this.prisma.task.findMany({
            where: { id: { in: taskIds }, companyId, status: 'DELETED' as any },
        });

        if (tasks.length === 0) {
            throw new BadRequestException('لا توجد مهام محذوفة لاستعادتها');
        }

        let restoredCount = 0;
        for (const task of tasks) {
            const cf = (task.customFields as any) || {};
            const previousStatus = cf.previousStatus || 'TODO';

            delete cf.deletedAt;
            delete cf.deletedBy;
            delete cf.previousStatus;
            delete cf.bulkDeleted;

            await this.prisma.task.update({
                where: { id: task.id },
                data: {
                    status: previousStatus,
                    customFields: Object.keys(cf).length > 0 ? cf : null,
                },
            });

            await this.prisma.taskActivityLog.create({
                data: {
                    taskId: task.id,
                    userId,
                    action: 'BULK_RESTORED',
                    oldValue: 'DELETED',
                    newValue: previousStatus,
                    description: 'تم استعادة المهمة (استعادة جماعية)',
                },
            });

            restoredCount++;
        }

        return { restored: restoredCount, message: 'تم استعادة المهام بنجاح' };
    }

    /**
     * Empty trash (permanently delete all soft-deleted tasks)
     * Only ADMIN can do this
     */
    async emptyTrash(companyId: string, userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (user?.role !== 'ADMIN') {
            throw new ForbiddenException('فقط المدير يمكنه إفراغ سلة المهملات');
        }

        const result = await this.prisma.task.deleteMany({
            where: { companyId, status: 'DELETED' as any },
        });

        return {
            deleted: result.count,
            message: `تم حذف ${result.count} مهمة نهائياً`,
        };
    }

    /**
     * Get trash statistics
     */
    async getTrashStats(companyId: string) {
        const [total, oldThan30Days] = await Promise.all([
            this.prisma.task.count({
                where: { companyId, status: 'DELETED' as any },
            }),
            this.prisma.task.count({
                where: {
                    companyId,
                    status: 'DELETED' as any,
                    updatedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                },
            }),
        ]);

        return {
            totalDeleted: total,
            olderThan30Days: oldThan30Days,
            message: total > 0
                ? `لديك ${total} مهمة في سلة المهملات${oldThan30Days > 0 ? ` (${oldThan30Days} أقدم من 30 يوم)` : ''}`
                : 'سلة المهملات فارغة',
        };
    }
}
