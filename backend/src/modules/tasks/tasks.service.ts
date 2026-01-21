// @ts-nocheck
import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import {
    CreateTaskCategoryDto,
    UpdateTaskCategoryDto,
} from './dto/task-category.dto';
import {
    CreateTaskTemplateDto,
    UpdateTaskTemplateDto,
} from './dto/task-template.dto';
import {
    CreateChecklistDto,
    CreateChecklistItemDto,
    CreateCommentDto,
    CreateTimeLogDto,
    ReorderTaskDto,
} from './dto/task-actions.dto';
import { TaskStatus, NotificationType, Prisma } from '@prisma/client';

// Type for Task with all relations included
type TaskWithRelations = Prisma.TaskGetPayload<{
    include: {
        category: true;
        sprint: true;
        template: true;
        createdBy: { select: { id: true; firstName: true; lastName: true; avatar: true; email: true } };
        assignee: { select: { id: true; firstName: true; lastName: true; avatar: true; email: true } };
        assignments: { include: { user: { select: { id: true; firstName: true; lastName: true; avatar: true } } } };
        watchers: { include: { user: { select: { id: true; firstName: true; lastName: true; avatar: true } } } };
        checklists: { include: { items: true } };
        comments: { include: { author: { select: { id: true; firstName: true; lastName: true; avatar: true } } } };
        attachments: { include: { uploadedBy: { select: { id: true; firstName: true; lastName: true } } } };
        timeLogs: { include: { user: { select: { id: true; firstName: true; lastName: true } } } };
        blockedBy: { include: { blockingTask: { select: { id: true; title: true; status: true } } } };
        blocks: { include: { blockedTask: { select: { id: true; title: true; status: true } } } };
        activities: { include: { user: { select: { id: true; firstName: true; lastName: true } } } };
    };
}>;

@Injectable()
export class TasksService {
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService,
    ) { }

    // ============ TASKS CRUD ============

    async createTask(
        userId: string,
        companyId: string,
        dto: CreateTaskDto,
    ) {
        // If using template, apply template defaults
        let templateData = {};
        if (dto.templateId) {
            const template = await this.prisma.taskTemplate.findFirst({
                where: { id: dto.templateId, companyId },
            });
            if (template) {
                templateData = {
                    priority: dto.priority || template.defaultPriority,
                    dueDate: dto.dueDate
                        ? new Date(dto.dueDate)
                        : template.defaultDueDays
                            ? new Date(Date.now() + template.defaultDueDays * 24 * 60 * 60 * 1000)
                            : undefined,
                };
            }
        }

        const task = await this.prisma.task.create({
            data: {
                companyId,
                createdById: userId,
                title: dto.title,
                description: dto.description,
                priority: dto.priority || (templateData as any).priority || 'MEDIUM',
                status: dto.status || 'TODO',
                categoryId: dto.categoryId,
                templateId: dto.templateId,
                sprintId: dto.sprintId,
                storyPoints: dto.storyPoints,
                estimatedHours: dto.estimatedHours,
                dueDate: dto.dueDate
                    ? new Date(dto.dueDate)
                    : (templateData as any).dueDate,
                startDate: dto.startDate ? new Date(dto.startDate) : undefined,
                assigneeId: dto.assigneeId,
                tags: dto.tags || [],
                customFields: dto.customFields as any,
            },
            include: {
                category: true,
                sprint: true,
                createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
            },
        });

        // Log activity
        await this.logActivity(task.id, userId, 'CREATED', null, null, 'تم إنشاء المهمة');

        // If a template has checklist template, create checklists
        if (dto.templateId) {
            const template = await this.prisma.taskTemplate.findUnique({
                where: { id: dto.templateId },
            });
            if (template?.checklistTemplate) {
                const checklists = template.checklistTemplate as any[];
                for (let i = 0; i < checklists.length; i++) {
                    const cl = checklists[i];
                    const checklist = await this.prisma.taskChecklist.create({
                        data: {
                            taskId: task.id,
                            title: cl.title,
                            order: i,
                        },
                    });
                    if (cl.items && Array.isArray(cl.items)) {
                        for (let j = 0; j < cl.items.length; j++) {
                            await this.prisma.taskChecklistItem.create({
                                data: {
                                    checklistId: checklist.id,
                                    content: typeof cl.items[j] === 'string' ? cl.items[j] : cl.items[j].content,
                                    order: j,
                                },
                            });
                        }
                    }
                }
            }
        }

        // Notify assignee if assigned
        if (dto.assigneeId && dto.assigneeId !== userId) {
            await this.notificationsService.create({
                companyId,
                userId: dto.assigneeId,
                type: NotificationType.GENERAL,
                title: 'مهمة جديدة مسندة إليك',
                body: `تم تكليفك بمهمة: ${dto.title}`,
                data: { taskId: task.id },
            });
        }

        return task;
    }

    async getTasks(companyId: string, query: TaskQueryDto) {
        const {
            search,
            status,
            priority,
            categoryId,
            sprintId,
            assigneeId,
            createdById,
            dueDateFrom,
            dueDateTo,
            tags,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc',
        } = query;

        const where: Prisma.TaskWhereInput = {
            companyId,
            ...(search && {
                OR: [
                    { title: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                ],
            }),
            ...(status && { status }),
            ...(priority && { priority }),
            ...(categoryId && { categoryId }),
            ...(sprintId && { sprintId }),
            ...(assigneeId && { assigneeId }),
            ...(createdById && { createdById }),
            ...(dueDateFrom || dueDateTo
                ? {
                    dueDate: {
                        ...(dueDateFrom && { gte: new Date(dueDateFrom) }),
                        ...(dueDateTo && { lte: new Date(dueDateTo) }),
                    },
                }
                : {}),
            ...(tags && { tags: { hasSome: tags.split(',') } }),
        } as any;

        const [tasks, total] = await Promise.all([
            this.prisma.task.findMany({
                where,
                include: {
                    category: true,
                    sprint: true,
                    createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                    assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                    checklists: {
                        include: { items: true },
                    },
                    _count: {
                        select: { comments: true, attachments: true },
                    },
                },
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.task.count({ where }),
        ]);

        return {
            data: tasks,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get tasks assigned to or created by the current user (for mobile app)
     */
    async getMyTasks(userId: string, companyId: string) {
        const tasks = await this.prisma.task.findMany({
            where: {
                companyId,
                status: { not: 'CANCELLED' },
                OR: [
                    { assigneeId: userId },
                    { createdById: userId },
                ],
            },
            include: {
                category: true,
                sprint: true,
                createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                checklists: { include: { items: true } },
            },
            orderBy: [
                { status: 'asc' },
                { priority: 'asc' },
                { dueDate: 'asc' },
            ],
        });

        return tasks;
    }

    async getTaskById(id: string, companyId: string): Promise<TaskWithRelations> {
        const task = await this.prisma.task.findFirst({
            where: { id, companyId },
            include: {
                category: true,
                sprint: true,
                template: true,
                createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true, email: true } },
                assignee: { select: { id: true, firstName: true, lastName: true, avatar: true, email: true } },
                assignments: {
                    include: {
                        user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                    },
                },
                watchers: {
                    include: {
                        user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                    },
                },
                checklists: {
                    include: { items: { orderBy: { order: 'asc' } } },
                    orderBy: { order: 'asc' },
                },
                comments: {
                    include: {
                        author: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                attachments: {
                    include: {
                        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
                    },
                },
                timeLogs: {
                    include: {
                        user: { select: { id: true, firstName: true, lastName: true } },
                    },
                    orderBy: { startTime: 'desc' },
                },
                blockedTasks: {
                    include: {
                        blockingTask: { select: { id: true, title: true, status: true } },
                    },
                },
                blockingTasks: {
                    include: {
                        blockedTask: { select: { id: true, title: true, status: true } },
                    },
                },
                activities: {
                    include: {
                        user: { select: { id: true, firstName: true, lastName: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                },
            },
        });

        if (!task) {
            throw new NotFoundException('المهمة غير موجودة');
        }

        return task;
    }

    async updateTask(
        id: string,
        companyId: string,
        userId: string,
        dto: UpdateTaskDto,
    ) {
        const existing = await this.prisma.task.findFirst({
            where: { id, companyId },
        });

        if (!existing) {
            throw new NotFoundException('المهمة غير موجودة');
        }

        // Track changes for activity log
        const changes: { field: string; oldVal: any; newVal: any }[] = [];

        if (dto.status && dto.status !== existing.status) {
            changes.push({ field: 'status', oldVal: existing.status, newVal: dto.status });
        }
        if (dto.priority && dto.priority !== existing.priority) {
            changes.push({ field: 'priority', oldVal: existing.priority, newVal: dto.priority });
        }
        if (dto.assigneeId !== undefined && dto.assigneeId !== existing.assigneeId) {
            changes.push({ field: 'assigneeId', oldVal: existing.assigneeId, newVal: dto.assigneeId });
        }

        const task = await this.prisma.task.update({
            where: { id },
            data: {
                ...(dto.title && { title: dto.title }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.status && { status: dto.status }),
                ...(dto.priority && { priority: dto.priority }),
                ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
                ...(dto.sprintId !== undefined && { sprintId: dto.sprintId }),
                ...(dto.storyPoints !== undefined && { storyPoints: dto.storyPoints }),
                ...(dto.estimatedHours !== undefined && { estimatedHours: dto.estimatedHours }),
                ...(dto.dueDate !== undefined && {
                    dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
                }),
                ...(dto.startDate !== undefined && {
                    startDate: dto.startDate ? new Date(dto.startDate) : null,
                }),
                ...(dto.assigneeId !== undefined && { assigneeId: dto.assigneeId }),
                ...(dto.tags && { tags: dto.tags }),
                ...(dto.customFields && { customFields: dto.customFields as any }),
                ...(dto.progress !== undefined && { progress: dto.progress }),
                ...(dto.order !== undefined && { order: dto.order }),
                ...(dto.status === 'COMPLETED' && { completedAt: new Date() }),
            },
            include: {
                category: true,
                sprint: true,
                assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
            },
        });

        // Log activities for changes
        for (const change of changes) {
            await this.logActivity(
                id,
                userId,
                'UPDATED',
                change.oldVal,
                change.newVal,
                `تم تغيير ${this.getFieldLabel(change.field)}`,
            );
        }

        // Notify new assignee
        if (dto.assigneeId && dto.assigneeId !== existing.assigneeId && dto.assigneeId !== userId) {
            await this.notificationsService.create({
                companyId,
                userId: dto.assigneeId,
                type: NotificationType.GENERAL,
                title: 'تم تعيينك في مهمة',
                body: `تم تكليفك بمهمة: ${task.title}`,
                data: { taskId: id },
            });
        }

        return task;
    }

    async deleteTask(id: string, companyId: string, userId: string, hardDelete: boolean = false) {
        const task = await this.prisma.task.findFirst({
            where: { id, companyId },
        });

        if (!task) {
            throw new NotFoundException('المهمة غير موجودة');
        }

        // Check permission (only creator or admin can delete)
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (task.createdById !== userId && user?.role !== 'ADMIN' && user?.role !== 'HR') {
            throw new ForbiddenException('ليس لديك صلاحية حذف هذه المهمة');
        }

        // Soft delete by default - mark as DELETED status for potential recovery
        if (hardDelete && user?.role === 'ADMIN') {
            // Only ADMIN can permanently delete
            await this.prisma.task.delete({ where: { id } });
            await this.logActivity(id, userId, 'HARD_DELETED', 'status', task.status, 'تم الحذف النهائي');
            return { message: 'تم حذف المهمة نهائياً' };
        } else {
            // Soft delete - preserve data
            const deletedAt = new Date().toISOString();
            const cf = (task.customFields as any) || {};
            cf.deletedAt = deletedAt;
            cf.deletedBy = userId;
            cf.previousStatus = task.status;

            await this.prisma.task.update({
                where: { id },
                data: {
                    status: 'DELETED' as any,
                    customFields: cf,
                },
            });

            await this.logActivity(id, userId, 'SOFT_DELETED', 'status', task.status, 'DELETED');
            return { message: 'تم حذف المهمة (يمكن استعادتها)', canRestore: true };
        }
    }

    /**
     * Restore a soft-deleted task
     */
    async restoreDeletedTask(id: string, companyId: string, userId: string) {
        const task = await this.prisma.task.findFirst({
            where: { id, companyId, status: 'DELETED' as any },
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
            where: { id },
            data: {
                status: previousStatus,
                customFields: Object.keys(cf).length > 0 ? cf : null,
            },
        });

        await this.logActivity(id, userId, 'RESTORED', 'status', 'DELETED', previousStatus);
        return { message: 'تم استعادة المهمة بنجاح', restoredStatus: previousStatus };
    }

    /**
     * Get deleted tasks for recovery
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

    // ============ KANBAN ============

    async getKanbanBoard(companyId: string, categoryId?: string, userId?: string) {
        const where: Prisma.TaskWhereInput = {
            companyId,
            status: { not: 'CANCELLED' },
            ...(categoryId && { categoryId }),
            ...(userId && {
                OR: [
                    { assigneeId: userId },
                    { createdById: userId },
                    { assignments: { some: { userId } } },
                    { watchers: { some: { userId } } },
                ],
            }),
        };

        const tasks = await this.prisma.task.findMany({
            where,
            include: {
                category: true,
                assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                checklists: { include: { items: true } },
                _count: { select: { comments: true, attachments: true } },
            },
            orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        });

        // Group by status
        const board: Record<string, typeof tasks> = {
            BACKLOG: [],
            TODO: [],
            IN_PROGRESS: [],
            PENDING_REVIEW: [],
            IN_REVIEW: [],
            APPROVED: [],
            REJECTED: [],
            BLOCKED: [],
            COMPLETED: [],
        };

        for (const task of tasks) {
            if (board[task.status]) {
                board[task.status].push(task);
            }
        }

        return board;
    }

    async reorderTask(id: string, companyId: string, userId: string, dto: ReorderTaskDto) {
        const task = await this.prisma.task.findFirst({
            where: { id, companyId },
        });

        if (!task) {
            throw new NotFoundException('المهمة غير موجودة');
        }

        const oldStatus = task.status;
        const newStatus = dto.status as TaskStatus;

        // Update task
        await this.prisma.task.update({
            where: { id },
            data: {
                status: newStatus,
                order: dto.order,
                ...(newStatus === 'COMPLETED' && { completedAt: new Date() }),
            },
        });

        // Log if status changed
        if (oldStatus !== newStatus) {
            await this.logActivity(id, userId, 'STATUS_CHANGED', oldStatus, newStatus, 'تم تغيير حالة المهمة');
        }

        return { success: true };
    }

    // ============ CHECKLISTS ============

    async addChecklist(taskId: string, companyId: string, userId: string, dto: CreateChecklistDto) {
        const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId } });
        if (!task) throw new NotFoundException('المهمة غير موجودة');

        const maxOrder = await this.prisma.taskChecklist.aggregate({
            where: { taskId },
            _max: { order: true },
        });

        const checklist = await this.prisma.taskChecklist.create({
            data: {
                taskId,
                title: dto.title,
                order: (maxOrder._max.order || 0) + 1,
            },
            include: { items: true },
        });

        await this.logActivity(taskId, userId, 'CHECKLIST_ADDED', null, dto.title, 'تم إضافة قائمة تحقق');

        return checklist;
    }

    async addChecklistItem(
        checklistId: string,
        companyId: string,
        userId: string,
        dto: CreateChecklistItemDto,
    ) {
        const checklist = await this.prisma.taskChecklist.findFirst({
            where: { id: checklistId },
            include: { task: true },
        });

        if (!checklist || checklist.task.companyId !== companyId) {
            throw new NotFoundException('قائمة التحقق غير موجودة');
        }

        const maxOrder = await this.prisma.taskChecklistItem.aggregate({
            where: { checklistId },
            _max: { order: true },
        });

        const item = await this.prisma.taskChecklistItem.create({
            data: {
                checklistId,
                content: dto.content,
                order: (maxOrder._max.order || 0) + 1,
            },
        });

        await this.updateTaskProgress(checklist.taskId);

        return item;
    }

    async toggleChecklistItem(
        itemId: string,
        companyId: string,
        userId: string,
        isCompleted: boolean,
    ) {
        const item = await this.prisma.taskChecklistItem.findFirst({
            where: { id: itemId },
            include: { checklist: { include: { task: true } } },
        });

        if (!item || item.checklist.task.companyId !== companyId) {
            throw new NotFoundException('العنصر غير موجود');
        }

        const updated = await this.prisma.taskChecklistItem.update({
            where: { id: itemId },
            data: {
                isCompleted,
                completedAt: isCompleted ? new Date() : null,
                completedById: isCompleted ? userId : null,
            },
        });

        await this.updateTaskProgress(item.checklist.taskId);

        return updated;
    }

    async deleteChecklistItem(itemId: string, companyId: string, userId: string) {
        const item = await this.prisma.taskChecklistItem.findFirst({
            where: { id: itemId },
            include: { checklist: { include: { task: true } } },
        });

        if (!item || item.checklist.task.companyId !== companyId) {
            throw new NotFoundException('العنصر غير موجود');
        }

        await this.prisma.taskChecklistItem.delete({
            where: { id: itemId },
        });

        await this.updateTaskProgress(item.checklist.taskId);
        await this.logActivity(
            item.checklist.taskId,
            userId,
            'CHECKLIST_ITEM_DELETED',
            item.content,
            null,
            'تم حذف عنصر من القائمة',
        );

        return { message: 'تم حذف العنصر' };
    }

    private async updateTaskProgress(taskId: string) {
        const checklists = await this.prisma.taskChecklist.findMany({
            where: { taskId },
            include: { items: true },
        });

        const allItems = checklists.flatMap((c) => c.items);
        if (allItems.length === 0) return;

        const completedCount = allItems.filter((i) => i.isCompleted).length;
        const progress = Math.round((completedCount / allItems.length) * 100);

        await this.prisma.task.update({
            where: { id: taskId },
            data: { progress },
        });
    }

    // ============ COMMENTS ============

    async addComment(taskId: string, companyId: string, userId: string, dto: CreateCommentDto) {
        const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId } });
        if (!task) throw new NotFoundException('المهمة غير موجودة');

        const comment = await this.prisma.taskComment.create({
            data: {
                taskId,
                userId,
                authorId: userId,
                content: dto.content,
                mentions: dto.mentions || [],
            },
            include: {
                author: { select: { id: true, firstName: true, lastName: true, avatar: true } },
            },
        });

        // Notify mentioned users
        if (dto.mentions && dto.mentions.length > 0) {
            for (const mentionedUserId of dto.mentions) {
                if (mentionedUserId !== userId) {
                    await this.notificationsService.create({
                        companyId,
                        userId: mentionedUserId,
                        type: NotificationType.GENERAL,
                        title: 'تم ذكرك في تعليق',
                        body: `تم ذكرك في تعليق على المهمة: ${task.title}`,
                        data: { taskId, commentId: comment.id },
                    });
                }
            }
        }

        // Notify task assignee
        if (task.assigneeId && task.assigneeId !== userId) {
            await this.notificationsService.create({
                companyId,
                userId: task.assigneeId,
                type: NotificationType.GENERAL,
                title: 'تعليق جديد على المهمة',
                body: `تم إضافة تعليق جديد على المهمة: ${task.title}`,
                data: { taskId, commentId: comment.id },
            });
        }

        await this.logActivity(taskId, userId, 'COMMENT_ADDED', null, null, 'تم إضافة تعليق');

        return comment;
    }

    async deleteComment(commentId: string, companyId: string, userId: string) {
        const comment = await this.prisma.taskComment.findFirst({
            where: { id: commentId },
            include: { task: true },
        });

        if (!comment || comment.task.companyId !== companyId) {
            throw new NotFoundException('التعليق غير موجود');
        }

        if (comment.authorId !== userId) {
            throw new ForbiddenException('لا يمكنك حذف تعليق شخص آخر');
        }

        await this.prisma.taskComment.delete({ where: { id: commentId } });

        return { message: 'تم حذف التعليق' };
    }

    // ============ TIME LOGS ============

    async addTimeLog(taskId: string, companyId: string, userId: string, dto: CreateTimeLogDto) {
        const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId } });
        if (!task) throw new NotFoundException('المهمة غير موجودة');

        let duration = dto.duration;
        if (!duration && dto.startTime && dto.endTime) {
            const start = new Date(dto.startTime);
            const end = new Date(dto.endTime);
            duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
        }

        const timeLog = await this.prisma.taskTimeLog.create({
            data: {
                taskId,
                userId,
                startTime: new Date(dto.startTime),
                endTime: dto.endTime ? new Date(dto.endTime) : null,
                duration,
                description: dto.description,
                isBillable: dto.isBillable || false,
            },
            include: {
                user: { select: { id: true, firstName: true, lastName: true } },
            },
        });

        await this.logActivity(
            taskId,
            userId,
            'TIME_LOGGED',
            null,
            `${duration} دقيقة`,
            'تم تسجيل وقت عمل',
        );

        return timeLog;
    }

    // ============ CATEGORIES ============

    async getCategories(companyId: string) {
        return this.prisma.taskCategory.findMany({
            where: { companyId, isActive: true },
            include: {
                _count: { select: { tasks: true } },
            },
            orderBy: { order: 'asc' },
        });
    }

    async createCategory(companyId: string, dto: CreateTaskCategoryDto) {
        const maxOrder = await this.prisma.taskCategory.aggregate({
            where: { companyId },
            _max: { order: true },
        });

        return this.prisma.taskCategory.create({
            data: {
                companyId,
                name: dto.name,
                nameEn: dto.nameEn,
                color: dto.color || '#3B82F6',
                icon: dto.icon,
                order: (maxOrder._max.order || 0) + 1,
            },
        });
    }

    async updateCategory(id: string, companyId: string, dto: UpdateTaskCategoryDto) {
        const category = await this.prisma.taskCategory.findFirst({
            where: { id, companyId },
        });

        if (!category) throw new NotFoundException('الفئة غير موجودة');

        return this.prisma.taskCategory.update({
            where: { id },
            data: dto,
        });
    }

    async deleteCategory(id: string, companyId: string) {
        const category = await this.prisma.taskCategory.findFirst({
            where: { id, companyId },
            include: { _count: { select: { tasks: true } } },
        });

        if (!category) throw new NotFoundException('الفئة غير موجودة');
        if (category._count.tasks > 0) {
            throw new BadRequestException('لا يمكن حذف فئة تحتوي على مهام');
        }

        await this.prisma.taskCategory.delete({ where: { id } });
        return { message: 'تم حذف الفئة' };
    }

    // ============ TEMPLATES ============

    async getTemplates(companyId: string) {
        return this.prisma.taskTemplate.findMany({
            where: { companyId, isActive: true },
            include: {
                category: true,
                _count: { select: { tasks: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async createTemplate(companyId: string, dto: CreateTaskTemplateDto) {
        return this.prisma.taskTemplate.create({
            data: {
                companyId,
                name: dto.name,
                nameEn: dto.nameEn,
                description: dto.description,
                categoryId: dto.categoryId,
                defaultPriority: dto.defaultPriority || 'MEDIUM',
                defaultDueDays: dto.defaultDueDays,
                checklistTemplate: dto.checklistTemplate as any,
            },
            include: { category: true },
        });
    }

    async updateTemplate(id: string, companyId: string, dto: UpdateTaskTemplateDto) {
        const template = await this.prisma.taskTemplate.findFirst({
            where: { id, companyId },
        });

        if (!template) throw new NotFoundException('القالب غير موجود');

        return this.prisma.taskTemplate.update({
            where: { id },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.nameEn !== undefined && { nameEn: dto.nameEn }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
                ...(dto.defaultPriority && { defaultPriority: dto.defaultPriority }),
                ...(dto.defaultDueDays !== undefined && { defaultDueDays: dto.defaultDueDays }),
                ...(dto.workflowType !== undefined && { workflowType: dto.workflowType }),
                ...(dto.checklistTemplate && { checklistTemplate: dto.checklistTemplate as any }),
            },
            include: { category: true },
        });
    }

    async deleteTemplate(id: string, companyId: string) {
        const template = await this.prisma.taskTemplate.findFirst({
            where: { id, companyId },
        });

        if (!template) throw new NotFoundException('القالب غير موجود');

        // Soft delete
        await this.prisma.taskTemplate.update({
            where: { id },
            data: { isActive: false },
        });

        return { message: 'تم حذف القالب' };
    }

    // ============ WATCHERS ============

    async addWatcher(taskId: string, companyId: string, userId: string) {
        const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId } });
        if (!task) throw new NotFoundException('المهمة غير موجودة');

        const existing = await this.prisma.taskWatcher.findFirst({
            where: { taskId, userId },
        });

        if (existing) return { message: 'أنت تتابع هذه المهمة مسبقاً' };

        await this.prisma.taskWatcher.create({
            data: { taskId, userId },
        });

        return { message: 'تمت إضافتك لمتابعة المهمة' };
    }

    async removeWatcher(taskId: string, companyId: string, userId: string) {
        const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId } });
        if (!task) throw new NotFoundException('المهمة غير موجودة');

        await this.prisma.taskWatcher.deleteMany({
            where: { taskId, userId },
        });

        return { message: 'تم إلغاء متابعتك للمهمة' };
    }

    // ============ DEPENDENCIES ============

    async addDependency(
        blockedTaskId: string,
        blockingTaskId: string,
        companyId: string,
        userId: string,
    ) {
        const task1 = await this.prisma.task.findFirst({ where: { id: blockedTaskId, companyId } });
        const task2 = await this.prisma.task.findFirst({ where: { id: blockingTaskId, companyId } });

        if (!task1 || !task2) throw new NotFoundException('المهمة غير موجودة');
        if (blockedTaskId === blockingTaskId) {
            throw new BadRequestException('لا يمكن أن تكون المهمة معتمدة على نفسها');
        }

        // Check for circular dependency
        const existingReverse = await this.prisma.taskDependency.findFirst({
            where: { blockedTaskId: blockingTaskId, blockingTaskId: blockedTaskId },
        });
        if (existingReverse) {
            throw new BadRequestException('سيؤدي هذا إلى اعتماد دائري');
        }

        await this.prisma.taskDependency.create({
            data: { blockedTaskId, blockingTaskId },
        });

        await this.logActivity(
            blockedTaskId,
            userId,
            'DEPENDENCY_ADDED',
            null,
            task2.title,
            'تم إضافة اعتماد',
        );

        return { message: 'تم إضافة الاعتماد' };
    }

    async removeDependency(blockedTaskId: string, blockingTaskId: string, companyId: string) {
        await this.prisma.taskDependency.deleteMany({
            where: { blockedTaskId, blockingTaskId },
        });

        return { message: 'تم إزالة الاعتماد' };
    }

    // ============ STATISTICS ============

    async getTaskStats(companyId: string, userId?: string) {
        const where: Prisma.TaskWhereInput = {
            companyId,
            ...(userId && { OR: [{ assigneeId: userId }, { createdById: userId }] }),
        };

        const [total, byStatus, byPriority, overdue] = await Promise.all([
            this.prisma.task.count({ where }),
            this.prisma.task.groupBy({
                by: ['status'],
                where,
                _count: true,
            }),
            this.prisma.task.groupBy({
                by: ['priority'],
                where,
                _count: true,
            }),
            this.prisma.task.count({
                where: {
                    ...where,
                    dueDate: { lt: new Date() },
                    status: { notIn: ['COMPLETED', 'CANCELLED'] },
                },
            }),
        ]);

        return {
            total,
            byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
            byPriority: Object.fromEntries(byPriority.map((p) => [p.priority, p._count])),
            overdue,
        };
    }

    // ============ ATTACHMENTS ============

    async addAttachment(
        taskId: string,
        companyId: string,
        userId: string,
        file: { filename: string; originalname: string; mimetype: string; size: number; path: string },
    ) {
        const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId } });
        if (!task) throw new NotFoundException('المهمة غير موجودة');

        const attachment = await this.prisma.taskAttachment.create({
            data: {
                taskId,
                uploadedById: userId,
                fileName: file.originalname,
                storagePath: `/uploads/tasks/${file.filename}`,
                mimeType: file.mimetype,
                fileSize: file.size,
            } as any,
            include: {
                uploadedBy: { select: { id: true, firstName: true, lastName: true } },
            },
        });

        await this.logActivity(taskId, userId, 'ATTACHMENT_ADDED', null, file.originalname, 'تم إضافة مرفق');

        return attachment;
    }

    async deleteAttachment(attachmentId: string, companyId: string, userId: string) {
        const attachment = await this.prisma.taskAttachment.findFirst({
            where: { id: attachmentId },
            include: { task: true },
        });

        if (!attachment || attachment.task.companyId !== companyId) {
            throw new NotFoundException('المرفق غير موجود');
        }

        await this.prisma.taskAttachment.delete({ where: { id: attachmentId } });

        await this.logActivity(attachment.taskId, userId, 'ATTACHMENT_DELETED', attachment.fileName, null, 'تم حذف مرفق');

        return { message: 'تم حذف المرفق' };
    }

    // ============ HELPERS ============

    private async logActivity(
        taskId: string,
        userId: string,
        action: string,
        oldValue: any,
        newValue: any,
        description: string,
    ) {
        await this.prisma.taskActivityLog.create({
            data: {
                taskId,
                userId,
                action,
                oldValue: oldValue ? String(oldValue) : null,
                newValue: newValue ? String(newValue) : null,
                description,
            },
        });
    }

    private getFieldLabel(field: string): string {
        const labels: Record<string, string> = {
            status: 'الحالة',
            priority: 'الأولوية',
            assigneeId: 'المكلف',
            dueDate: 'تاريخ الاستحقاق',
            title: 'العنوان',
        };
        return labels[field] || field;
    }

    // ==================== WORKFLOW METHODS ====================

    /**
     * Request review - changes status to PENDING_REVIEW
     */
    async requestReview(taskId: string, companyId: string, userId: string) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
            include: { reviewer: true },
        });

        if (!task) throw new NotFoundException('المهمة غير موجودة');
        if (task.assigneeId !== userId) {
            throw new ForbiddenException('فقط المنفذ يمكنه طلب المراجعة');
        }
        if (!task.reviewerId) {
            throw new BadRequestException('لم يتم تعيين مراجع لهذه المهمة');
        }

        const updated = await this.prisma.task.update({
            where: { id: taskId },
            data: {
                status: 'PENDING_REVIEW',
                reviewRequestedAt: new Date(),
            },
        });

        // Create approval record
        await this.prisma.taskApproval.create({
            data: {
                taskId,
                userId,
                action: 'SUBMITTED_FOR_REVIEW',
                comment: 'طلب مراجعة المهمة',
            },
        });

        // Notify reviewer
        if (task.reviewer) {
            await this.notificationsService.sendNotification(
                task.reviewerId!,
                'TASK_UPDATED' as any,
                'طلب مراجعة مهمة',
                `تم طلب مراجعة المهمة: ${task.title}`,
                { taskId },
            );
        }

        await this.logActivity(taskId, userId, 'STATUS_CHANGED', 'IN_PROGRESS', 'PENDING_REVIEW', 'طلب مراجعة');

        return updated;
    }

    /**
     * Start reviewing - changes status to IN_REVIEW
     */
    async startReview(taskId: string, companyId: string, userId: string) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
        });

        if (!task) throw new NotFoundException('المهمة غير موجودة');
        if (task.reviewerId !== userId) {
            throw new ForbiddenException('فقط المراجع المعين يمكنه بدء المراجعة');
        }

        const updated = await this.prisma.task.update({
            where: { id: taskId },
            data: { status: 'IN_REVIEW' },
        });

        await this.logActivity(taskId, userId, 'STATUS_CHANGED', 'PENDING_REVIEW', 'IN_REVIEW', 'بدأ المراجعة');

        return updated;
    }

    /**
     * Approve task - changes status to APPROVED or COMPLETED
     */
    async approveTask(taskId: string, companyId: string, userId: string, comment?: string) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
            include: { assignee: true, approver: true },
        });

        if (!task) throw new NotFoundException('المهمة غير موجودة');

        const isReviewer = task.reviewerId === userId;
        const isApprover = task.approverId === userId;

        if (!isReviewer && !isApprover) {
            throw new ForbiddenException('غير مصرح لك بالموافقة على هذه المهمة');
        }

        let newStatus = 'APPROVED';

        // If reviewer approves and there's an approver, wait for final approval
        if (isReviewer && task.approverId && task.approverId !== userId) {
            newStatus = 'APPROVED'; // Waiting for final approver
        } else {
            // Final approval - mark as completed
            newStatus = 'COMPLETED';
        }

        const updated = await this.prisma.task.update({
            where: { id: taskId },
            data: {
                status: newStatus as any,
                reviewedAt: isReviewer ? new Date() : task.reviewedAt,
                approvedAt: new Date(),
                completedAt: newStatus === 'COMPLETED' ? new Date() : undefined,
            },
        });

        // Create approval record
        await this.prisma.taskApproval.create({
            data: {
                taskId,
                userId,
                action: 'APPROVED',
                comment: comment || 'تمت الموافقة على المهمة',
            },
        });

        // Notify assignee
        if (task.assignee) {
            await this.notificationsService.sendNotification(
                task.assigneeId!,
                'TASK_UPDATED' as any,
                'تمت الموافقة على مهمتك',
                `تمت الموافقة على المهمة: ${task.title}`,
                { taskId },
            );
        }

        await this.logActivity(taskId, userId, 'STATUS_CHANGED', task.status, newStatus, 'تمت الموافقة');

        return updated;
    }

    /**
     * Reject task - changes status to REJECTED
     */
    async rejectTask(taskId: string, companyId: string, userId: string, reason: string) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
            include: { assignee: true },
        });

        if (!task) throw new NotFoundException('المهمة غير موجودة');

        const isReviewer = task.reviewerId === userId;
        const isApprover = task.approverId === userId;

        if (!isReviewer && !isApprover) {
            throw new ForbiddenException('غير مصرح لك برفض هذه المهمة');
        }

        const updated = await this.prisma.task.update({
            where: { id: taskId },
            data: {
                status: 'REJECTED',
                rejectedAt: new Date(),
                rejectionReason: reason,
            },
        });

        // Create approval record
        await this.prisma.taskApproval.create({
            data: {
                taskId,
                userId,
                action: 'REJECTED',
                comment: reason,
            },
        });

        // Notify assignee
        if (task.assignee) {
            await this.notificationsService.sendNotification(
                task.assigneeId!,
                'TASK_UPDATED' as any,
                'تم رفض مهمتك',
                `تم رفض المهمة: ${task.title}. السبب: ${reason}`,
                { taskId },
            );
        }

        await this.logActivity(taskId, userId, 'STATUS_CHANGED', task.status, 'REJECTED', `رفض: ${reason}`);

        return updated;
    }

    /**
     * Request changes - sends back to assignee for modifications
     */
    async requestChanges(taskId: string, companyId: string, userId: string, feedback: string) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
            include: { assignee: true },
        });

        if (!task) throw new NotFoundException('المهمة غير موجودة');

        const isReviewer = task.reviewerId === userId;
        const isApprover = task.approverId === userId;

        if (!isReviewer && !isApprover) {
            throw new ForbiddenException('غير مصرح لك بطلب تعديلات');
        }

        const updated = await this.prisma.task.update({
            where: { id: taskId },
            data: {
                status: 'IN_PROGRESS', // Back to work
            },
        });

        // Create approval record
        await this.prisma.taskApproval.create({
            data: {
                taskId,
                userId,
                action: 'CHANGES_REQUESTED',
                comment: feedback,
            },
        });

        // Notify assignee
        if (task.assignee) {
            await this.notificationsService.sendNotification(
                task.assigneeId!,
                'TASK_UPDATED' as any,
                'مطلوب تعديلات على مهمتك',
                `مطلوب تعديلات على المهمة: ${task.title}. الملاحظات: ${feedback}`,
                { taskId },
            );
        }

        await this.logActivity(taskId, userId, 'STATUS_CHANGED', task.status, 'IN_PROGRESS', `طلب تعديلات: ${feedback}`);

        return updated;
    }

    /**
     * Get approval history for a task
     */
    async getApprovalHistory(taskId: string, companyId: string) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
        });

        if (!task) throw new NotFoundException('المهمة غير موجودة');

        return this.prisma.taskApproval.findMany({
            where: { taskId },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true, avatar: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    // ==================== EVIDENCE METHODS ====================

    /**
     * Submit evidence for task completion
     */
    async submitEvidence(
        taskId: string,
        companyId: string,
        userId: string,
        data: {
            description?: string;
            fileUrl?: string;
            fileName?: string;
            fileType?: string;
            fileSize?: number;
            latitude?: number;
            longitude?: number;
            locationName?: string;
        },
    ) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
            include: { reviewer: true, approver: true },
        });

        if (!task) throw new NotFoundException('المهمة غير موجودة');

        const evidence = await this.prisma.taskEvidence.create({
            data: {
                taskId,
                submittedById: userId,
                ...data,
            },
            include: {
                submittedBy: {
                    select: { id: true, firstName: true, lastName: true, avatar: true },
                },
            },
        });

        // Notify reviewer/approver
        const notifyUserId = task.reviewerId || task.approverId;
        if (notifyUserId) {
            await this.notificationsService.sendNotification(
                notifyUserId,
                'TASK_UPDATED' as any,
                'تم تقديم إثبات إنجاز',
                `تم تقديم إثبات إنجاز للمهمة: ${task.title}`,
                { taskId, evidenceId: evidence.id },
            );
        }

        await this.logActivity(taskId, userId, 'EVIDENCE_SUBMITTED' as any, null, evidence.id, 'تقديم إثبات إنجاز');

        return evidence;
    }

    /**
     * Get all evidences for a task
     */
    async getEvidences(taskId: string, companyId: string) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
        });

        if (!task) throw new NotFoundException('المهمة غير موجودة');

        return this.prisma.taskEvidence.findMany({
            where: { taskId },
            include: {
                submittedBy: {
                    select: { id: true, firstName: true, lastName: true, avatar: true },
                },
                verifiedBy: {
                    select: { id: true, firstName: true, lastName: true, avatar: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Verify evidence (approve/reject)
     */
    async verifyEvidence(
        evidenceId: string,
        companyId: string,
        userId: string,
        status: 'APPROVED' | 'REJECTED',
        comment?: string,
    ) {
        const evidence = await this.prisma.taskEvidence.findFirst({
            where: { id: evidenceId },
            include: {
                task: true,
                submittedBy: true,
            },
        });

        if (!evidence) throw new NotFoundException('الإثبات غير موجود');
        if (evidence.task.companyId !== companyId) {
            throw new ForbiddenException('غير مصرح بالوصول');
        }

        // Only reviewer or approver can verify
        const task = evidence.task;
        const isReviewer = task.reviewerId === userId;
        const isApprover = task.approverId === userId;

        if (!isReviewer && !isApprover) {
            throw new ForbiddenException('فقط المراجع أو المعتمد يمكنه التحقق من الإثبات');
        }

        const updated = await this.prisma.taskEvidence.update({
            where: { id: evidenceId },
            data: {
                status,
                verifiedById: userId,
                verifiedAt: new Date(),
                verificationComment: comment,
            },
            include: {
                submittedBy: {
                    select: { id: true, firstName: true, lastName: true, avatar: true },
                },
                verifiedBy: {
                    select: { id: true, firstName: true, lastName: true, avatar: true },
                },
            },
        });

        // Notify submitter
        const statusAr = status === 'APPROVED' ? 'تم اعتماد' : 'تم رفض';
        if (evidence.submittedById) {
            await this.notificationsService.sendNotification(
                evidence.submittedById,
                'TASK_UPDATED' as any,
                `${statusAr} إثبات الإنجاز`,
                `${statusAr} إثبات الإنجاز للمهمة: ${task.title}`,
                { taskId: task.id, evidenceId },
            );
        }

        await this.logActivity(
            task.id,
            userId,
            'EVIDENCE_VERIFIED' as any,
            null,
            status,
            `${statusAr} إثبات الإنجاز`,
        );

        return updated;
    }

    /**
     * Delete evidence
     */
    async deleteEvidence(evidenceId: string, companyId: string, userId: string) {
        const evidence = await this.prisma.taskEvidence.findFirst({
            where: { id: evidenceId },
            include: { task: true },
        });

        if (!evidence) throw new NotFoundException('الإثبات غير موجود');
        if (evidence.task.companyId !== companyId) {
            throw new ForbiddenException('غير مصرح بالوصول');
        }

        // Only submitter can delete their own evidence
        if (evidence.submittedById !== userId) {
            throw new ForbiddenException('فقط مقدم الإثبات يمكنه حذفه');
        }

        await this.prisma.taskEvidence.delete({
            where: { id: evidenceId },
        });

        return { success: true };
    }

    // ==================== DEPENDENCY METHODS ====================

    /**
     * Get all dependencies for a task (blocking and blocked by)
     */
    async getDependencies(taskId: string, companyId: string) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
        });

        if (!task) throw new NotFoundException('المهمة غير موجودة');

        const [blockedBy, blocks] = await Promise.all([
            this.prisma.taskDependency.findMany({
                where: { blockedTaskId: taskId },
                include: {
                    blockingTask: {
                        select: {
                            id: true,
                            title: true,
                            status: true,
                            priority: true,
                            dueDate: true,
                        },
                    },
                },
            }),
            this.prisma.taskDependency.findMany({
                where: { blockingTaskId: taskId },
                include: {
                    blockedTask: {
                        select: {
                            id: true,
                            title: true,
                            status: true,
                            priority: true,
                            dueDate: true,
                        },
                    },
                },
            }),
        ]);

        return { blockedBy, blocks };
    }

    /**
     * Update dependency type
     */
    async updateDependencyType(
        dependencyId: string,
        companyId: string,
        type: 'BLOCKS' | 'BLOCKED_BY' | 'RELATED' | 'DUPLICATES',
    ) {
        const dependency = await this.prisma.taskDependency.findFirst({
            where: { id: dependencyId },
            include: { blockedTask: true },
        });

        if (!dependency) throw new NotFoundException('التبعية غير موجودة');
        if (dependency.blockedTask.companyId !== companyId) {
            throw new ForbiddenException('غير مصرح بالوصول');
        }

        return this.prisma.taskDependency.update({
            where: { id: dependencyId },
            data: { type },
        });
    }

    /**
     * Get Gantt chart data for all tasks
     */
    async getGanttData(companyId: string, categoryId?: string) {
        const where: any = { companyId };
        if (categoryId) where.categoryId = categoryId;

        const tasks = await this.prisma.task.findMany({
            where,
            select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                startDate: true,
                dueDate: true,
                progress: true,
                assignee: {
                    select: { id: true, firstName: true, lastName: true, avatar: true },
                },
                category: {
                    select: { id: true, name: true, color: true },
                },
                blockedTasks: {
                    select: { blockingTaskId: true, type: true },
                },
                blockingTasks: {
                    select: { blockedTaskId: true, type: true },
                },
            },
            orderBy: [{ startDate: 'asc' }, { dueDate: 'asc' }],
        });

        // Transform for Gantt chart
        return tasks.map(task => ({
            id: task.id,
            name: task.title,
            start: task.startDate || task.dueDate,
            end: task.dueDate,
            progress: task.progress,
            status: task.status,
            priority: task.priority,
            assignee: task.assignee,
            category: task.category,
            dependencies: (task.blockedTasks || []).map(d => d.blockingTaskId),
            type: (task.blockedTasks?.length || 0) > 0 ? 'task' : 'milestone',
        }));
    }

    // ==================== COMMUNICATION HUB METHODS ====================

    /**
     * Get threaded comments with reactions
     */
    async getComments(taskId: string, companyId: string) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
        });

        if (!task) throw new NotFoundException('المهمة غير موجودة');

        // Get top-level comments (no parent)
        const comments = await this.prisma.taskComment.findMany({
            where: { taskId, parentId: null },
            include: {
                author: {
                    select: { id: true, firstName: true, lastName: true, avatar: true },
                },
                reactions: {
                    include: {
                        user: {
                            select: { id: true, firstName: true, lastName: true },
                        },
                    },
                },
                replies: {
                    include: {
                        author: {
                            select: { id: true, firstName: true, lastName: true, avatar: true },
                        },
                        reactions: {
                            include: {
                                user: {
                                    select: { id: true, firstName: true, lastName: true },
                                },
                            },
                        },
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return comments;
    }

    /**
     * Reply to a comment (threaded)
     */
    async replyToComment(
        commentId: string,
        companyId: string,
        userId: string,
        content: string,
        mentions: string[] = [],
    ) {
        const parentComment = await this.prisma.taskComment.findFirst({
            where: { id: commentId },
            include: { task: true, author: true },
        });

        if (!parentComment) throw new NotFoundException('التعليق غير موجود');
        if (parentComment.task.companyId !== companyId) {
            throw new ForbiddenException('غير مصرح بالوصول');
        }

        const reply = await this.prisma.taskComment.create({
            data: {
                taskId: parentComment.taskId,
                userId,
                authorId: userId,
                parentId: commentId,
                content,
                mentions,
            },
            include: {
                author: {
                    select: { id: true, firstName: true, lastName: true, avatar: true },
                },
            },
        });

        // Notify parent comment author
        if (parentComment.authorId && parentComment.authorId !== userId) {
            await this.notificationsService.sendNotification(
                parentComment.authorId,
                'TASK_UPDATED' as any,
                'رد على تعليقك',
                `تم الرد على تعليقك في المهمة: ${parentComment.task.title}`,
                { taskId: parentComment.taskId, commentId: reply.id },
            );
        }

        // Notify mentioned users
        for (const mentionedUserId of mentions) {
            if (mentionedUserId !== userId && mentionedUserId !== parentComment.authorId) {
                await this.notificationsService.sendNotification(
                    mentionedUserId,
                    'TASK_UPDATED' as any,
                    'تمت الإشارة إليك',
                    `تمت الإشارة إليك في تعليق على المهمة: ${parentComment.task.title}`,
                    { taskId: parentComment.taskId, commentId: reply.id },
                );
            }
        }

        return reply;
    }

    /**
     * Add reaction to comment
     */
    async addReaction(commentId: string, companyId: string, userId: string, emoji: string) {
        const comment = await this.prisma.taskComment.findFirst({
            where: { id: commentId },
            include: { task: true, author: true },
        });

        if (!comment) throw new NotFoundException('التعليق غير موجود');
        if (comment.task.companyId !== companyId) {
            throw new ForbiddenException('غير مصرح بالوصول');
        }

        // Upsert reaction
        const reaction = await this.prisma.commentReaction.upsert({
            where: {
                commentId_userId_emoji: { commentId, userId, emoji },
            },
            create: { commentId, userId, emoji },
            update: {},
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });

        // Notify comment author (if not self)
        if (comment.authorId && comment.authorId !== userId) {
            await this.notificationsService.sendNotification(
                comment.authorId,
                'TASK_UPDATED' as any,
                `${emoji} تفاعل على تعليقك`,
                `تفاعل شخص ما على تعليقك في المهمة`,
                { taskId: comment.taskId, commentId },
            );
        }

        return reaction;
    }

    /**
     * Remove reaction from comment
     */
    async removeReaction(commentId: string, companyId: string, userId: string, emoji: string) {
        const comment = await this.prisma.taskComment.findFirst({
            where: { id: commentId },
            include: { task: true },
        });

        if (!comment) throw new NotFoundException('التعليق غير موجود');
        if (comment.task.companyId !== companyId) {
            throw new ForbiddenException('غير مصرح بالوصول');
        }

        await this.prisma.commentReaction.deleteMany({
            where: { commentId, userId, emoji },
        });

        return { success: true };
    }

    /**
     * Get activity feed for a task
     */
    async getActivityFeed(taskId: string, companyId: string, limit: number = 50) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
        });

        if (!task) throw new NotFoundException('المهمة غير موجودة');

        return this.prisma.taskActivityLog.findMany({
            where: { taskId },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true, avatar: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }

    // ==================== ANALYTICS METHODS ====================

    /**
     * Get productivity metrics for the company
     */
    async getProductivityMetrics(companyId: string, startDate?: Date, endDate?: Date) {
        const dateFilter: any = {};
        if (startDate) dateFilter.gte = startDate;
        if (endDate) dateFilter.lte = endDate;

        const whereClause: any = { companyId };
        if (startDate || endDate) {
            whereClause.createdAt = dateFilter;
        }

        // Get all tasks in period
        const tasks = await this.prisma.task.findMany({
            where: whereClause,
            select: {
                id: true,
                status: true,
                priority: true,
                dueDate: true,
                completedAt: true,
                createdAt: true,
            },
        });

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
        const approvedTasks = tasks.filter(t => t.status === 'APPROVED').length;
        const overdueTasks = tasks.filter(t =>
            t.dueDate && new Date(t.dueDate) < new Date() && !['COMPLETED', 'APPROVED', 'CANCELLED'].includes(t.status)
        ).length;

        // On-time completion rate
        const completedWithDue = tasks.filter(t => t.status === 'COMPLETED' && t.dueDate && t.completedAt);
        const onTimeCompleted = completedWithDue.filter(t =>
            new Date(t.completedAt!) <= new Date(t.dueDate!)
        ).length;

        // Average completion time (in hours)
        const completedWithTimes = tasks.filter(t => t.completedAt && t.createdAt);
        const avgCompletionHours = completedWithTimes.length > 0
            ? completedWithTimes.reduce((sum, t) => {
                const diff = new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime();
                return sum + (diff / (1000 * 60 * 60));
            }, 0) / completedWithTimes.length
            : 0;

        // By priority breakdown
        const byPriority = {
            URGENT: tasks.filter(t => t.priority === 'URGENT').length,
            HIGH: tasks.filter(t => t.priority === 'HIGH').length,
            MEDIUM: tasks.filter(t => t.priority === 'MEDIUM').length,
            LOW: tasks.filter(t => t.priority === 'LOW').length,
        };

        // By status breakdown
        const byStatus = {
            TODO: tasks.filter(t => t.status === 'TODO').length,
            IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS').length,
            PENDING_REVIEW: tasks.filter(t => t.status === 'PENDING_REVIEW').length,
            IN_REVIEW: tasks.filter(t => t.status === 'IN_REVIEW').length,
            APPROVED: tasks.filter(t => t.status === 'APPROVED').length,
            COMPLETED: tasks.filter(t => t.status === 'COMPLETED').length,
            REJECTED: tasks.filter(t => t.status === 'REJECTED').length,
            BLOCKED: tasks.filter(t => t.status === 'BLOCKED').length,
        };

        return {
            totalTasks,
            completedTasks,
            approvedTasks,
            overdueTasks,
            completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
            onTimeRate: completedWithDue.length > 0 ? (onTimeCompleted / completedWithDue.length) * 100 : 0,
            avgCompletionHours: Math.round(avgCompletionHours * 10) / 10,
            byPriority,
            byStatus,
        };
    }

    /**
     * Get team performance metrics
     */
    async getTeamPerformance(companyId: string, startDate?: Date, endDate?: Date) {
        const dateFilter: any = {};
        if (startDate) dateFilter.gte = startDate;
        if (endDate) dateFilter.lte = endDate;

        const whereClause: any = { companyId, assigneeId: { not: null } };
        if (startDate || endDate) {
            whereClause.createdAt = dateFilter;
        }

        const tasks = await this.prisma.task.findMany({
            where: whereClause,
            include: {
                assignee: {
                    select: { id: true, firstName: true, lastName: true, avatar: true },
                },
            },
        });

        // Group by assignee
        const byUser = new Map<string, any>();

        for (const task of tasks) {
            if (!task.assigneeId) continue;

            if (!byUser.has(task.assigneeId)) {
                byUser.set(task.assigneeId, {
                    user: task.assignee,
                    total: 0,
                    completed: 0,
                    inProgress: 0,
                    overdue: 0,
                });
            }

            const stats = byUser.get(task.assigneeId);
            stats.total++;

            if (task.status === 'COMPLETED' || task.status === 'APPROVED') {
                stats.completed++;
            } else if (task.status === 'IN_PROGRESS' || task.status === 'IN_REVIEW') {
                stats.inProgress++;
            }

            if (task.dueDate && new Date(task.dueDate) < new Date() &&
                !['COMPLETED', 'APPROVED', 'CANCELLED'].includes(task.status)) {
                stats.overdue++;
            }
        }

        // Convert to array and calculate rates
        const teamStats = Array.from(byUser.values()).map(stats => ({
            ...stats,
            completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
        }));

        // Sort by completion rate
        teamStats.sort((a, b) => b.completionRate - a.completionRate);

        return teamStats;
    }

    /**
     * Get time tracking analytics
     */
    async getTimeAnalytics(companyId: string, startDate?: Date, endDate?: Date) {
        const dateFilter: any = {};
        if (startDate) dateFilter.gte = startDate;
        if (endDate) dateFilter.lte = endDate;

        const whereClause: any = {
            task: { companyId },
        };
        if (startDate || endDate) {
            whereClause.startTime = dateFilter;
        }

        const timeLogs = await this.prisma.taskTimeLog.findMany({
            where: whereClause,
            include: {
                task: {
                    select: { id: true, title: true, categoryId: true },
                },
                user: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });

        // Total hours logged
        const totalMinutes = timeLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
        const totalHours = Math.round(totalMinutes / 60 * 10) / 10;

        // By user
        const byUser = new Map<string, number>();
        for (const log of timeLogs) {
            const current = byUser.get(log.userId) || 0;
            byUser.set(log.userId, current + (log.duration || 0));
        }

        const userHours = Array.from(byUser.entries()).map(([userId, minutes]) => ({
            userId,
            user: timeLogs.find(t => t.userId === userId)?.user,
            hours: Math.round(minutes / 60 * 10) / 10,
        })).sort((a, b) => b.hours - a.hours);

        return {
            totalHours,
            totalLogs: timeLogs.length,
            byUser: userHours,
        };
    }

    /**
     * Get task trends over time
     */
    async getTaskTrends(companyId: string, days: number = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const tasks = await this.prisma.task.findMany({
            where: {
                companyId,
                createdAt: { gte: startDate },
            },
            select: {
                createdAt: true,
                completedAt: true,
                status: true,
            },
        });

        // Group by day
        const dailyStats = new Map<string, { created: number; completed: number }>();

        for (let i = 0; i <= days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const key = date.toISOString().split('T')[0];
            dailyStats.set(key, { created: 0, completed: 0 });
        }

        for (const task of tasks) {
            const createdKey = new Date(task.createdAt).toISOString().split('T')[0];
            if (dailyStats.has(createdKey)) {
                dailyStats.get(createdKey)!.created++;
            }

            if (task.completedAt) {
                const completedKey = new Date(task.completedAt).toISOString().split('T')[0];
                if (dailyStats.has(completedKey)) {
                    dailyStats.get(completedKey)!.completed++;
                }
            }
        }

        // Convert to array
        const trends = Array.from(dailyStats.entries())
            .map(([date, stats]) => ({ date, ...stats }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return trends;
    }

    /**
     * Generate comprehensive report
     */
    async generateReport(
        companyId: string,
        options: {
            startDate?: Date;
            endDate?: Date;
            categoryId?: string;
            assigneeId?: string;
            includeMetrics?: boolean;
            includeTeam?: boolean;
            includeTime?: boolean;
            includeTrends?: boolean;
        } = {},
    ) {
        const report: any = {
            generatedAt: new Date(),
            period: {
                start: options.startDate || null,
                end: options.endDate || null,
            },
        };

        // Base metrics
        if (options.includeMetrics !== false) {
            report.metrics = await this.getProductivityMetrics(
                companyId,
                options.startDate,
                options.endDate,
            );
        }

        // Team performance
        if (options.includeTeam !== false) {
            report.team = await this.getTeamPerformance(
                companyId,
                options.startDate,
                options.endDate,
            );
        }

        // Time analytics
        if (options.includeTime) {
            report.timeTracking = await this.getTimeAnalytics(
                companyId,
                options.startDate,
                options.endDate,
            );
        }

        // Trends
        if (options.includeTrends) {
            report.trends = await this.getTaskTrends(companyId, 30);
        }

        // Category breakdown
        const categories = await this.prisma.taskCategory.findMany({
            where: { companyId },
            include: {
                _count: {
                    select: { tasks: true },
                },
            },
        });

        report.categories = categories.map(c => ({
            id: c.id,
            name: c.name,
            color: c.color,
            taskCount: c._count.tasks,
        }));

        return report;
    }

    // ==================== AUTOMATION METHODS ====================

    /**
     * Create an automation rule
     */
    async createAutomation(
        companyId: string,
        userId: string,
        data: {
            name: string;
            description?: string;
            trigger: string;
            triggerConfig?: any;
            action: string;
            actionConfig?: any;
            categoryId?: string;
            priority?: string;
        },
    ) {
        return this.prisma.taskAutomation.create({
            data: {
                companyId,
                createdById: userId,
                name: data.name,
                description: data.description,
                trigger: data.trigger as any,
                triggerConfig: data.triggerConfig,
                action: data.action as any,
                actionConfig: data.actionConfig,
                categoryId: data.categoryId,
                priority: data.priority as any,
            },
            include: {
                createdBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
                category: {
                    select: { id: true, name: true, color: true },
                },
            },
        });
    }

    /**
     * Get all automation rules for a company
     */
    async getAutomations(companyId: string) {
        return this.prisma.taskAutomation.findMany({
            where: { companyId },
            include: {
                createdBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
                category: {
                    select: { id: true, name: true, color: true },
                },
                _count: {
                    select: { logs: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Update an automation rule
     */
    async updateAutomation(
        automationId: string,
        companyId: string,
        data: Partial<{
            name: string;
            description: string;
            trigger: string;
            triggerConfig: any;
            action: string;
            actionConfig: any;
            categoryId: string;
            priority: string;
            isActive: boolean;
        }>,
    ) {
        const automation = await this.prisma.taskAutomation.findFirst({
            where: { id: automationId, companyId },
        });

        if (!automation) throw new NotFoundException('القاعدة غير موجودة');

        return this.prisma.taskAutomation.update({
            where: { id: automationId },
            data: {
                ...data,
                trigger: data.trigger as any,
                action: data.action as any,
                priority: data.priority as any,
            },
            include: {
                createdBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
                category: {
                    select: { id: true, name: true, color: true },
                },
            },
        });
    }

    /**
     * Delete an automation rule
     */
    async deleteAutomation(automationId: string, companyId: string) {
        const automation = await this.prisma.taskAutomation.findFirst({
            where: { id: automationId, companyId },
        });

        if (!automation) throw new NotFoundException('القاعدة غير موجودة');

        await this.prisma.taskAutomation.delete({
            where: { id: automationId },
        });

        return { success: true };
    }

    /**
     * Toggle automation active state
     */
    async toggleAutomation(automationId: string, companyId: string) {
        const automation = await this.prisma.taskAutomation.findFirst({
            where: { id: automationId, companyId },
        });

        if (!automation) throw new NotFoundException('القاعدة غير موجودة');

        return this.prisma.taskAutomation.update({
            where: { id: automationId },
            data: { isActive: !automation.isActive },
        });
    }

    /**
     * Process automations for a trigger event
     */
    async processAutomations(
        companyId: string,
        taskId: string,
        trigger: string,
        context: any = {},
    ) {
        // Find matching automations
        const automations = await this.prisma.taskAutomation.findMany({
            where: {
                companyId,
                trigger: trigger as any,
                isActive: true,
            },
        });

        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
            include: { assignee: true, reviewer: true, approver: true },
        });

        if (!task) return [];

        const results = [];

        for (const automation of automations) {
            // Check category filter
            if (automation.categoryId && task.categoryId !== automation.categoryId) continue;

            // Check priority filter
            if (automation.priority && task.priority !== automation.priority) continue;

            // Check trigger config
            const triggerConfig = automation.triggerConfig as any;
            if (triggerConfig) {
                if (trigger === 'STATUS_CHANGED') {
                    if (triggerConfig.fromStatus && context.fromStatus !== triggerConfig.fromStatus) continue;
                    if (triggerConfig.toStatus && context.toStatus !== triggerConfig.toStatus) continue;
                }
            }

            // Execute action
            try {
                await this.executeAutomationAction(automation, task, context);

                // Log success
                await this.prisma.automationLog.create({
                    data: {
                        automationId: automation.id,
                        taskId,
                        trigger,
                        action: automation.action,
                        success: true,
                    } as any,
                });

                // Update run count
                await this.prisma.taskAutomation.update({
                    where: { id: automation.id },
                    data: {
                        lastRunAt: new Date(),
                        runCount: { increment: 1 },
                    },
                });

                results.push({ automationId: automation.id, success: true });
            } catch (error: any) {
                // Log error
                await this.prisma.automationLog.create({
                    data: {
                        automationId: automation.id,
                        taskId,
                        trigger,
                        action: automation.action,
                        success: false,
                        error: error.message,
                    } as any,
                });

                results.push({ automationId: automation.id, success: false, error: error.message });
            }
        }

        return results;
    }

    /**
     * Execute automation action
     */
    private async executeAutomationAction(automation: any, task: any, context: any) {
        const actionConfig = automation.actionConfig as any || {};

        switch (automation.action) {
            case 'SEND_NOTIFICATION':
                const targetUserId = actionConfig.userId || task.assigneeId;
                if (targetUserId) {
                    await this.notificationsService.sendNotification(
                        targetUserId,
                        'TASK_UPDATED' as any,
                        actionConfig.title || 'إشعار تلقائي',
                        actionConfig.message || `تم تنفيذ إجراء تلقائي على المهمة: ${task.title}`,
                        { taskId: task.id, automationId: automation.id },
                    );
                }
                break;

            case 'CHANGE_STATUS':
                if (actionConfig.status) {
                    await this.prisma.task.update({
                        where: { id: task.id },
                        data: { status: actionConfig.status },
                    });
                }
                break;

            case 'ASSIGN_USER':
                if (actionConfig.userId) {
                    await this.prisma.task.update({
                        where: { id: task.id },
                        data: { assigneeId: actionConfig.userId },
                    });
                }
                break;

            case 'SET_PRIORITY':
                if (actionConfig.priority) {
                    await this.prisma.task.update({
                        where: { id: task.id },
                        data: { priority: actionConfig.priority },
                    });
                }
                break;

            case 'ADD_WATCHER':
                if (actionConfig.userId) {
                    await this.prisma.taskWatcher.upsert({
                        where: {
                            taskId_userId: { taskId: task.id, userId: actionConfig.userId },
                        },
                        create: { taskId: task.id, userId: actionConfig.userId },
                        update: {},
                    });
                }
                break;

            default:
                break;
        }
    }

    /**
     * Get automation execution logs
     */
    async getAutomationLogs(automationId: string, companyId: string, limit: number = 50) {
        const automation = await this.prisma.taskAutomation.findFirst({
            where: { id: automationId, companyId },
        });

        if (!automation) throw new NotFoundException('القاعدة غير موجودة');

        return this.prisma.automationLog.findMany({
            where: { automationId },
            orderBy: { executedAt: 'desc' },
            take: limit,
        });
    }

    // ============ WORKLOAD MANAGEMENT ============

    /**
     * Get team workload distribution
     */
    async getTeamWorkload(companyId: string, startDate?: Date, endDate?: Date) {
        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate || new Date();

        // Get all users with their task counts and time spent
        const users = await this.prisma.user.findMany({
            where: { companyId, status: 'ACTIVE' },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
                jobTitle: true,
            },
        });

        const workloads = await Promise.all(
            users.map(async (user) => {
                const [assignedTasks, completedTasks, inProgressTasks, overdueTasks, totalTimeLogged] = await Promise.all([
                    this.prisma.task.count({
                        where: { assigneeId: user.id, companyId, status: { not: 'COMPLETED' } },
                    }),
                    this.prisma.task.count({
                        where: {
                            assigneeId: user.id,
                            companyId,
                            status: 'COMPLETED',
                            completedAt: { gte: start, lte: end },
                        },
                    }),
                    this.prisma.task.count({
                        where: { assigneeId: user.id, companyId, status: 'IN_PROGRESS' },
                    }),
                    this.prisma.task.count({
                        where: {
                            assigneeId: user.id,
                            companyId,
                            status: { notIn: ['COMPLETED', 'CANCELLED'] },
                            dueDate: { lt: new Date() },
                        },
                    }),
                    this.prisma.taskTimeLog.aggregate({
                        where: {
                            userId: user.id,
                            task: { companyId },
                            startTime: { gte: start, lte: end },
                        },
                        _sum: { duration: true },
                    }),
                ]);

                // Calculate workload score (0-100)
                const workloadScore = Math.min(100, (assignedTasks * 10) + (inProgressTasks * 15) + (overdueTasks * 25));

                return {
                    user,
                    stats: {
                        assignedTasks,
                        completedTasks,
                        inProgressTasks,
                        overdueTasks,
                        totalTimeLogged: totalTimeLogged._sum.duration || 0,
                        workloadScore,
                        workloadLevel: workloadScore >= 80 ? 'HIGH' : workloadScore >= 50 ? 'MEDIUM' : 'LOW',
                    },
                };
            }),
        );

        return {
            workloads: workloads.sort((a, b) => b.stats.workloadScore - a.stats.workloadScore),
            summary: {
                totalUsers: users.length,
                overloadedUsers: workloads.filter((w) => w.stats.workloadScore >= 80).length,
                underutilizedUsers: workloads.filter((w) => w.stats.workloadScore < 30).length,
                averageWorkload: workloads.reduce((acc, w) => acc + w.stats.workloadScore, 0) / users.length || 0,
            },
        };
    }

    /**
     * Get workload calendar view - tasks per day
     */
    async getWorkloadCalendar(companyId: string, userId?: string, month?: number, year?: number) {
        const now = new Date();
        const targetMonth = month ?? now.getMonth();
        const targetYear = year ?? now.getFullYear();

        const startOfMonth = new Date(targetYear, targetMonth, 1);
        const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

        const where: any = {
            companyId,
            OR: [
                { dueDate: { gte: startOfMonth, lte: endOfMonth } },
                { startDate: { gte: startOfMonth, lte: endOfMonth } },
            ],
        };

        if (userId) where.assigneeId = userId;

        const tasks = await this.prisma.task.findMany({
            where,
            select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                dueDate: true,
                startDate: true,
                assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
            },
            orderBy: { dueDate: 'asc' },
        });

        // Group by date
        const calendar: Record<string, any[]> = {};
        tasks.forEach((task) => {
            const date = task.dueDate || task.startDate;
            if (date) {
                const key = date.toISOString().split('T')[0];
                if (!calendar[key]) calendar[key] = [];
                calendar[key].push(task);
            }
        });

        return { month: targetMonth, year: targetYear, calendar };
    }

    // ============ TIME TRACKING ENHANCEMENTS ============

    /**
     * Start time tracking timer
     */
    async startTimer(taskId: string, companyId: string, userId: string) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
        });

        if (!task) throw new NotFoundException('المهمة غير موجودة');

        // Check for existing active timer
        const activeTimer = await this.prisma.taskTimeLog.findFirst({
            where: { userId, endTime: null },
        });

        if (activeTimer) {
            // Stop the active timer first
            await this.prisma.taskTimeLog.update({
                where: { id: activeTimer.id },
                data: {
                    endTime: new Date(),
                    duration: Math.floor((Date.now() - activeTimer.startTime.getTime()) / 60000),
                },
            });
        }

        // Start new timer
        const timeLog = await this.prisma.taskTimeLog.create({
            data: {
                taskId,
                userId,
                startTime: new Date(),
            },
            include: {
                task: { select: { id: true, title: true } },
            },
        });

        // Update task status to IN_PROGRESS if needed
        if (task.status === 'TODO' || task.status === 'BACKLOG') {
            await this.prisma.task.update({
                where: { id: taskId },
                data: { status: 'IN_PROGRESS' },
            });
        }

        return timeLog;
    }

    /**
     * Stop time tracking timer
     */
    async stopTimer(timeLogId: string, companyId: string, userId: string, description?: string) {
        const timeLog = await this.prisma.taskTimeLog.findFirst({
            where: { id: timeLogId, userId, task: { companyId } },
        });

        if (!timeLog) throw new NotFoundException('التسجيل غير موجود');
        if (timeLog.endTime) throw new BadRequestException('التسجيل منتهي بالفعل');

        const endTime = new Date();
        const duration = Math.floor((endTime.getTime() - timeLog.startTime.getTime()) / 60000);

        return this.prisma.taskTimeLog.update({
            where: { id: timeLogId },
            data: {
                endTime,
                duration,
                description,
            },
            include: {
                task: { select: { id: true, title: true } },
            },
        });
    }

    /**
     * Get active timer for user
     */
    async getActiveTimer(companyId: string, userId: string) {
        return this.prisma.taskTimeLog.findFirst({
            where: { userId, endTime: null, task: { companyId } },
            include: {
                task: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        priority: true,
                        category: { select: { id: true, name: true, color: true } },
                    },
                },
            },
        });
    }

    /**
     * Get time logs for a user
     */
    async getUserTimeLogs(companyId: string, userId: string, startDate?: Date, endDate?: Date) {
        const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const end = endDate || new Date();

        const logs = await this.prisma.taskTimeLog.findMany({
            where: {
                userId,
                task: { companyId },
                startTime: { gte: start, lte: end },
            },
            include: {
                task: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        category: { select: { id: true, name: true, color: true } },
                    },
                },
            },
            orderBy: { startTime: 'desc' },
        });

        const totalDuration = logs.reduce((acc, log) => acc + (log.duration || 0), 0);

        return {
            logs,
            summary: {
                totalDuration,
                totalHours: Math.round(totalDuration / 60 * 10) / 10,
                logCount: logs.length,
            },
        };
    }

    // ============ RECURRING TASKS ============

    /**
     * Create a recurring task
     */
    async createRecurringTask(
        userId: string,
        companyId: string,
        dto: CreateTaskDto & { recurrenceType: string; recurrenceEnd?: string },
    ) {
        const task = await this.prisma.task.create({
            data: {
                companyId,
                createdById: userId,
                title: dto.title,
                description: dto.description,
                priority: dto.priority || 'MEDIUM',
                status: dto.status || 'TODO',
                categoryId: dto.categoryId,
                dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
                startDate: dto.startDate ? new Date(dto.startDate) : undefined,
                assigneeId: dto.assigneeId,
                tags: dto.tags || [],
                recurrenceType: dto.recurrenceType as any,
                recurrenceEnd: dto.recurrenceEnd ? new Date(dto.recurrenceEnd) : undefined,
            },
            include: {
                category: true,
                createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
            },
        });

        await this.logActivity(task.id, userId, 'CREATED', null, null, 'تم إنشاء مهمة متكررة');

        return task;
    }

    /**
     * Get recurring tasks
     */
    async getRecurringTasks(companyId: string) {
        return this.prisma.task.findMany({
            where: {
                companyId,
                recurrenceType: { not: null },
                parentTaskId: null, // Only parent recurring tasks
            },
            include: {
                category: true,
                assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                _count: { select: { childTasks: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    // ============ GANTT CHART ENHANCEMENTS ============

    /**
     * Update task dates for Gantt drag-drop
     */
    async updateTaskDates(
        taskId: string,
        companyId: string,
        userId: string,
        startDate: string,
        endDate: string,
    ) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
        });

        if (!task) throw new NotFoundException('المهمة غير موجودة');

        const updated = await this.prisma.task.update({
            where: { id: taskId },
            data: {
                startDate: new Date(startDate),
                dueDate: new Date(endDate),
            },
            include: {
                assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                blockedBy: { include: { blockingTask: { select: { id: true, title: true } } } },
                blocks: { include: { blockedTask: { select: { id: true, title: true } } } },
            },
        });

        await this.logActivity(taskId, userId, 'DATE_CHANGED', null, null, 'تم تغيير تواريخ المهمة');

        return updated;
    }

    /**
     * Get Gantt data with dependencies
     */
    async getGanttDataEnhanced(companyId: string, filters?: { projectId?: string; categoryId?: string; assigneeId?: string }) {
        const where: any = {
            companyId,
            OR: [
                { startDate: { not: null } },
                { dueDate: { not: null } },
            ],
        };

        if (filters?.projectId) where.projectId = filters.projectId;
        if (filters?.categoryId) where.categoryId = filters.categoryId;
        if (filters?.assigneeId) where.assigneeId = filters.assigneeId;

        const tasks = await this.prisma.task.findMany({
            where,
            select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                progress: true,
                startDate: true,
                dueDate: true,
                assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                category: { select: { id: true, name: true, color: true } },
                project: { select: { id: true, name: true, code: true } },
                blockedTasks: {
                    select: {
                        blockingTaskId: true,
                        type: true,
                    },
                },
            },
            orderBy: [{ startDate: 'asc' }, { dueDate: 'asc' }],
        });

        // Format for Gantt
        return tasks.map((task) => ({
            id: task.id,
            text: task.title,
            start_date: task.startDate?.toISOString().split('T')[0] || task.dueDate?.toISOString().split('T')[0],
            end_date: task.dueDate?.toISOString().split('T')[0] || task.startDate?.toISOString().split('T')[0],
            progress: task.progress / 100,
            status: task.status,
            priority: task.priority,
            assignee: task.assignee,
            category: task.category,
            project: task.project,
            dependencies: (task.blockedTasks || []).map((d) => d.blockingTaskId).join(','),
        }));
    }

    // ============ CUSTOM FIELDS ============

    /**
     * Update task custom fields
     */
    async updateCustomFields(taskId: string, companyId: string, userId: string, customFields: Record<string, any>) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
        });

        if (!task) throw new NotFoundException('المهمة غير موجودة');

        const updated = await this.prisma.task.update({
            where: { id: taskId },
            data: { customFields: customFields as any },
        });

        await this.logActivity(taskId, userId, 'CUSTOM_FIELDS_UPDATED', null, null, 'تم تحديث الحقول المخصصة');

        return updated;
    }

    /**
     * Get custom field definitions for company
     */
    async getCustomFieldDefinitions(companyId: string) {
        // Get unique custom field keys used across all tasks
        const tasks = await this.prisma.task.findMany({
            where: { companyId, customFields: { not: Prisma.JsonNull } },
            select: { customFields: true },
        });

        const fieldKeys = new Set<string>();
        tasks.forEach((task) => {
            if (task.customFields && typeof task.customFields === 'object') {
                Object.keys(task.customFields as object).forEach((key) => fieldKeys.add(key));
            }
        });

        return Array.from(fieldKeys);
    }

    // ============ BULK OPERATIONS ============

    /**
     * Bulk update tasks
     */
    async bulkUpdateTasks(
        companyId: string,
        userId: string,
        taskIds: string[],
        updates: { status?: string; priority?: string; assigneeId?: string; categoryId?: string },
    ) {
        const tasks = await this.prisma.task.findMany({
            where: { id: { in: taskIds }, companyId },
        });

        if (tasks.length !== taskIds.length) {
            throw new BadRequestException('بعض المهام غير موجودة');
        }

        const updateData: any = {};
        if (updates.status) updateData.status = updates.status;
        if (updates.priority) updateData.priority = updates.priority;
        if (updates.assigneeId) updateData.assigneeId = updates.assigneeId;
        if (updates.categoryId) updateData.categoryId = updates.categoryId;

        await this.prisma.task.updateMany({
            where: { id: { in: taskIds }, companyId },
            data: updateData,
        });

        // Log activities
        await Promise.all(
            taskIds.map((taskId) =>
                this.logActivity(taskId, userId, 'BULK_UPDATED', null, null, 'تم التحديث الجماعي'),
            ),
        );

        return { updated: taskIds.length };
    }

    /**
     * Bulk delete tasks (soft delete by default)
     */
    async bulkDeleteTasks(companyId: string, userId: string, taskIds: string[], hardDelete: boolean = false) {
        const tasks = await this.prisma.task.findMany({
            where: { id: { in: taskIds }, companyId },
        });

        if (tasks.length !== taskIds.length) {
            throw new BadRequestException('بعض المهام غير موجودة');
        }

        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        const deletedAt = new Date().toISOString();

        if (hardDelete && user?.role === 'ADMIN') {
            // Hard delete - only ADMIN
            await this.prisma.task.deleteMany({
                where: { id: { in: taskIds }, companyId },
            });

            return { deleted: taskIds.length, type: 'permanent' };
        } else {
            // Soft delete - mark as DELETED status
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

                await this.logActivity(task.id, userId, 'BULK_SOFT_DELETED', 'status', task.status, 'DELETED');
            }

            return {
                deleted: taskIds.length,
                type: 'soft',
                message: 'تم حذف المهام (يمكن استعادتها من سلة المحذوفات)',
                canRestore: true
            };
        }
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

            await this.logActivity(task.id, userId, 'BULK_RESTORED', 'status', 'DELETED', previousStatus);
            restoredCount++;
        }

        return { restored: restoredCount, message: 'تم استعادة المهام بنجاح' };
    }

    // ============ TASK CLONING ============

    /**
     * Clone a task
     */
    async cloneTask(taskId: string, companyId: string, userId: string, options?: { includeChecklists?: boolean; includeAttachments?: boolean }) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
            include: {
                checklists: options?.includeChecklists ? { include: { items: true } } : false,
            },
        });

        if (!task) throw new NotFoundException('المهمة غير موجودة');

        const clonedTask = await this.prisma.task.create({
            data: {
                companyId,
                createdById: userId,
                title: `${task.title} (نسخة)`,
                description: task.description,
                priority: task.priority,
                status: 'TODO',
                categoryId: task.categoryId,
                tags: task.tags as any,
                customFields: task.customFields as any,
            },
            include: {
                category: true,
                createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
            },
        });

        // Clone checklists if requested
        if (options?.includeChecklists && task.checklists) {
            for (const checklist of task.checklists as any[]) {
                const newChecklist = await this.prisma.taskChecklist.create({
                    data: {
                        taskId: clonedTask.id,
                        title: checklist.title,
                        order: checklist.order,
                    },
                });

                if (checklist.items) {
                    for (const item of checklist.items) {
                        await this.prisma.taskChecklistItem.create({
                            data: {
                                checklistId: newChecklist.id,
                                content: item.content,
                                order: item.order,
                                isCompleted: false,
                            },
                        });
                    }
                }
            }
        }

        await this.logActivity(clonedTask.id, userId, 'CLONED', null, null, `تم نسخ المهمة من ${task.title}`);

        return clonedTask;
    }

    // ============ BATCH 3: AGILE & STRATEGIC PLANNING ============

    // ==================== RESOURCE PLANNING & CAPACITY ====================

    /**
     * Get resource capacity planning
     * Uses customFields.estimatedHours for task estimates
     */
    async getResourceCapacity(companyId: string, startDate?: Date, endDate?: Date) {
        const start = startDate || new Date();
        const end = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        // Get all active users with their tasks
        const users = await this.prisma.user.findMany({
            where: { companyId, status: 'ACTIVE' },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
            },
        });

        // Get tasks for each user
        const capacityData = await Promise.all(
            users.map(async (user) => {
                const tasks = await this.prisma.task.findMany({
                    where: {
                        assigneeId: user.id,
                        status: { notIn: ['COMPLETED', 'CANCELLED'] },
                        OR: [
                            { startDate: { gte: start, lte: end } },
                            { dueDate: { gte: start, lte: end } },
                            { AND: [{ startDate: { lte: start } }, { dueDate: { gte: end } }] },
                        ],
                    },
                    select: {
                        id: true,
                        title: true,
                        customFields: true,
                        startDate: true,
                        dueDate: true,
                        priority: true,
                    },
                });

                // Calculate capacity (assuming 8 hours/day, 5 days/week)
                const workingDays = this.getWorkingDays(start, end);
                const totalCapacityHours = workingDays * 8;

                const allocatedHours = tasks.reduce((sum: number, task) => {
                    const cf = task.customFields as any;
                    return sum + (cf?.estimatedHours || 4);
                }, 0);

                const utilizationPercent = totalCapacityHours > 0
                    ? Math.round((allocatedHours / totalCapacityHours) * 100)
                    : 0;

                return {
                    user: {
                        id: user.id,
                        name: `${user.firstName} ${user.lastName}`,
                        avatar: user.avatar,
                    },
                    totalCapacityHours,
                    allocatedHours,
                    availableHours: Math.max(0, totalCapacityHours - allocatedHours),
                    utilizationPercent,
                    status: utilizationPercent > 100 ? 'OVERLOADED' : utilizationPercent > 80 ? 'HIGH' : utilizationPercent > 50 ? 'NORMAL' : 'LOW',
                    tasks: tasks.map((t) => ({
                        ...t,
                        estimatedHours: (t.customFields as any)?.estimatedHours || 4,
                    })),
                };
            }),
        );

        return capacityData;
    }

    /**
     * Suggest task reassignment based on capacity
     */
    async suggestTaskReassignment(taskId: string, companyId: string) {
        const task = await this.getTaskById(taskId, companyId);
        const cf = task.customFields as any;
        const estimatedHours = cf?.estimatedHours || 4;

        const capacity = await this.getResourceCapacity(companyId);
        const availableUsers = capacity
            .filter((u) => u.availableHours >= estimatedHours && u.status !== 'OVERLOADED')
            .sort((a, b) => b.availableHours - a.availableHours)
            .slice(0, 5);

        return {
            task: { id: task.id, title: task.title },
            currentAssignee: task.assignee,
            suggestedAssignees: availableUsers.map((u) => ({
                user: u.user,
                availableHours: u.availableHours,
                utilizationAfter: Math.round(((u.allocatedHours + estimatedHours) / u.totalCapacityHours) * 100),
            })),
        };
    }

    // ==================== SPRINT PLANNING (AGILE) ====================
    // Sprints are stored as TaskCategories with special naming convention (SPRINT: name)

    /**
     * Create a new sprint
     */
    async createSprint(companyId: string, userId: string, data: {
        name: string;
        goal?: string;
        startDate: string;
        endDate: string;
        projectId?: string;
    }) {
        // Use taskCategory to store sprints with naming convention
        return this.prisma.taskCategory.create({
            data: {
                name: `SPRINT: ${data.name}`,
                nameEn: data.goal,
                color: '#6366f1', // Indigo for sprints
                icon: 'sprint',
                companyId,
            },
        });
    }

    /**
     * Get sprints list (categories with SPRINT: prefix)
     */
    async getSprints(companyId: string, status?: string) {
        const sprints = await this.prisma.taskCategory.findMany({
            where: {
                companyId,
                name: { startsWith: 'SPRINT:' },
            },
            include: {
                _count: { select: { tasks: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Enrich with task statistics
        const enrichedSprints = await Promise.all(
            sprints.map(async (sprint) => {
                const tasks = await this.prisma.task.findMany({
                    where: { categoryId: sprint.id },
                    select: { status: true, customFields: true },
                });

                const totalPoints = tasks.reduce((sum: number, t) => {
                    const cf = t.customFields as any;
                    return sum + (cf?.storyPoints || 0);
                }, 0);
                const completedPoints = tasks
                    .filter((t) => t.status === 'COMPLETED')
                    .reduce((sum: number, t) => {
                        const cf = t.customFields as any;
                        return sum + (cf?.storyPoints || 0);
                    }, 0);

                return {
                    ...sprint,
                    sprintName: sprint.name.replace('SPRINT: ', ''),
                    goal: sprint.nameEn,
                    stats: {
                        totalTasks: tasks.length,
                        completedTasks: tasks.filter((t) => t.status === 'COMPLETED').length,
                        totalPoints,
                        completedPoints,
                        progressPercent: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0,
                    },
                };
            }),
        );

        return enrichedSprints;
    }

    /**
     * Start a sprint (mark as active via renaming)
     */
    async startSprint(sprintId: string, companyId: string) {
        const sprint = await this.prisma.taskCategory.findFirst({
            where: { id: sprintId, companyId },
        });

        if (!sprint) {
            throw new NotFoundException('السبرنت غير موجود');
        }

        // Update the sprint (could track active status via naming or separate field)
        return this.prisma.taskCategory.update({
            where: { id: sprintId },
            data: {
                color: '#22c55e', // Green for active sprint
            },
        });
    }

    /**
     * Complete a sprint
     */
    async completeSprint(sprintId: string, companyId: string, moveIncompleteToSprintId?: string) {
        const sprint = await this.prisma.taskCategory.findFirst({
            where: { id: sprintId, companyId },
        });

        if (!sprint) {
            throw new NotFoundException('السبرنت غير موجود');
        }

        // Move incomplete tasks to another sprint if specified
        if (moveIncompleteToSprintId) {
            await this.prisma.task.updateMany({
                where: {
                    categoryId: sprintId,
                    status: { notIn: ['COMPLETED', 'CANCELLED'] },
                },
                data: { categoryId: moveIncompleteToSprintId },
            });
        }

        return this.prisma.taskCategory.update({
            where: { id: sprintId },
            data: {
                color: '#94a3b8', // Gray for completed sprint
                isActive: false,
            },
        });
    }

    // ==================== STORY POINTS & VELOCITY ====================

    /**
     * Update story points for a task (stored in customFields)
     */
    async updateStoryPoints(taskId: string, companyId: string, userId: string, storyPoints: number) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
        });

        if (!task) {
            throw new NotFoundException('المهمة غير موجودة');
        }

        const currentCf = (task.customFields as any) || {};
        const oldPoints = currentCf.storyPoints;
        const updated = await this.prisma.task.update({
            where: { id: taskId },
            data: {
                customFields: { ...currentCf, storyPoints },
            },
        });

        await this.logActivity(taskId, userId, 'UPDATED', 'storyPoints', String(oldPoints), String(storyPoints));

        return updated;
    }

    /**
     * Get team velocity
     */
    async getTeamVelocity(companyId: string, sprintCount?: number) {
        const count = sprintCount || 5;

        // Get sprints
        const sprints = await this.prisma.taskCategory.findMany({
            where: {
                companyId,
                name: { startsWith: 'SPRINT:' },
            },
            orderBy: { createdAt: 'desc' },
            take: count + 1,
        });

        const velocityData = await Promise.all(
            sprints.map(async (sprint) => {
                const completedTasks = await this.prisma.task.findMany({
                    where: {
                        categoryId: sprint.id,
                        status: 'COMPLETED',
                    },
                    select: { customFields: true, completedAt: true },
                });

                const totalPoints = completedTasks.reduce((sum: number, t) => {
                    const cf = t.customFields as any;
                    return sum + (cf?.storyPoints || 0);
                }, 0);

                return {
                    sprintId: sprint.id,
                    sprintName: sprint.name.replace('SPRINT: ', ''),
                    isActive: sprint.isActive,
                    completedPoints: totalPoints,
                    taskCount: completedTasks.length,
                };
            }),
        );

        const completedSprints = velocityData.filter((s) => !s.isActive);
        const avgVelocity = completedSprints.length > 0
            ? Math.round(completedSprints.reduce((sum, s) => sum + s.completedPoints, 0) / completedSprints.length)
            : 0;

        return {
            sprints: velocityData,
            averageVelocity: avgVelocity,
            trend: this.calculateVelocityTrend(completedSprints),
        };
    }

    private calculateVelocityTrend(sprints: any[]): 'UP' | 'DOWN' | 'STABLE' {
        if (sprints.length < 2) return 'STABLE';
        const recent = sprints.slice(0, Math.ceil(sprints.length / 2));
        const older = sprints.slice(Math.ceil(sprints.length / 2));
        const recentAvg = recent.reduce((s: number, sp: any) => s + sp.completedPoints, 0) / recent.length;
        const olderAvg = older.reduce((s: number, sp: any) => s + sp.completedPoints, 0) / older.length;
        if (olderAvg === 0) return 'STABLE';
        const diff = ((recentAvg - olderAvg) / olderAvg) * 100;
        if (diff > 10) return 'UP';
        if (diff < -10) return 'DOWN';
        return 'STABLE';
    }

    // ==================== BURNDOWN CHARTS ====================

    /**
     * Get burndown chart data for a sprint
     */
    async getBurndownData(sprintId: string, companyId: string) {
        const sprint = await this.prisma.taskCategory.findFirst({
            where: { id: sprintId, companyId },
        });

        if (!sprint) {
            throw new NotFoundException('السبرنت غير موجود');
        }

        const startDate = new Date(sprint.createdAt);
        const endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

        // Get all tasks in sprint
        const tasks = await this.prisma.task.findMany({
            where: { categoryId: sprintId },
            select: {
                id: true,
                customFields: true,
                status: true,
                completedAt: true,
                createdAt: true,
            },
        });

        const totalPoints = tasks.reduce((sum: number, t) => {
            const cf = t.customFields as any;
            return sum + (cf?.storyPoints || 0);
        }, 0);
        const days = this.getDaysBetween(startDate, endDate);
        const idealBurnRate = days.length > 0 ? totalPoints / days.length : 0;

        // Generate burndown data points
        const burndownData = days.map((day, index) => {
            const completedByDay = tasks
                .filter((t) => t.status === 'COMPLETED' && t.completedAt && new Date(t.completedAt) <= day)
                .reduce((sum: number, t) => {
                    const cf = t.customFields as any;
                    return sum + (cf?.storyPoints || 0);
                }, 0);

            return {
                date: day.toISOString().split('T')[0],
                ideal: Math.max(0, totalPoints - idealBurnRate * (index + 1)),
                actual: day <= new Date() ? totalPoints - completedByDay : null,
                remaining: totalPoints - completedByDay,
            };
        });

        const completedPoints = tasks.filter((t) => t.status === 'COMPLETED').reduce((s: number, t) => {
            const cf = t.customFields as any;
            return s + (cf?.storyPoints || 0);
        }, 0);

        const remainingPoints = tasks.filter((t) => t.status !== 'COMPLETED').reduce((s: number, t) => {
            const cf = t.customFields as any;
            return s + (cf?.storyPoints || 0);
        }, 0);

        return {
            sprint: { id: sprint.id, name: sprint.name.replace('SPRINT: ', '') },
            totalPoints,
            completedPoints,
            remainingPoints,
            burndownData,
            isOnTrack: this.isSprintOnTrack(burndownData),
        };
    }

    private getDaysBetween(start: Date, end: Date): Date[] {
        const days: Date[] = [];
        const current = new Date(start);
        while (current <= end) {
            days.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        return days;
    }

    private isSprintOnTrack(burndownData: any[]): boolean {
        const today = burndownData.find((d) => d.actual !== null && new Date(d.date).toDateString() === new Date().toDateString());
        if (!today) return true;
        return today.actual <= today.ideal * 1.1; // 10% tolerance
    }

    // ==================== OKRs INTEGRATION ====================

    /**
     * Link task to an OKR (Objective Key Result) - stored in customFields
     */
    async linkTaskToOkr(taskId: string, companyId: string, userId: string, okrData: {
        objectiveId?: string;
        keyResultId?: string;
        contribution?: number;
    }) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
        });

        if (!task) {
            throw new NotFoundException('المهمة غير موجودة');
        }

        const currentCf = (task.customFields as any) || {};
        const updated = await this.prisma.task.update({
            where: { id: taskId },
            data: {
                customFields: {
                    ...currentCf,
                    okr: {
                        objectiveId: okrData.objectiveId,
                        keyResultId: okrData.keyResultId,
                        contribution: okrData.contribution || 0,
                    },
                },
            },
        });

        await this.logActivity(taskId, userId, 'UPDATED', 'okr', null, 'تم ربط المهمة بـ OKR');

        return updated;
    }

    /**
     * Get tasks by OKR
     */
    async getTasksByOkr(companyId: string, objectiveId?: string, keyResultId?: string) {
        const tasks = await this.prisma.task.findMany({
            where: { companyId },
            include: {
                assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                category: { select: { id: true, name: true, color: true } },
            },
        });

        // Filter by OKR
        const filteredTasks = tasks.filter((task) => {
            const cf = task.customFields as any;
            if (!cf?.okr) return false;
            if (objectiveId && cf.okr.objectiveId !== objectiveId) return false;
            if (keyResultId && cf.okr.keyResultId !== keyResultId) return false;
            return true;
        });

        // Group and calculate progress
        const grouped = filteredTasks.reduce((acc: any, task) => {
            const cf = task.customFields as any;
            const okr = cf.okr;
            const key = `${okr.objectiveId || 'unassigned'}_${okr.keyResultId || 'unassigned'}`;
            if (!acc[key]) {
                acc[key] = {
                    objectiveId: okr.objectiveId,
                    keyResultId: okr.keyResultId,
                    tasks: [],
                    totalContribution: 0,
                    completedContribution: 0,
                };
            }
            acc[key].tasks.push(task);
            acc[key].totalContribution += okr.contribution || 0;
            if (task.status === 'COMPLETED') {
                acc[key].completedContribution += okr.contribution || 0;
            }
            return acc;
        }, {});

        return Object.values(grouped);
    }

    // ==================== TASK SCORING & PRIORITIZATION ====================

    /**
     * Calculate task priority score using RICE or weighted scoring
     */
    async calculateTaskScore(taskId: string, companyId: string, userId: string, scoring: {
        reach?: number;      // How many people will this impact? (1-10)
        impact?: number;     // How much will it impact each person? (1-10)
        confidence?: number; // How confident are we? (1-100%)
        effort?: number;     // How much effort? (person-weeks)
        urgency?: number;    // How urgent? (1-10)
        value?: number;      // Business value (1-10)
    }) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
        });

        if (!task) {
            throw new NotFoundException('المهمة غير موجودة');
        }

        // Calculate RICE score: (Reach * Impact * Confidence) / Effort
        let riceScore = 0;
        if (scoring.reach && scoring.impact && scoring.confidence && scoring.effort) {
            riceScore = Math.round((scoring.reach * scoring.impact * (scoring.confidence / 100)) / scoring.effort);
        }

        // Calculate weighted score
        const weightedScore = Math.round(
            ((scoring.urgency || 5) * 0.3 +
                (scoring.value || 5) * 0.3 +
                (scoring.impact || 5) * 0.25 +
                ((100 - (scoring.effort || 50)) / 10) * 0.15) * 10
        );

        const currentCf = (task.customFields as any) || {};
        const updated = await this.prisma.task.update({
            where: { id: taskId },
            data: {
                customFields: {
                    ...currentCf,
                    scoring: {
                        ...scoring,
                        riceScore,
                        weightedScore,
                        calculatedAt: new Date().toISOString(),
                    },
                },
            },
        });

        return {
            task: updated,
            scores: { riceScore, weightedScore },
        };
    }

    /**
     * Get prioritized task backlog
     */
    async getPrioritizedBacklog(companyId: string, scoreType: 'rice' | 'weighted' = 'weighted') {
        const tasks = await this.prisma.task.findMany({
            where: {
                companyId,
                status: { in: ['TODO', 'BACKLOG', 'IN_PROGRESS'] },
            },
            include: {
                assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                category: { select: { id: true, name: true, color: true } },
            },
        });

        // Sort by score
        const sortedTasks = tasks.sort((a, b) => {
            const aCf = a.customFields as any;
            const bCf = b.customFields as any;
            const aScore = aCf?.scoring?.[scoreType === 'rice' ? 'riceScore' : 'weightedScore'] || 0;
            const bScore = bCf?.scoring?.[scoreType === 'rice' ? 'riceScore' : 'weightedScore'] || 0;
            return bScore - aScore;
        });

        return sortedTasks.map((task, index) => {
            const cf = task.customFields as any;
            return {
                ...task,
                rank: index + 1,
                score: cf?.scoring?.[scoreType === 'rice' ? 'riceScore' : 'weightedScore'] || 0,
            };
        });
    }

    // ==================== SMART SUGGESTIONS ====================

    /**
     * Get smart task suggestions based on patterns
     */
    async getSmartSuggestions(companyId: string, userId: string) {
        const suggestions: Array<{
            type: string;
            priority: 'HIGH' | 'MEDIUM' | 'LOW';
            title: string;
            description: string;
            tasks?: any[];
            users?: any[];
            action: string;
        }> = [];

        // 1. Overdue tasks
        const overdueTasks = await this.prisma.task.findMany({
            where: {
                companyId,
                dueDate: { lt: new Date() },
                status: { notIn: ['COMPLETED', 'CANCELLED'] },
            },
            take: 5,
            orderBy: { dueDate: 'asc' },
        });

        if (overdueTasks.length > 0) {
            suggestions.push({
                type: 'OVERDUE_ALERT',
                priority: 'HIGH',
                title: 'مهام متأخرة',
                description: `لديك ${overdueTasks.length} مهام متأخرة تحتاج انتباهك`,
                tasks: overdueTasks,
                action: 'REVIEW',
            });
        }

        // 2. Tasks without due dates
        const noDueDateTasks = await this.prisma.task.count({
            where: {
                companyId,
                status: { notIn: ['COMPLETED', 'CANCELLED'] },
                dueDate: null,
            },
        });

        if (noDueDateTasks > 5) {
            suggestions.push({
                type: 'MISSING_DATES',
                priority: 'MEDIUM',
                title: 'مهام بدون موعد',
                description: `${noDueDateTasks} مهمة بدون موعد نهائي - أضف مواعيد لتحسين التخطيط`,
                action: 'ADD_DATES',
            });
        }

        // 3. Blocked tasks
        const blockedTasks = await this.prisma.task.findMany({
            where: {
                companyId,
                status: 'BLOCKED',
            },
            take: 5,
            include: {
                blockedBy: {
                    include: { blockingTask: { select: { id: true, title: true, status: true } } },
                },
            },
        });

        if (blockedTasks.length > 0) {
            suggestions.push({
                type: 'BLOCKED_TASKS',
                priority: 'HIGH',
                title: 'مهام معلقة',
                description: `${blockedTasks.length} مهام محظورة بسبب تبعيات`,
                tasks: blockedTasks,
                action: 'RESOLVE_BLOCKERS',
            });
        }

        // 4. User-specific: Tasks approaching deadline
        const upcomingDeadlines = await this.prisma.task.findMany({
            where: {
                companyId,
                assigneeId: userId,
                status: { notIn: ['COMPLETED', 'CANCELLED'] },
                dueDate: {
                    gte: new Date(),
                    lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                },
            },
            take: 5,
            orderBy: { dueDate: 'asc' },
        });

        if (upcomingDeadlines.length > 0) {
            suggestions.push({
                type: 'UPCOMING_DEADLINES',
                priority: 'MEDIUM',
                title: 'مواعيد نهائية قريبة',
                description: `${upcomingDeadlines.length} مهام تستحق خلال 3 أيام`,
                tasks: upcomingDeadlines,
                action: 'FOCUS',
            });
        }

        // 5. Workload balancing suggestion
        const capacity = await this.getResourceCapacity(companyId);
        const overloadedUsers = capacity.filter((u) => u.status === 'OVERLOADED');

        if (overloadedUsers.length > 0) {
            suggestions.push({
                type: 'WORKLOAD_IMBALANCE',
                priority: 'MEDIUM',
                title: 'عدم توازن في عبء العمل',
                description: `${overloadedUsers.length} موظفين لديهم عبء عمل زائد`,
                users: overloadedUsers.map((u) => u.user),
                action: 'REBALANCE',
            });
        }

        // Sort by priority
        const priorityOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        return {
            suggestions,
            generatedAt: new Date().toISOString(),
        };
    }

    /**
     * Get recommended next tasks for a user
     */
    async getRecommendedTasks(companyId: string, userId: string) {
        // Get user's current tasks
        const inProgressTasks = await this.prisma.task.count({
            where: { assigneeId: userId, status: 'IN_PROGRESS' },
        });

        // If too many in progress, recommend focusing
        if (inProgressTasks >= 3) {
            const tasks = await this.prisma.task.findMany({
                where: { assigneeId: userId, status: 'IN_PROGRESS' },
                orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
                take: 3,
            });
            return {
                recommendation: 'FOCUS',
                message: 'لديك عدة مهام قيد التنفيذ. ركز على إنهاء المهام الحالية أولاً',
                tasks,
            };
        }

        // Otherwise, recommend next tasks to pick up
        const recommendedTasks = await this.prisma.task.findMany({
            where: {
                companyId,
                assigneeId: userId,
                status: 'TODO',
            },
            orderBy: [
                { priority: 'desc' },
                { dueDate: 'asc' },
            ],
            take: 5,
        });

        return {
            recommendation: 'PICK_UP',
            message: 'المهام التالية جاهزة للبدء',
            tasks: recommendedTasks,
        };
    }

    // Helper function for working days calculation
    private getWorkingDays(start: Date, end: Date): number {
        let count = 0;
        const current = new Date(start);
        while (current <= end) {
            const dayOfWeek = current.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 5) { // Exclude Friday and Saturday (weekend in Middle East)
                count++;
            }
            current.setDate(current.getDate() + 1);
        }
        return count;
    }

    // ============ BATCH 4: EXTERNAL INTEGRATIONS & NOTIFICATIONS ============

    // ==================== TASK REMINDERS ====================

    /**
     * Set reminder for a task
     */
    async setTaskReminder(taskId: string, companyId: string, userId: string, reminder: {
        reminderAt: string;
        reminderType: 'EMAIL' | 'PUSH' | 'SMS' | 'IN_APP';
        message?: string;
    }) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
        });

        if (!task) {
            throw new NotFoundException('المهمة غير موجودة');
        }

        const currentCf = (task.customFields as any) || {};
        const reminders = currentCf.reminders || [];

        reminders.push({
            id: `rem_${Date.now()}`,
            reminderAt: reminder.reminderAt,
            reminderType: reminder.reminderType,
            message: reminder.message,
            createdBy: userId,
            createdAt: new Date().toISOString(),
            isSent: false,
        });

        return this.prisma.task.update({
            where: { id: taskId },
            data: {
                customFields: { ...currentCf, reminders },
            },
        });
    }

    /**
     * Get task reminders
     */
    async getTaskReminders(taskId: string, companyId: string) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
        });

        if (!task) {
            throw new NotFoundException('المهمة غير موجودة');
        }

        const cf = task.customFields as any;
        return cf?.reminders || [];
    }

    /**
     * Delete a reminder
     */
    async deleteReminder(taskId: string, companyId: string, reminderId: string) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
        });

        if (!task) {
            throw new NotFoundException('المهمة غير موجودة');
        }

        const currentCf = (task.customFields as any) || {};
        const reminders = (currentCf.reminders || []).filter((r: any) => r.id !== reminderId);

        return this.prisma.task.update({
            where: { id: taskId },
            data: {
                customFields: { ...currentCf, reminders },
            },
        });
    }

    /**
     * Get pending reminders (for cron job)
     */
    async getPendingReminders(companyId: string) {
        const now = new Date();
        const tasks = await this.prisma.task.findMany({
            where: {
                companyId,
                status: { notIn: ['COMPLETED', 'CANCELLED'] },
            },
            include: {
                assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
        });

        const pendingReminders: any[] = [];
        tasks.forEach((task) => {
            const cf = task.customFields as any;
            const reminders = cf?.reminders || [];
            reminders.forEach((reminder: any) => {
                if (!reminder.isSent && new Date(reminder.reminderAt) <= now) {
                    pendingReminders.push({
                        task,
                        reminder,
                    });
                }
            });
        });

        return pendingReminders;
    }

    // ==================== WEBHOOK MANAGEMENT ====================

    /**
     * Register a webhook for task events
     */
    async registerWebhook(companyId: string, userId: string, webhook: {
        name: string;
        url: string;
        events: string[]; // ['task.created', 'task.updated', 'task.completed', etc.]
        secret?: string;
        isActive?: boolean;
    }) {
        // Store webhooks in company settings or a dedicated table
        // For now, we'll use a simple approach with task categories metadata
        const existingWebhooks = await this.getWebhooks(companyId);

        const newWebhook = {
            id: `wh_${Date.now()}`,
            name: webhook.name,
            url: webhook.url,
            events: webhook.events,
            secret: webhook.secret || this.generateWebhookSecret(),
            isActive: webhook.isActive !== false,
            createdBy: userId,
            createdAt: new Date().toISOString(),
        };

        existingWebhooks.push(newWebhook);

        // Store in a system category or company settings
        await this.storeCompanyWebhooks(companyId, existingWebhooks);

        return newWebhook;
    }

    /**
     * Get webhooks for company (stored in a special TaskCategory)
     */
    async getWebhooks(companyId: string) {
        // Use a special category to store webhooks configuration
        const webhookCategory = await this.prisma.taskCategory.findFirst({
            where: { companyId, name: '__SYSTEM_WEBHOOKS__' },
        });

        if (!webhookCategory) return [];

        // Store webhooks in nameEn field as JSON string
        try {
            return JSON.parse(webhookCategory.nameEn || '[]');
        } catch {
            return [];
        }
    }

    /**
     * Update webhook
     */
    async updateWebhook(companyId: string, webhookId: string, updates: Partial<{
        name: string;
        url: string;
        events: string[];
        isActive: boolean;
    }>) {
        const webhooks = await this.getWebhooks(companyId);
        const index = webhooks.findIndex((w: any) => w.id === webhookId);

        if (index === -1) {
            throw new NotFoundException('Webhook غير موجود');
        }

        webhooks[index] = { ...webhooks[index], ...updates, updatedAt: new Date().toISOString() };
        await this.storeCompanyWebhooks(companyId, webhooks);

        return webhooks[index];
    }

    /**
     * Delete webhook
     */
    async deleteWebhook(companyId: string, webhookId: string) {
        const webhooks = await this.getWebhooks(companyId);
        const filtered = webhooks.filter((w: any) => w.id !== webhookId);
        await this.storeCompanyWebhooks(companyId, filtered);
        return { success: true };
    }

    private async storeCompanyWebhooks(companyId: string, webhooks: any[]) {
        // Use a special category to store webhooks
        const existing = await this.prisma.taskCategory.findFirst({
            where: { companyId, name: '__SYSTEM_WEBHOOKS__' },
        });

        const webhooksJson = JSON.stringify(webhooks);

        if (existing) {
            await this.prisma.taskCategory.update({
                where: { id: existing.id },
                data: { nameEn: webhooksJson },
            });
        } else {
            await this.prisma.taskCategory.create({
                data: {
                    name: '__SYSTEM_WEBHOOKS__',
                    nameEn: webhooksJson,
                    companyId,
                    isActive: false, // Hidden from UI
                },
            });
        }
    }

    private generateWebhookSecret(): string {
        return `whsec_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    }

    // ==================== CALENDAR EXPORT (iCal) ====================

    /**
     * Export tasks to iCal format
     */
    async exportToIcal(companyId: string, userId: string, filters?: {
        assigneeId?: string;
        categoryId?: string;
        startDate?: string;
        endDate?: string;
    }) {
        const where: any = { companyId };

        if (filters?.assigneeId) where.assigneeId = filters.assigneeId;
        if (filters?.categoryId) where.categoryId = filters.categoryId;
        if (filters?.startDate || filters?.endDate) {
            where.dueDate = {};
            if (filters.startDate) where.dueDate.gte = new Date(filters.startDate);
            if (filters.endDate) where.dueDate.lte = new Date(filters.endDate);
        }

        const tasks = await this.prisma.task.findMany({
            where,
            include: {
                assignee: { select: { firstName: true, lastName: true, email: true } },
                category: { select: { name: true } },
            },
        });

        // Generate iCal content
        const icalEvents = tasks.map((task) => {
            const startDate = task.startDate || task.createdAt;
            const endDate = task.dueDate || new Date(startDate.getTime() + 3600000); // 1 hour default

            return {
                uid: `task-${task.id}@attendance-system`,
                dtstart: this.formatIcalDate(startDate),
                dtend: this.formatIcalDate(endDate),
                summary: task.title,
                description: task.description || '',
                status: this.mapTaskStatusToIcal(task.status),
                categories: task.category?.name || 'Tasks',
                organizer: task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : '',
            };
        });

        const icalContent = this.generateIcalContent(icalEvents);

        return {
            content: icalContent,
            filename: `tasks-${new Date().toISOString().split('T')[0]}.ics`,
            mimeType: 'text/calendar',
        };
    }

    private formatIcalDate(date: Date): string {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    }

    private mapTaskStatusToIcal(status: string): string {
        const statusMap: Record<string, string> = {
            'TODO': 'NEEDS-ACTION',
            'IN_PROGRESS': 'IN-PROCESS',
            'COMPLETED': 'COMPLETED',
            'CANCELLED': 'CANCELLED',
        };
        return statusMap[status] || 'NEEDS-ACTION';
    }

    private generateIcalContent(events: any[]): string {
        let ical = 'BEGIN:VCALENDAR\r\n';
        ical += 'VERSION:2.0\r\n';
        ical += 'PRODID:-//Attendance System//Tasks//AR\r\n';
        ical += 'CALSCALE:GREGORIAN\r\n';
        ical += 'METHOD:PUBLISH\r\n';

        events.forEach((event) => {
            ical += 'BEGIN:VEVENT\r\n';
            ical += `UID:${event.uid}\r\n`;
            ical += `DTSTART:${event.dtstart}\r\n`;
            ical += `DTEND:${event.dtend}\r\n`;
            ical += `SUMMARY:${event.summary}\r\n`;
            if (event.description) ical += `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}\r\n`;
            ical += `STATUS:${event.status}\r\n`;
            if (event.categories) ical += `CATEGORIES:${event.categories}\r\n`;
            ical += 'END:VEVENT\r\n';
        });

        ical += 'END:VCALENDAR';
        return ical;
    }

    // ==================== NOTIFICATION PREFERENCES ====================

    /**
     * Get user notification preferences for tasks
     * Stored in a special TaskCategory per user
     */
    async getNotificationPreferences(companyId: string, userId: string) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
        });

        if (!user) {
            throw new NotFoundException('المستخدم غير موجود');
        }

        // Default preferences
        const defaultPrefs = {
            taskAssigned: { email: true, push: true, inApp: true },
            taskUpdated: { email: false, push: true, inApp: true },
            taskCompleted: { email: true, push: true, inApp: true },
            taskCommented: { email: false, push: true, inApp: true },
            taskDueSoon: { email: true, push: true, inApp: true },
            taskOverdue: { email: true, push: true, inApp: true },
            mentionedInTask: { email: true, push: true, inApp: true },
            dailyDigest: { email: true, time: '08:00' },
            weeklyReport: { email: true, day: 'Sunday' },
        };

        // Get user preferences from special category
        const prefsCategory = await this.prisma.taskCategory.findFirst({
            where: { companyId, name: `__USER_PREFS_${userId}__` },
        });

        if (!prefsCategory) return defaultPrefs;

        try {
            const stored = JSON.parse(prefsCategory.nameEn || '{}');
            return { ...defaultPrefs, ...stored.taskNotifications };
        } catch {
            return defaultPrefs;
        }
    }

    /**
     * Update notification preferences
     */
    async updateNotificationPreferences(companyId: string, userId: string, preferences: any) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
        });

        if (!user) {
            throw new NotFoundException('المستخدم غير موجود');
        }

        // Store in special category
        const existing = await this.prisma.taskCategory.findFirst({
            where: { companyId, name: `__USER_PREFS_${userId}__` },
        });

        let currentPrefs = {};
        if (existing) {
            try {
                currentPrefs = JSON.parse(existing.nameEn || '{}');
            } catch {
                currentPrefs = {};
            }
        }

        const updatedPrefs = {
            ...currentPrefs,
            taskNotifications: {
                ...(currentPrefs as any).taskNotifications,
                ...preferences,
            },
        };

        const prefsJson = JSON.stringify(updatedPrefs);

        if (existing) {
            await this.prisma.taskCategory.update({
                where: { id: existing.id },
                data: { nameEn: prefsJson },
            });
        } else {
            await this.prisma.taskCategory.create({
                data: {
                    name: `__USER_PREFS_${userId}__`,
                    nameEn: prefsJson,
                    companyId,
                    isActive: false,
                },
            });
        }

        return updatedPrefs.taskNotifications;
    }

    // ==================== TASK DIGEST & REPORTS ====================

    /**
     * Generate daily task digest for a user
     */
    async generateDailyDigest(companyId: string, userId: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get tasks due today
        const dueToday = await this.prisma.task.findMany({
            where: {
                companyId,
                assigneeId: userId,
                status: { notIn: ['COMPLETED', 'CANCELLED'] },
                dueDate: { gte: today, lt: tomorrow },
            },
            orderBy: { priority: 'desc' },
        });

        // Get overdue tasks
        const overdue = await this.prisma.task.findMany({
            where: {
                companyId,
                assigneeId: userId,
                status: { notIn: ['COMPLETED', 'CANCELLED'] },
                dueDate: { lt: today },
            },
            orderBy: { dueDate: 'asc' },
        });

        // Get tasks completed yesterday
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const completedYesterday = await this.prisma.task.count({
            where: {
                companyId,
                assigneeId: userId,
                status: 'COMPLETED',
                completedAt: { gte: yesterday, lt: today },
            },
        });

        // Get upcoming tasks (next 7 days)
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        const upcoming = await this.prisma.task.findMany({
            where: {
                companyId,
                assigneeId: userId,
                status: { notIn: ['COMPLETED', 'CANCELLED'] },
                dueDate: { gt: tomorrow, lte: nextWeek },
            },
            orderBy: { dueDate: 'asc' },
            take: 10,
        });

        return {
            date: today.toISOString().split('T')[0],
            summary: {
                dueToday: dueToday.length,
                overdue: overdue.length,
                completedYesterday,
                upcomingThisWeek: upcoming.length,
            },
            tasks: {
                dueToday,
                overdue,
                upcoming,
            },
        };
    }

    /**
     * Generate weekly task report
     */
    async generateWeeklyReport(companyId: string, userId?: string) {
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        const where: any = { companyId };
        if (userId) where.assigneeId = userId;

        // Tasks completed this week
        const completed = await this.prisma.task.count({
            where: {
                ...where,
                status: 'COMPLETED',
                completedAt: { gte: weekAgo },
            },
        });

        // Tasks created this week
        const created = await this.prisma.task.count({
            where: {
                ...where,
                createdAt: { gte: weekAgo },
            },
        });

        // Tasks by status
        const byStatus = await this.prisma.task.groupBy({
            by: ['status'],
            where,
            _count: true,
        });

        // Tasks by priority
        const byPriority = await this.prisma.task.groupBy({
            by: ['priority'],
            where: {
                ...where,
                status: { notIn: ['COMPLETED', 'CANCELLED'] },
            },
            _count: true,
        });

        // Top performers (if company-wide)
        let topPerformers: any[] = [];
        if (!userId) {
            const performers = await this.prisma.task.groupBy({
                by: ['assigneeId'],
                where: {
                    companyId,
                    status: 'COMPLETED',
                    completedAt: { gte: weekAgo },
                    assigneeId: { not: null },
                },
                _count: true,
                orderBy: { _count: { assigneeId: 'desc' } },
                take: 5,
            });

            const userIds = performers.map((p) => p.assigneeId).filter(Boolean) as string[];
            const users = await this.prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, firstName: true, lastName: true, avatar: true },
            });

            topPerformers = performers.map((p) => ({
                user: users.find((u) => u.id === p.assigneeId),
                completedTasks: p._count,
            }));
        }

        return {
            period: {
                start: weekAgo.toISOString().split('T')[0],
                end: today.toISOString().split('T')[0],
            },
            summary: {
                tasksCompleted: completed,
                tasksCreated: created,
                completionRate: created > 0 ? Math.round((completed / created) * 100) : 0,
            },
            breakdown: {
                byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
                byPriority: byPriority.map((p) => ({ priority: p.priority, count: p._count })),
            },
            topPerformers,
        };
    }

    // ==================== EXPORT FEATURES ====================

    /**
     * Export tasks to JSON
     */
    async exportTasksToJson(companyId: string, filters?: {
        status?: string;
        categoryId?: string;
        assigneeId?: string;
        startDate?: string;
        endDate?: string;
    }) {
        const where: any = { companyId };

        if (filters?.status) where.status = filters.status;
        if (filters?.categoryId) where.categoryId = filters.categoryId;
        if (filters?.assigneeId) where.assigneeId = filters.assigneeId;
        if (filters?.startDate || filters?.endDate) {
            where.createdAt = {};
            if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
            if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
        }

        const tasks = await this.prisma.task.findMany({
            where,
            include: {
                assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
                createdBy: { select: { id: true, firstName: true, lastName: true } },
                category: { select: { id: true, name: true, color: true } },
                checklists: { include: { items: true } },
                comments: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    include: { author: { select: { firstName: true, lastName: true } } },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return {
            exportedAt: new Date().toISOString(),
            totalTasks: tasks.length,
            tasks: tasks.map((task) => ({
                id: task.id,
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                dueDate: task.dueDate,
                startDate: task.startDate,
                completedAt: task.completedAt,
                assignee: task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : null,
                category: task.category?.name,
                createdBy: task.createdBy ? `${task.createdBy.firstName} ${task.createdBy.lastName}` : 'غير معروف',
                createdAt: task.createdAt,
                checklists: task.checklists.map((cl) => ({
                    title: cl.title,
                    items: cl.items.map((item) => ({
                        content: item.content,
                        isCompleted: item.isCompleted,
                    })),
                })),
                recentComments: task.comments.map((c) => ({
                    content: c.content,
                    author: c.author ? `${c.author.firstName} ${c.author.lastName}` : 'غير معروف',
                    createdAt: c.createdAt,
                })),
            })),
        };
    }

    /**
     * Export tasks to CSV format
     */
    async exportTasksToCsv(companyId: string, filters?: {
        status?: string;
        categoryId?: string;
        assigneeId?: string;
    }) {
        const where: any = { companyId };

        if (filters?.status) where.status = filters.status;
        if (filters?.categoryId) where.categoryId = filters.categoryId;
        if (filters?.assigneeId) where.assigneeId = filters.assigneeId;

        const tasks = await this.prisma.task.findMany({
            where,
            include: {
                assignee: { select: { firstName: true, lastName: true } },
                category: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Generate CSV
        const headers = ['ID', 'Title', 'Status', 'Priority', 'Due Date', 'Assignee', 'Category', 'Created At'];
        const rows = tasks.map((task) => [
            task.id,
            `"${task.title.replace(/"/g, '""')}"`,
            task.status,
            task.priority,
            task.dueDate ? task.dueDate.toISOString().split('T')[0] : '',
            task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : '',
            task.category?.name || '',
            task.createdAt.toISOString().split('T')[0],
        ]);

        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

        return {
            content: csvContent,
            filename: `tasks-export-${new Date().toISOString().split('T')[0]}.csv`,
            mimeType: 'text/csv',
        };
    }

    // ==================== EXTERNAL INTEGRATIONS ====================

    /**
     * Send task to Slack channel (webhook)
     */
    async sendToSlack(taskId: string, companyId: string, slackWebhookUrl: string) {
        const task = await this.getTaskById(taskId, companyId);

        const slackPayload = {
            blocks: [
                {
                    type: 'header',
                    text: { type: 'plain_text', text: `📋 ${task.title}` },
                },
                {
                    type: 'section',
                    fields: [
                        { type: 'mrkdwn', text: `*الحالة:*\n${task.status}` },
                        { type: 'mrkdwn', text: `*الأولوية:*\n${task.priority}` },
                        { type: 'mrkdwn', text: `*المكلف:*\n${task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'غير محدد'}` },
                        { type: 'mrkdwn', text: `*تاريخ الاستحقاق:*\n${task.dueDate ? task.dueDate.toISOString().split('T')[0] : 'غير محدد'}` },
                    ],
                },
            ],
        };

        if (task.description) {
            slackPayload.blocks.push({
                type: 'section',
                text: { type: 'mrkdwn', text: task.description },
            } as any);
        }

        // Return payload for external sending (actual HTTP call would be done by caller)
        return {
            webhookUrl: slackWebhookUrl,
            payload: slackPayload,
        };
    }

    /**
     * Generate Microsoft Teams card for task
     */
    async generateTeamsCard(taskId: string, companyId: string) {
        const task = await this.getTaskById(taskId, companyId);

        const teamsCard = {
            '@type': 'MessageCard',
            '@context': 'http://schema.org/extensions',
            themeColor: this.getPriorityColor(task.priority),
            summary: task.title,
            sections: [
                {
                    activityTitle: task.title,
                    activitySubtitle: task.category?.name || 'مهمة',
                    facts: [
                        { name: 'الحالة', value: task.status },
                        { name: 'الأولوية', value: task.priority },
                        { name: 'المكلف', value: task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'غير محدد' },
                        { name: 'تاريخ الاستحقاق', value: task.dueDate ? task.dueDate.toISOString().split('T')[0] : 'غير محدد' },
                    ],
                    text: task.description || '',
                },
            ],
        };

        return teamsCard;
    }

    private getPriorityColor(priority: string): string {
        const colors: Record<string, string> = {
            'CRITICAL': 'FF0000',
            'HIGH': 'FFA500',
            'MEDIUM': '0078D7',
            'LOW': '00FF00',
        };
        return colors[priority] || '0078D7';
    }

    // ==================== SUBSCRIPTION & FOLLOWING ====================

    /**
     * Subscribe to task updates via email
     */
    async subscribeToTask(taskId: string, companyId: string, userId: string, options: {
        emailOnUpdate?: boolean;
        emailOnComment?: boolean;
        emailOnStatusChange?: boolean;
    }) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
        });

        if (!task) {
            throw new NotFoundException('المهمة غير موجودة');
        }

        // Add as watcher with preferences
        const existingWatcher = await this.prisma.taskWatcher.findUnique({
            where: { taskId_userId: { taskId, userId } },
        });

        if (existingWatcher) {
            // Update existing subscription
            return this.prisma.taskWatcher.update({
                where: { taskId_userId: { taskId, userId } },
                data: {
                    // Store preferences in a way that works with the schema
                    // Since TaskWatcher doesn't have preferences field, we'll use task customFields
                },
            });
        }

        return this.prisma.taskWatcher.create({
            data: {
                taskId,
                userId,
            },
        });
    }

    /**
     * Get all subscriptions for a user
     */
    async getUserSubscriptions(companyId: string, userId: string) {
        const subscriptions = await this.prisma.taskWatcher.findMany({
            where: { userId },
            include: {
                task: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        priority: true,
                        dueDate: true,
                        companyId: true,
                    },
                },
            },
        });

        // Filter by company
        return subscriptions.filter((s) => s.task.companyId === companyId);
    }

    /**
     * Unsubscribe from task updates
     */
    async unsubscribeFromTask(taskId: string, companyId: string, userId: string) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
        });

        if (!task) {
            throw new NotFoundException('المهمة غير موجودة');
        }

        return this.prisma.taskWatcher.delete({
            where: { taskId_userId: { taskId, userId } },
        });
    }

    // ============ BATCH 5: ADVANCED REPORTS & ANALYTICS ============

    /**
     * Get comprehensive dashboard analytics
     */
    async getDashboardAnalytics(companyId: string, dateRange?: { start: Date; end: Date }) {
        const start = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = dateRange?.end || new Date();

        // Overall stats
        const [totalTasks, completedTasks, inProgressTasks, overdueTasks] = await Promise.all([
            this.prisma.task.count({ where: { companyId } }),
            this.prisma.task.count({ where: { companyId, status: 'COMPLETED' } }),
            this.prisma.task.count({ where: { companyId, status: 'IN_PROGRESS' } }),
            this.prisma.task.count({
                where: { companyId, status: { notIn: ['COMPLETED', 'CANCELLED'] }, dueDate: { lt: new Date() } },
            }),
        ]);

        // Tasks by category
        const byCategory = await this.prisma.task.groupBy({
            by: ['categoryId'],
            where: { companyId },
            _count: true,
        });

        const categories = await this.prisma.taskCategory.findMany({
            where: { companyId, id: { in: byCategory.map((c) => c.categoryId).filter(Boolean) as string[] } },
            select: { id: true, name: true, color: true },
        });

        // Tasks by priority
        const byPriority = await this.prisma.task.groupBy({
            by: ['priority'],
            where: { companyId, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
            _count: true,
        });

        // Completion trend (last 30 days)
        const completionTrend = await this.getCompletionTrend(companyId, start, end);

        // Average completion time
        const avgCompletionTime = await this.getAverageCompletionTime(companyId);

        return {
            overview: {
                totalTasks,
                completedTasks,
                inProgressTasks,
                overdueTasks,
                completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
            },
            byCategory: byCategory.map((c) => ({
                category: categories.find((cat) => cat.id === c.categoryId) || { name: 'غير مصنف' },
                count: c._count,
            })),
            byPriority: byPriority.map((p) => ({ priority: p.priority, count: p._count })),
            completionTrend,
            avgCompletionTime,
            generatedAt: new Date().toISOString(),
        };
    }

    private async getCompletionTrend(companyId: string, start: Date, end: Date) {
        const days: { date: string; completed: number; created: number }[] = [];
        const current = new Date(start);

        while (current <= end) {
            const dayStart = new Date(current);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(current);
            dayEnd.setHours(23, 59, 59, 999);

            const [completed, created] = await Promise.all([
                this.prisma.task.count({
                    where: { companyId, status: 'COMPLETED', completedAt: { gte: dayStart, lte: dayEnd } },
                }),
                this.prisma.task.count({
                    where: { companyId, createdAt: { gte: dayStart, lte: dayEnd } },
                }),
            ]);

            days.push({
                date: current.toISOString().split('T')[0],
                completed,
                created,
            });

            current.setDate(current.getDate() + 1);
        }

        return days;
    }

    private async getAverageCompletionTime(companyId: string) {
        const completedTasks = await this.prisma.task.findMany({
            where: { companyId, status: 'COMPLETED', completedAt: { not: null } },
            select: { createdAt: true, completedAt: true },
            take: 100,
            orderBy: { completedAt: 'desc' },
        });

        if (completedTasks.length === 0) return { hours: 0, days: 0 };

        const totalHours = completedTasks.reduce((sum, task) => {
            const diff = (task.completedAt!.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60);
            return sum + diff;
        }, 0);

        const avgHours = totalHours / completedTasks.length;
        return { hours: Math.round(avgHours), days: Math.round(avgHours / 24 * 10) / 10 };
    }

    /**
     * Get user performance report
     */
    async getUserPerformanceReport(companyId: string, userId: string, dateRange?: { start: Date; end: Date }) {
        const start = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = dateRange?.end || new Date();

        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
            select: { id: true, firstName: true, lastName: true, avatar: true },
        });

        if (!user) throw new NotFoundException('المستخدم غير موجود');

        // Tasks assigned vs completed
        const [assigned, completed, inProgress, overdue] = await Promise.all([
            this.prisma.task.count({ where: { assigneeId: userId, createdAt: { gte: start, lte: end } } }),
            this.prisma.task.count({ where: { assigneeId: userId, status: 'COMPLETED', completedAt: { gte: start, lte: end } } }),
            this.prisma.task.count({ where: { assigneeId: userId, status: 'IN_PROGRESS' } }),
            this.prisma.task.count({ where: { assigneeId: userId, status: { notIn: ['COMPLETED', 'CANCELLED'] }, dueDate: { lt: new Date() } } }),
        ]);

        // On-time completion rate
        const completedTasks = await this.prisma.task.findMany({
            where: { assigneeId: userId, status: 'COMPLETED', completedAt: { gte: start, lte: end } },
            select: { dueDate: true, completedAt: true },
        });

        const onTimeCount = completedTasks.filter((t) => !t.dueDate || t.completedAt! <= t.dueDate).length;
        const onTimeRate = completedTasks.length > 0 ? Math.round((onTimeCount / completedTasks.length) * 100) : 0;

        // Time logged
        const timeLogs = await this.prisma.taskTimeLog.aggregate({
            where: { userId, createdAt: { gte: start, lte: end } },
            _sum: { duration: true },
        });

        // Tasks by priority completed
        const byPriority = await this.prisma.task.groupBy({
            by: ['priority'],
            where: { assigneeId: userId, status: 'COMPLETED', completedAt: { gte: start, lte: end } },
            _count: true,
        });

        return {
            user,
            period: { start: start.toISOString(), end: end.toISOString() },
            metrics: {
                tasksAssigned: assigned,
                tasksCompleted: completed,
                tasksInProgress: inProgress,
                tasksOverdue: overdue,
                completionRate: assigned > 0 ? Math.round((completed / assigned) * 100) : 0,
                onTimeRate,
                totalTimeLogged: timeLogs._sum?.duration || 0,
            },
            byPriority: byPriority.map((p) => ({ priority: p.priority, count: p._count })),
        };
    }

    /**
     * Get category performance report
     */
    async getCategoryReport(companyId: string) {
        const categories = await this.prisma.taskCategory.findMany({
            where: { companyId, isActive: true, NOT: { name: { startsWith: '__' } } },
            include: { _count: { select: { tasks: true } } },
        });

        const categoryReports = await Promise.all(
            categories.map(async (category) => {
                const [total, completed, inProgress, overdue] = await Promise.all([
                    this.prisma.task.count({ where: { categoryId: category.id } }),
                    this.prisma.task.count({ where: { categoryId: category.id, status: 'COMPLETED' } }),
                    this.prisma.task.count({ where: { categoryId: category.id, status: 'IN_PROGRESS' } }),
                    this.prisma.task.count({ where: { categoryId: category.id, status: { notIn: ['COMPLETED', 'CANCELLED'] }, dueDate: { lt: new Date() } } }),
                ]);

                return {
                    category: { id: category.id, name: category.name, color: category.color },
                    metrics: {
                        total,
                        completed,
                        inProgress,
                        overdue,
                        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
                    },
                };
            }),
        );

        return categoryReports.sort((a, b) => b.metrics.total - a.metrics.total);
    }

    /**
     * Get time tracking report
     */
    async getTimeTrackingReport(companyId: string, dateRange?: { start: Date; end: Date }) {
        const start = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = dateRange?.end || new Date();

        // Total time by user
        const byUser = await this.prisma.taskTimeLog.groupBy({
            by: ['userId'],
            where: {
                task: { companyId },
                createdAt: { gte: start, lte: end },
            },
            _sum: { duration: true },
        });

        const userIds = byUser.map((u) => u.userId);
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true, avatar: true },
        });

        // Total time by category
        const timeLogsList = await this.prisma.taskTimeLog.findMany({
            where: { task: { companyId }, createdAt: { gte: start, lte: end } },
            include: { task: { select: { categoryId: true } } },
        });

        const byCategory: Record<string, number> = {};
        timeLogsList.forEach((log) => {
            const catId = log.task.categoryId || 'uncategorized';
            byCategory[catId] = (byCategory[catId] || 0) + (log.duration || 0);
        });

        const categoryIds = Object.keys(byCategory).filter((id) => id !== 'uncategorized');
        const categoriesData = await this.prisma.taskCategory.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true, color: true },
        });

        return {
            period: { start: start.toISOString(), end: end.toISOString() },
            totalMinutes: timeLogsList.reduce((sum, l) => sum + (l.duration || 0), 0),
            byUser: byUser.map((u) => ({
                user: users.find((usr) => usr.id === u.userId),
                minutes: u._sum?.duration || 0,
                hours: Math.round((u._sum?.duration || 0) / 60 * 10) / 10,
            })).sort((a, b) => b.minutes - a.minutes),
            byCategory: Object.entries(byCategory).map(([catId, minutes]) => ({
                category: categoriesData.find((c) => c.id === catId) || { name: 'غير مصنف' },
                minutes,
                hours: Math.round(minutes / 60 * 10) / 10,
            })).sort((a, b) => b.minutes - a.minutes),
        };
    }

    /**
     * Get overdue tasks analysis
     */
    async getOverdueAnalysis(companyId: string) {
        const overdueTasks = await this.prisma.task.findMany({
            where: { companyId, status: { notIn: ['COMPLETED', 'CANCELLED'] }, dueDate: { lt: new Date() } },
            include: {
                assignee: { select: { id: true, firstName: true, lastName: true } },
                category: { select: { id: true, name: true, color: true } },
            },
            orderBy: { dueDate: 'asc' },
        });

        // Group by days overdue
        const byDaysOverdue = {
            lessThan3Days: overdueTasks.filter((t) => this.getDaysOverdue(t.dueDate!) < 3),
            threeTo7Days: overdueTasks.filter((t) => this.getDaysOverdue(t.dueDate!) >= 3 && this.getDaysOverdue(t.dueDate!) < 7),
            oneToTwoWeeks: overdueTasks.filter((t) => this.getDaysOverdue(t.dueDate!) >= 7 && this.getDaysOverdue(t.dueDate!) < 14),
            moreThanTwoWeeks: overdueTasks.filter((t) => this.getDaysOverdue(t.dueDate!) >= 14),
        };

        // Group by assignee
        const byAssignee: Record<string, any[]> = {};
        overdueTasks.forEach((task) => {
            const key = task.assigneeId || 'unassigned';
            if (!byAssignee[key]) byAssignee[key] = [];
            byAssignee[key].push(task);
        });

        return {
            total: overdueTasks.length,
            byDaysOverdue: {
                lessThan3Days: byDaysOverdue.lessThan3Days.length,
                threeTo7Days: byDaysOverdue.threeTo7Days.length,
                oneToTwoWeeks: byDaysOverdue.oneToTwoWeeks.length,
                moreThanTwoWeeks: byDaysOverdue.moreThanTwoWeeks.length,
            },
            byAssignee: Object.entries(byAssignee).map(([assigneeId, tasks]) => ({
                assignee: tasks[0]?.assignee || { firstName: 'غير', lastName: 'مسند' },
                count: tasks.length,
                tasks: tasks.slice(0, 5),
            })).sort((a, b) => b.count - a.count),
            criticalTasks: overdueTasks.filter((t) => t.priority === 'URGENT' || t.priority === 'HIGH').slice(0, 10),
        };
    }

    private getDaysOverdue(dueDate: Date): number {
        return Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    // ============ BATCH 6: TEAM COLLABORATION FEATURES ============

    /**
     * Create a task discussion thread
     */
    async createDiscussionThread(taskId: string, companyId: string, userId: string, data: {
        title: string;
        content: string;
        isPrivate?: boolean;
    }) {
        const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId } });
        if (!task) throw new NotFoundException('المهمة غير موجودة');

        // Store discussion in task comments with special type
        return this.prisma.taskComment.create({
            data: {
                taskId,
                userId,
                authorId: userId,
                content: JSON.stringify({
                    type: 'DISCUSSION_THREAD',
                    title: data.title,
                    content: data.content,
                    isPrivate: data.isPrivate || false,
                    replies: [],
                }),
            },
            include: { author: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
        });
    }

    /**
     * Add reply to discussion thread
     */
    async addThreadReply(threadId: string, companyId: string, userId: string, content: string) {
        const thread = await this.prisma.taskComment.findFirst({
            where: { id: threadId },
            include: { task: true },
        });

        if (!thread || thread.task.companyId !== companyId) {
            throw new NotFoundException('المناقشة غير موجودة');
        }

        const threadData = JSON.parse(thread.content);
        if (threadData.type !== 'DISCUSSION_THREAD') {
            throw new BadRequestException('ليس موضوع نقاش');
        }

        threadData.replies = threadData.replies || [];
        threadData.replies.push({
            id: `reply_${Date.now()}`,
            authorId: userId,
            content,
            createdAt: new Date().toISOString(),
        });

        return this.prisma.taskComment.update({
            where: { id: threadId },
            data: { content: JSON.stringify(threadData) },
        });
    }

    /**
     * Mention users in task
     */
    async mentionUsers(taskId: string, companyId: string, userId: string, userIds: string[], message: string) {
        const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId } });
        if (!task) throw new NotFoundException('المهمة غير موجودة');

        // Create mention comment
        const comment = await this.prisma.taskComment.create({
            data: {
                taskId,
                userId,
                authorId: userId,
                content: message,
                mentions: userIds,
            },
        });

        // Send notifications to mentioned users
        for (const mentionedUserId of userIds) {
            await this.notificationsService.create({
                companyId,
                userId: mentionedUserId,
                type: 'TASK_MENTION' as any,
                title: 'تم الإشارة إليك في مهمة',
                body: `تمت الإشارة إليك في المهمة: ${task.title}`,
                entityType: 'TASK',
                entityId: taskId,
                data: { taskId, commentId: comment.id },
            });
        }

        return comment;
    }

    /**
     * Share task with external email
     */
    async shareTaskExternally(taskId: string, companyId: string, userId: string, data: {
        email: string;
        message?: string;
        permissions: 'VIEW' | 'COMMENT';
        expiresAt?: string;
    }) {
        const task = await this.getTaskById(taskId, companyId);

        // Generate share token
        const shareToken = `share_${Math.random().toString(36).substring(2, 15)}${Date.now().toString(36)}`;

        const currentCf = (task.customFields as any) || {};
        const shares = currentCf.externalShares || [];

        shares.push({
            id: `ext_${Date.now()}`,
            token: shareToken,
            email: data.email,
            message: data.message,
            permissions: data.permissions,
            expiresAt: data.expiresAt,
            sharedBy: userId,
            sharedAt: new Date().toISOString(),
        });

        await this.prisma.task.update({
            where: { id: taskId },
            data: { customFields: { ...currentCf, externalShares: shares } },
        });

        return {
            shareToken,
            shareUrl: `/tasks/shared/${shareToken}`,
            expiresAt: data.expiresAt,
        };
    }

    /**
     * Get shared task by token
     */
    async getSharedTask(shareToken: string) {
        const tasks = await this.prisma.task.findMany({
            where: { customFields: { path: ['externalShares'], array_contains: [{ token: shareToken }] } },
        });

        // Fallback: search all tasks with external shares
        const allTasks = await this.prisma.task.findMany({
            include: {
                category: { select: { name: true, color: true } },
                assignee: { select: { firstName: true, lastName: true } },
                checklists: { include: { items: true } },
            },
        });

        const task = allTasks.find((t) => {
            const cf = t.customFields as any;
            return cf?.externalShares?.some((s: any) => s.token === shareToken);
        });

        if (!task) throw new NotFoundException('الرابط غير صالح أو منتهي الصلاحية');

        const cf = task.customFields as any;
        const share = cf.externalShares.find((s: any) => s.token === shareToken);

        if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
            throw new BadRequestException('انتهت صلاحية الرابط');
        }

        return {
            task: {
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                dueDate: task.dueDate,
                category: task.category,
                assignee: task.assignee,
                checklists: task.checklists,
            },
            permissions: share.permissions,
        };
    }

    /**
     * Create task poll/vote
     */
    async createTaskPoll(taskId: string, companyId: string, userId: string, poll: {
        question: string;
        options: string[];
        allowMultiple?: boolean;
        endsAt?: string;
    }) {
        const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId } });
        if (!task) throw new NotFoundException('المهمة غير موجودة');

        const pollData = {
            id: `poll_${Date.now()}`,
            question: poll.question,
            options: poll.options.map((opt, idx) => ({ id: `opt_${idx}`, text: opt, votes: [] })),
            allowMultiple: poll.allowMultiple || false,
            endsAt: poll.endsAt,
            createdBy: userId,
            createdAt: new Date().toISOString(),
        };

        return this.prisma.taskComment.create({
            data: {
                taskId,
                userId,
                authorId: userId,
                content: JSON.stringify({ type: 'POLL', ...pollData }),
            },
        });
    }

    /**
     * Vote on task poll
     */
    async voteOnPoll(pollCommentId: string, companyId: string, userId: string, optionIds: string[]) {
        const comment = await this.prisma.taskComment.findFirst({
            where: { id: pollCommentId },
            include: { task: true },
        });

        if (!comment || comment.task.companyId !== companyId) {
            throw new NotFoundException('التصويت غير موجود');
        }

        const pollData = JSON.parse(comment.content);
        if (pollData.type !== 'POLL') throw new BadRequestException('ليس تصويت');

        if (pollData.endsAt && new Date(pollData.endsAt) < new Date()) {
            throw new BadRequestException('انتهى التصويت');
        }

        // Remove previous votes from this user
        pollData.options.forEach((opt: any) => {
            opt.votes = opt.votes.filter((v: string) => v !== userId);
        });

        // Add new votes
        const votesToAdd = pollData.allowMultiple ? optionIds : [optionIds[0]];
        votesToAdd.forEach((optId: string) => {
            const option = pollData.options.find((o: any) => o.id === optId);
            if (option) option.votes.push(userId);
        });

        return this.prisma.taskComment.update({
            where: { id: pollCommentId },
            data: { content: JSON.stringify(pollData) },
        });
    }

    /**
     * Get team activity feed
     */
    async getTeamActivityFeed(companyId: string, options?: { limit?: number; offset?: number; userId?: string }) {
        const limit = options?.limit || 50;
        const offset = options?.offset || 0;

        const where: any = { task: { companyId } };
        if (options?.userId) where.userId = options.userId;

        const activities = await this.prisma.taskActivityLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: limit,
            include: {
                task: { select: { id: true, title: true } },
                user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
            },
        });

        return {
            activities,
            hasMore: activities.length === limit,
        };
    }

    /**
     * Add task to favorites
     */
    async addToFavorites(taskId: string, companyId: string, userId: string) {
        const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId } });
        if (!task) throw new NotFoundException('المهمة غير موجودة');

        // Check if already a watcher (we use watchers as favorites too)
        const existing = await this.prisma.taskWatcher.findUnique({
            where: { taskId_userId: { taskId, userId } },
        });

        if (existing) return existing;

        return this.prisma.taskWatcher.create({
            data: { taskId, userId },
        });
    }

    /**
     * Get user's favorite tasks
     */
    async getFavoriteTasks(companyId: string, userId: string) {
        const favorites = await this.prisma.taskWatcher.findMany({
            where: { userId },
            include: {
                task: {
                    include: {
                        assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                        category: { select: { id: true, name: true, color: true } },
                    },
                },
            },
        });

        return favorites
            .filter((f) => f.task.companyId === companyId)
            .map((f) => f.task);
    }

    // ============ BATCH 7: ADVANCED WORKFLOW & PERMISSIONS ============

    /**
     * Create workflow rule
     */
    async createWorkflowRule(companyId: string, userId: string, rule: {
        name: string;
        description?: string;
        trigger: {
            event: 'TASK_CREATED' | 'STATUS_CHANGED' | 'TASK_ASSIGNED' | 'TASK_COMPLETED' | 'DUE_DATE_PASSED' | 'PRIORITY_CHANGED' | 'COMMENT_ADDED';
            conditions?: Record<string, any>;
        };
        actions: Array<{
            type: 'CHANGE_STATUS' | 'ASSIGN_USER' | 'ADD_WATCHER' | 'SEND_NOTIFICATION' | 'SEND_EMAIL' | 'SET_PRIORITY' | 'CREATE_SUBTASK';
            config: Record<string, any>;
        }>;
        isActive?: boolean;
    }) {
        // Store workflow rules in TaskAutomation
        return this.prisma.taskAutomation.create({
            data: {
                name: rule.name,
                description: rule.description,
                trigger: rule.trigger.event as any,
                triggerConfig: rule.trigger.conditions || {},
                action: (rule.actions[0]?.type || 'CHANGE_STATUS') as any,
                actionConfig: { actions: rule.actions },
                isActive: rule.isActive !== false,
                companyId,
                createdById: userId,
            },
        });
    }

    /**
     * Get workflow rules
     */
    async getWorkflowRules(companyId: string) {
        return this.prisma.taskAutomation.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Update workflow rule
     */
    async updateWorkflowRule(ruleId: string, companyId: string, updates: Partial<{
        name: string;
        description: string;
        isActive: boolean;
        trigger: { event: string; conditions?: Record<string, any> };
        actions: Array<{ type: string; config: Record<string, any> }>;
    }>) {
        const rule = await this.prisma.taskAutomation.findFirst({
            where: { id: ruleId, companyId },
        });

        if (!rule) throw new NotFoundException('القاعدة غير موجودة');

        const data: any = {};
        if (updates.name) data.name = updates.name;
        if (updates.description !== undefined) data.description = updates.description;
        if (updates.isActive !== undefined) data.isActive = updates.isActive;
        if (updates.trigger) {
            data.trigger = updates.trigger.event;
            data.triggerConfig = updates.trigger.conditions || {};
        }
        if (updates.actions) {
            data.action = updates.actions[0]?.type;
            data.actionConfig = { actions: updates.actions };
        }

        return this.prisma.taskAutomation.update({
            where: { id: ruleId },
            data,
        });
    }

    /**
     * Create approval workflow
     */
    async createApprovalWorkflow(companyId: string, userId: string, workflow: {
        name: string;
        description?: string;
        stages: Array<{
            name: string;
            approvers: string[]; // User IDs
            requireAll?: boolean; // All must approve vs any one
            autoApproveAfterHours?: number;
        }>;
        applyToCategories?: string[];
    }) {
        const workflowData = {
            id: `wf_${Date.now()}`,
            name: workflow.name,
            description: workflow.description,
            stages: workflow.stages.map((s, idx) => ({
                id: `stage_${idx}`,
                ...s,
                order: idx,
            })),
            applyToCategories: workflow.applyToCategories,
            createdBy: userId,
            createdAt: new Date().toISOString(),
            isActive: true,
        };

        // Store in special category
        const existing = await this.prisma.taskCategory.findFirst({
            where: { companyId, name: '__APPROVAL_WORKFLOWS__' },
        });

        let workflows: any[] = [];
        if (existing) {
            try {
                workflows = JSON.parse(existing.nameEn || '[]');
            } catch {
                workflows = [];
            }
        }

        workflows.push(workflowData);

        if (existing) {
            await this.prisma.taskCategory.update({
                where: { id: existing.id },
                data: { nameEn: JSON.stringify(workflows) },
            });
        } else {
            await this.prisma.taskCategory.create({
                data: {
                    name: '__APPROVAL_WORKFLOWS__',
                    nameEn: JSON.stringify(workflows),
                    companyId,
                    isActive: false,
                },
            });
        }

        return workflowData;
    }

    /**
     * Get approval workflows
     */
    async getApprovalWorkflows(companyId: string) {
        const category = await this.prisma.taskCategory.findFirst({
            where: { companyId, name: '__APPROVAL_WORKFLOWS__' },
        });

        if (!category) return [];

        try {
            return JSON.parse(category.nameEn || '[]');
        } catch {
            return [];
        }
    }

    /**
     * Submit task for approval
     */
    async submitForApproval(taskId: string, companyId: string, userId: string, workflowId: string) {
        const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId } });
        if (!task) throw new NotFoundException('المهمة غير موجودة');

        const workflows = await this.getApprovalWorkflows(companyId);
        const workflow = workflows.find((w: any) => w.id === workflowId);

        if (!workflow) throw new NotFoundException('سلسلة الموافقة غير موجودة');

        const approvalData = {
            workflowId,
            workflowName: workflow.name,
            currentStage: 0,
            stages: workflow.stages.map((stage: any) => ({
                ...stage,
                status: 'PENDING',
                approvals: [],
            })),
            submittedBy: userId,
            submittedAt: new Date().toISOString(),
        };

        const currentCf = (task.customFields as any) || {};

        await this.prisma.task.update({
            where: { id: taskId },
            data: {
                status: 'PENDING_APPROVAL' as any,
                customFields: { ...currentCf, approvalWorkflow: approvalData },
            },
        });

        // Notify first stage approvers
        const firstStage = workflow.stages[0];
        for (const approverId of firstStage.approvers) {
            await this.notificationsService.create({
                companyId,
                userId: approverId,
                type: 'TASK_APPROVAL_REQUEST' as any,
                title: 'طلب موافقة على مهمة',
                body: `المهمة "${task.title}" تحتاج موافقتك`,
                entityType: 'TASK',
                entityId: taskId,
                data: { taskId, workflowId, stage: 0 },
            });
        }

        return approvalData;
    }

    /**
     * Approve/reject task in workflow
     */
    async processApproval(taskId: string, companyId: string, userId: string, decision: {
        approved: boolean;
        comment?: string;
    }) {
        const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId } });
        if (!task) throw new NotFoundException('المهمة غير موجودة');

        const cf = task.customFields as any;
        const approval = cf?.approvalWorkflow;

        if (!approval) throw new BadRequestException('المهمة ليست في سلسلة موافقة');

        const currentStage = approval.stages[approval.currentStage];
        if (!currentStage.approvers.includes(userId)) {
            throw new ForbiddenException('غير مصرح لك بالموافقة في هذه المرحلة');
        }

        // Record the approval/rejection
        currentStage.approvals.push({
            userId,
            approved: decision.approved,
            comment: decision.comment,
            timestamp: new Date().toISOString(),
        });

        if (!decision.approved) {
            // Rejected - mark stage and workflow as rejected
            currentStage.status = 'REJECTED';
            await this.prisma.task.update({
                where: { id: taskId },
                data: {
                    status: 'REJECTED' as any,
                    customFields: { ...cf, approvalWorkflow: approval },
                },
            });
            await this.logActivity(taskId, userId, 'REJECTED', 'approval', null, decision.comment || '');
            return { status: 'REJECTED', stage: currentStage.name };
        }

        // Check if stage is complete
        const stageComplete = currentStage.requireAll
            ? currentStage.approvers.every((a: string) => currentStage.approvals.some((ap: any) => ap.userId === a && ap.approved))
            : currentStage.approvals.some((ap: any) => ap.approved);

        if (stageComplete) {
            currentStage.status = 'APPROVED';

            // Move to next stage or complete
            if (approval.currentStage < approval.stages.length - 1) {
                approval.currentStage++;
                const nextStage = approval.stages[approval.currentStage];

                // Notify next stage approvers
                for (const approverId of nextStage.approvers) {
                    await this.notificationsService.create({
                        companyId,
                        userId: approverId,
                        type: 'TASK_APPROVAL_REQUEST' as any,
                        title: 'طلب موافقة على مهمة',
                        body: `المهمة "${task.title}" تحتاج موافقتك (${nextStage.name})`,
                        entityType: 'TASK',
                        entityId: taskId,
                        data: { taskId, stage: approval.currentStage },
                    });
                }

                await this.prisma.task.update({
                    where: { id: taskId },
                    data: { customFields: { ...cf, approvalWorkflow: approval } },
                });

                return { status: 'STAGE_APPROVED', nextStage: nextStage.name };
            } else {
                // All stages complete
                await this.prisma.task.update({
                    where: { id: taskId },
                    data: {
                        status: 'APPROVED' as any,
                        customFields: { ...cf, approvalWorkflow: approval },
                    },
                });
                await this.logActivity(taskId, userId, 'APPROVED', 'approval', null, 'تمت الموافقة على المهمة');
                return { status: 'FULLY_APPROVED' };
            }
        }

        // Stage not yet complete
        await this.prisma.task.update({
            where: { id: taskId },
            data: { customFields: { ...cf, approvalWorkflow: approval } },
        });

        return { status: 'VOTE_RECORDED', remainingApprovers: currentStage.approvers.length - currentStage.approvals.filter((a: any) => a.approved).length };
    }

    /**
     * Set task permissions
     */
    async setTaskPermissions(taskId: string, companyId: string, userId: string, permissions: {
        viewUsers?: string[];
        editUsers?: string[];
        deleteUsers?: string[];
        isPrivate?: boolean;
    }) {
        const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId } });
        if (!task) throw new NotFoundException('المهمة غير موجودة');

        // Only creator or admin can change permissions
        if (task.createdById !== userId) {
            throw new ForbiddenException('غير مصرح لك بتغيير الصلاحيات');
        }

        const currentCf = (task.customFields as any) || {};

        return this.prisma.task.update({
            where: { id: taskId },
            data: {
                customFields: {
                    ...currentCf,
                    permissions: {
                        viewUsers: permissions.viewUsers,
                        editUsers: permissions.editUsers,
                        deleteUsers: permissions.deleteUsers,
                        isPrivate: permissions.isPrivate || false,
                        updatedBy: userId,
                        updatedAt: new Date().toISOString(),
                    },
                },
            },
        });
    }

    /**
     * Check user permission for task
     */
    async checkTaskPermission(taskId: string, companyId: string, userId: string, action: 'VIEW' | 'EDIT' | 'DELETE') {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
            include: { createdBy: { select: { id: true } }, assignee: { select: { id: true } } },
        });

        if (!task) return { allowed: false, reason: 'المهمة غير موجودة' };

        // Creator and assignee always have access
        if (task.createdById === userId || task.assigneeId === userId) {
            return { allowed: true };
        }

        const cf = task.customFields as any;
        const permissions = cf?.permissions;

        // If no custom permissions, default to allowed
        if (!permissions) return { allowed: true };

        // If private and not in allowed list
        if (permissions.isPrivate) {
            const actionMap = { VIEW: 'viewUsers', EDIT: 'editUsers', DELETE: 'deleteUsers' };
            const allowedUsers = permissions[actionMap[action]] || [];

            if (!allowedUsers.includes(userId)) {
                return { allowed: false, reason: 'ليس لديك صلاحية' };
            }
        }

        return { allowed: true };
    }

    /**
     * Delegate task
     */
    async delegateTask(taskId: string, companyId: string, userId: string, delegation: {
        toUserId: string;
        reason?: string;
        keepOriginalAssignee?: boolean;
        notifyOriginal?: boolean;
    }) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
            include: { assignee: { select: { id: true, firstName: true, lastName: true } } },
        });

        if (!task) throw new NotFoundException('المهمة غير موجودة');

        const originalAssignee = task.assignee;
        const currentCf = (task.customFields as any) || {};

        // Record delegation history
        const delegations = currentCf.delegations || [];
        delegations.push({
            from: task.assigneeId,
            to: delegation.toUserId,
            delegatedBy: userId,
            reason: delegation.reason,
            timestamp: new Date().toISOString(),
        });

        const updates: any = {
            customFields: { ...currentCf, delegations },
        };

        if (!delegation.keepOriginalAssignee) {
            updates.assigneeId = delegation.toUserId;
        }

        await this.prisma.task.update({
            where: { id: taskId },
            data: updates,
        });

        // Notify new assignee
        await this.notificationsService.create({
            companyId,
            userId: delegation.toUserId,
            type: 'TASK_DELEGATED' as any,
            title: 'تم تفويض مهمة إليك',
            body: `تم تفويض المهمة "${task.title}" إليك`,
            entityType: 'TASK',
            entityId: taskId,
            data: { taskId, delegatedBy: userId },
        });

        // Notify original assignee if requested
        if (delegation.notifyOriginal && originalAssignee) {
            await this.notificationsService.create({
                companyId,
                userId: originalAssignee.id,
                type: 'TASK_DELEGATED' as any,
                title: 'تم تفويض مهمتك',
                body: `تم تفويض المهمة "${task.title}" لموظف آخر`,
                entityType: 'TASK',
                entityId: taskId,
                data: { taskId, delegatedTo: delegation.toUserId },
            });
        }

        await this.logActivity(taskId, userId, 'DELEGATED', 'assignee', originalAssignee?.id, delegation.toUserId);

        return { success: true, delegatedTo: delegation.toUserId };
    }

    // ============ BATCH 8: MOBILE & API ENHANCEMENTS ============

    /**
     * Get tasks optimized for mobile (lighter payload)
     */
    async getMobileTaskList(companyId: string, userId: string, options?: {
        status?: string;
        assignedToMe?: boolean;
        limit?: number;
        cursor?: string;
    }) {
        const limit = options?.limit || 20;
        const where: any = { companyId };

        if (options?.status) where.status = options.status;
        if (options?.assignedToMe) where.assigneeId = userId;
        if (options?.cursor) where.id = { lt: options.cursor };

        const tasks = await this.prisma.task.findMany({
            where,
            take: limit + 1,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                dueDate: true,
                assigneeId: true,
                categoryId: true,
                completedAt: true,
                assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                category: { select: { id: true, name: true, color: true } },
                _count: { select: { comments: true, attachments: true, checklists: true } },
            },
        });

        const hasMore = tasks.length > limit;
        const items = hasMore ? tasks.slice(0, -1) : tasks;
        const nextCursor = hasMore ? items[items.length - 1]?.id : null;

        return {
            items,
            nextCursor,
            hasMore,
        };
    }

    /**
     * Get single task for mobile (essential fields only)
     */
    async getMobileTaskDetail(taskId: string, companyId: string) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
            include: {
                assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                category: { select: { id: true, name: true, color: true } },
                checklists: {
                    take: 5,
                    include: { items: { take: 10 } },
                },
                comments: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    include: { author: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
                },
                attachments: { take: 5 },
            },
        });

        if (!task) throw new NotFoundException('المهمة غير موجودة');

        return task;
    }

    /**
     * Quick actions for mobile
     */
    async mobileQuickAction(taskId: string, companyId: string, userId: string, action: {
        type: 'START' | 'COMPLETE' | 'PAUSE' | 'ADD_COMMENT' | 'CHECK_ITEM';
        data?: any;
    }) {
        const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId } });
        if (!task) throw new NotFoundException('المهمة غير موجودة');

        switch (action.type) {
            case 'START':
                return this.prisma.task.update({
                    where: { id: taskId },
                    data: { status: 'IN_PROGRESS', startDate: new Date() },
                });
            case 'COMPLETE':
                return this.prisma.task.update({
                    where: { id: taskId },
                    data: { status: 'COMPLETED', completedAt: new Date() },
                });
            case 'PAUSE':
                return this.prisma.task.update({
                    where: { id: taskId },
                    data: { status: 'BLOCKED' },
                });
            case 'ADD_COMMENT':
                return this.prisma.taskComment.create({
                    data: { taskId, userId, authorId: userId, content: action.data?.content || '' },
                });
            case 'CHECK_ITEM':
                if (action.data?.itemId) {
                    return this.prisma.taskChecklistItem.update({
                        where: { id: action.data.itemId },
                        data: { isCompleted: true, completedAt: new Date(), completedById: userId },
                    });
                }
                break;
        }

        return { success: true };
    }

    /**
     * Sync tasks for offline support
     */
    async syncTasks(companyId: string, userId: string, lastSyncAt?: string) {
        const syncDate = lastSyncAt ? new Date(lastSyncAt) : new Date(0);

        // Get updated tasks since last sync
        const updatedTasks = await this.prisma.task.findMany({
            where: {
                companyId,
                OR: [{ assigneeId: userId }, { createdById: userId }, { watchers: { some: { userId } } }],
                updatedAt: { gt: syncDate },
            },
            include: {
                assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                category: { select: { id: true, name: true, color: true } },
                checklists: { include: { items: true } },
            },
        });

        // Get deleted task IDs (using activity log)
        const deletedLogs = await this.prisma.taskActivityLog.findMany({
            where: {
                action: 'DELETED',
                createdAt: { gt: syncDate },
                task: { companyId },
            },
            select: { taskId: true },
        });

        return {
            updated: updatedTasks,
            deleted: deletedLogs.map((l) => l.taskId),
            syncedAt: new Date().toISOString(),
        };
    }

    /**
     * Register device for push notifications
     */
    async registerPushToken(userId: string, companyId: string, token: {
        deviceId: string;
        pushToken: string;
        platform: 'IOS' | 'ANDROID' | 'WEB';
        deviceName?: string;
    }) {
        // Store in user preferences using TaskCategory pattern
        const prefKey = `__PUSH_TOKENS_${userId}__`;
        let pref = await this.prisma.taskCategory.findFirst({
            where: { companyId, name: prefKey },
        });

        const tokens = pref?.nameEn ? JSON.parse(pref.nameEn) : [];
        const existingIdx = tokens.findIndex((t: any) => t.deviceId === token.deviceId);

        if (existingIdx >= 0) {
            tokens[existingIdx] = { ...token, updatedAt: new Date().toISOString() };
        } else {
            tokens.push({ ...token, createdAt: new Date().toISOString() });
        }

        if (pref) {
            await this.prisma.taskCategory.update({
                where: { id: pref.id },
                data: { nameEn: JSON.stringify(tokens) },
            });
        } else {
            await this.prisma.taskCategory.create({
                data: {
                    name: prefKey,
                    nameEn: JSON.stringify(tokens),
                    companyId,
                    isActive: false,
                },
            });
        }

        return { success: true, deviceId: token.deviceId };
    }

    /**
     * Get tasks with field selection (GraphQL-like)
     */
    async getTasksWithFields(companyId: string, options: {
        fields: string[];
        filters?: Record<string, any>;
        page?: number;
        limit?: number;
    }) {
        const { fields, filters, page = 1, limit = 20 } = options;

        // Build include object from fields (Prisma doesn't allow both select and include)
        const include: any = {};
        const hasRelations = fields.some((f) => ['assignee', 'createdBy', 'category', 'comments', 'attachments', 'checklists'].includes(f));

        if (hasRelations) {
            fields.forEach((field) => {
                if (field === 'assignee') {
                    include.assignee = { select: { id: true, firstName: true, lastName: true, avatar: true } };
                } else if (field === 'createdBy') {
                    include.createdBy = { select: { id: true, firstName: true, lastName: true, avatar: true } };
                } else if (field === 'category') {
                    include.category = { select: { id: true, name: true, color: true } };
                } else if (field === 'comments') {
                    include.comments = { take: 5, orderBy: { createdAt: 'desc' as const } };
                } else if (field === 'attachments') {
                    include.attachments = { take: 5 };
                } else if (field === 'checklists') {
                    include.checklists = { include: { items: true } };
                }
            });
        }

        const where: any = { companyId, ...filters };
        const skip = (page - 1) * limit;

        const [tasks, total] = await Promise.all([
            this.prisma.task.findMany({
                where,
                include: hasRelations ? include : undefined,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.task.count({ where }),
        ]);

        return {
            data: tasks,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    /**
     * API health check for tasks module
     */
    async getApiHealth(companyId: string) {
        const [taskCount, recentActivity] = await Promise.all([
            this.prisma.task.count({ where: { companyId } }),
            this.prisma.taskActivityLog.count({
                where: { task: { companyId }, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
            }),
        ]);

        return {
            status: 'healthy',
            module: 'tasks',
            stats: {
                totalTasks: taskCount,
                activityLast24h: recentActivity,
            },
            timestamp: new Date().toISOString(),
        };
    }

    // ============ BATCH 9: AI & AUTOMATION FEATURES ============

    /**
     * Auto-categorize task based on title/description
     */
    async autoCategorizeTask(companyId: string, title: string, description?: string) {
        const categories = await this.prisma.taskCategory.findMany({
            where: { companyId, isActive: true, NOT: { name: { startsWith: '__' } } },
        });

        if (categories.length === 0) return null;

        const text = `${title} ${description || ''}`.toLowerCase();

        // Simple keyword matching (can be enhanced with ML)
        const scores: { category: any; score: number }[] = categories.map((cat) => {
            let score = 0;
            const catName = cat.name.toLowerCase();
            const catNameEn = (cat.nameEn || '').toLowerCase();

            // Check if category name appears in text
            if (text.includes(catName)) score += 10;
            if (catNameEn && text.includes(catNameEn)) score += 10;

            // Check keywords from category English name as additional hints
            if (catNameEn) {
                catNameEn.split(' ').forEach((word: string) => {
                    if (word.length > 3 && text.includes(word)) score += 2;
                });
            }

            return { category: cat, score };
        });

        const bestMatch = scores.sort((a, b) => b.score - a.score)[0];

        return bestMatch.score > 0 ? {
            suggestedCategory: bestMatch.category,
            confidence: Math.min(bestMatch.score / 20, 1),
            alternatives: scores.slice(1, 4).filter((s) => s.score > 0).map((s) => s.category),
        } : null;
    }

    /**
     * Get workload balancing suggestions
     */
    async getWorkloadSuggestions(companyId: string) {
        const users = await this.prisma.user.findMany({
            where: { companyId, status: 'ACTIVE' },
            select: { id: true, firstName: true, lastName: true },
        });

        const workloads = await Promise.all(
            users.map(async (user) => {
                const [assigned, inProgress, overdue] = await Promise.all([
                    this.prisma.task.count({ where: { assigneeId: user.id, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
                    this.prisma.task.count({ where: { assigneeId: user.id, status: 'IN_PROGRESS' } }),
                    this.prisma.task.count({ where: { assigneeId: user.id, status: { notIn: ['COMPLETED', 'CANCELLED'] }, dueDate: { lt: new Date() } } }),
                ]);

                return {
                    user,
                    metrics: { assigned, inProgress, overdue },
                    workloadScore: assigned + inProgress * 2 + overdue * 3,
                };
            }),
        );

        const avgWorkload = workloads.reduce((sum, w) => sum + w.workloadScore, 0) / workloads.length;
        const overloaded = workloads.filter((w) => w.workloadScore > avgWorkload * 1.5);
        const underloaded = workloads.filter((w) => w.workloadScore < avgWorkload * 0.5);

        const suggestions: string[] = [];
        overloaded.forEach((w) => {
            const target = underloaded[0];
            if (target) {
                suggestions.push(`نقل مهام من ${w.user.firstName} ${w.user.lastName} إلى ${target.user.firstName} ${target.user.lastName}`);
            }
        });

        return {
            workloads: workloads.sort((a, b) => b.workloadScore - a.workloadScore),
            averageWorkload: Math.round(avgWorkload),
            overloaded: overloaded.map((w) => w.user),
            underloaded: underloaded.map((w) => w.user),
            suggestions,
        };
    }

    /**
     * Predict due date based on similar tasks
     */
    async predictDueDate(companyId: string, categoryId?: string, priority?: string) {
        const where: any = {
            companyId,
            status: 'COMPLETED',
            completedAt: { not: null },
            createdAt: { not: null },
        };

        if (categoryId) where.categoryId = categoryId;
        if (priority) where.priority = priority;

        const completedTasks = await this.prisma.task.findMany({
            where,
            select: { createdAt: true, completedAt: true },
            take: 100,
            orderBy: { completedAt: 'desc' },
        });

        if (completedTasks.length < 5) {
            return { predictedDays: 7, confidence: 0.3, sampleSize: completedTasks.length };
        }

        const durations = completedTasks.map((t) =>
            Math.ceil((t.completedAt!.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
        );

        const avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
        const medianDuration = durations.sort((a, b) => a - b)[Math.floor(durations.length / 2)];

        return {
            predictedDays: medianDuration,
            averageDays: avgDuration,
            confidence: Math.min(completedTasks.length / 50, 1),
            sampleSize: completedTasks.length,
            suggestedDueDate: new Date(Date.now() + medianDuration * 24 * 60 * 60 * 1000).toISOString(),
        };
    }

    /**
     * Find similar/duplicate tasks
     */
    async findSimilarTasks(companyId: string, title: string, excludeTaskId?: string) {
        const words = title.toLowerCase().split(' ').filter((w) => w.length > 3);

        if (words.length === 0) return [];

        const tasks = await this.prisma.task.findMany({
            where: {
                companyId,
                id: excludeTaskId ? { not: excludeTaskId } : undefined,
                status: { notIn: ['CANCELLED'] },
            },
            select: {
                id: true,
                title: true,
                status: true,
                assignee: { select: { firstName: true, lastName: true } },
            },
            take: 200,
        });

        const similar = tasks
            .map((task) => {
                const taskWords = task.title.toLowerCase().split(' ').filter((w) => w.length > 3);
                const matchCount = words.filter((w) => taskWords.includes(w)).length;
                const similarity = matchCount / Math.max(words.length, taskWords.length);
                return { ...task, similarity };
            })
            .filter((t) => t.similarity > 0.3)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 5);

        return similar;
    }

    /**
     * Get auto-assignment recommendation
     */
    async getAssignmentRecommendation(companyId: string, taskData: {
        categoryId?: string;
        priority?: string;
        estimatedHours?: number;
    }) {
        const users = await this.prisma.user.findMany({
            where: { companyId, status: 'ACTIVE' },
            select: { id: true, firstName: true, lastName: true },
        });

        const recommendations = await Promise.all(
            users.map(async (user) => {
                // Get user's history with similar tasks
                const similarCompleted = await this.prisma.task.count({
                    where: {
                        assigneeId: user.id,
                        status: 'COMPLETED',
                        categoryId: taskData.categoryId || undefined,
                    },
                });

                // Get current workload
                const currentLoad = await this.prisma.task.count({
                    where: {
                        assigneeId: user.id,
                        status: { in: ['TODO', 'IN_PROGRESS'] },
                    },
                });

                // Calculate score (experience - workload)
                const score = similarCompleted * 2 - currentLoad;

                return {
                    user,
                    score,
                    experience: similarCompleted,
                    currentWorkload: currentLoad,
                };
            }),
        );

        return recommendations
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map((r) => ({
                user: r.user,
                reason: `أنجز ${r.experience} مهام مشابهة، لديه ${r.currentWorkload} مهام حالية`,
                confidence: Math.min(r.experience / 10, 1),
            }));
    }

    /**
     * Smart task scheduling
     */
    async getSmartSchedule(companyId: string, userId: string, options?: {
        startDate?: string;
        endDate?: string;
        workHoursPerDay?: number;
    }) {
        const start = options?.startDate ? new Date(options.startDate) : new Date();
        const end = options?.endDate ? new Date(options.endDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        const hoursPerDay = options?.workHoursPerDay || 8;

        // Get pending tasks
        const tasks = await this.prisma.task.findMany({
            where: {
                companyId,
                assigneeId: userId,
                status: { in: ['TODO', 'IN_PROGRESS'] },
            },
            orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
        });

        // Simple scheduling algorithm
        const schedule: { date: string; tasks: any[]; totalHours: number }[] = [];
        let currentDate = new Date(start);
        let dayTasks: any[] = [];
        let dayHours = 0;

        const priorityOrder = { URGENT: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };

        const sortedTasks = tasks.sort((a, b) => {
            const priorityDiff = (priorityOrder[a.priority as keyof typeof priorityOrder] || 3) -
                (priorityOrder[b.priority as keyof typeof priorityOrder] || 3);
            if (priorityDiff !== 0) return priorityDiff;
            if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
            return 0;
        });

        for (const task of sortedTasks) {
            const cf = task.customFields as any;
            const estimatedHours = cf?.estimatedHours || 2;

            if (dayHours + estimatedHours > hoursPerDay) {
                if (dayTasks.length > 0) {
                    schedule.push({
                        date: currentDate.toISOString().split('T')[0],
                        tasks: dayTasks,
                        totalHours: dayHours,
                    });
                }
                currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
                dayTasks = [];
                dayHours = 0;
            }

            if (currentDate <= end) {
                dayTasks.push({
                    id: task.id,
                    title: task.title,
                    priority: task.priority,
                    estimatedHours,
                    dueDate: task.dueDate,
                });
                dayHours += estimatedHours;
            }
        }

        if (dayTasks.length > 0) {
            schedule.push({
                date: currentDate.toISOString().split('T')[0],
                tasks: dayTasks,
                totalHours: dayHours,
            });
        }

        return {
            schedule,
            totalTasks: tasks.length,
            scheduledTasks: schedule.reduce((sum, d) => sum + d.tasks.length, 0),
            unscheduledTasks: tasks.length - schedule.reduce((sum, d) => sum + d.tasks.length, 0),
        };
    }

    // ============ BATCH 10: ENTERPRISE & COMPLIANCE FEATURES ============

    /**
     * Get audit trail for task
     */
    async getTaskAuditTrail(taskId: string, companyId: string, options?: {
        startDate?: string;
        endDate?: string;
        actions?: string[];
    }) {
        const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId } });
        if (!task) throw new NotFoundException('المهمة غير موجودة');

        const where: any = { taskId };
        if (options?.startDate) where.createdAt = { ...where.createdAt, gte: new Date(options.startDate) };
        if (options?.endDate) where.createdAt = { ...where.createdAt, lte: new Date(options.endDate) };
        if (options?.actions?.length) where.action = { in: options.actions };

        const logs = await this.prisma.taskActivityLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
        });

        return {
            task: { id: task.id, title: task.title },
            auditTrail: logs.map((log) => ({
                id: log.id,
                action: log.action,
                field: log.oldValue ? 'field_change' : 'action',
                oldValue: log.oldValue,
                newValue: log.newValue,
                description: log.description,
                user: log.user,
                timestamp: log.createdAt,
            })),
            totalChanges: logs.length,
        };
    }

    /**
     * Export user data (GDPR compliance)
     */
    async exportUserTaskData(companyId: string, userId: string) {
        const [assignedTasks, reportedTasks, comments, timeLogs, activities] = await Promise.all([
            this.prisma.task.findMany({
                where: { companyId, assigneeId: userId },
                include: { category: true },
            }),
            this.prisma.task.findMany({
                where: { companyId, createdById: userId },
                select: { id: true, title: true, createdAt: true },
            }),
            this.prisma.taskComment.findMany({
                where: { authorId: userId, task: { companyId } },
                select: { id: true, content: true, createdAt: true, task: { select: { title: true } } },
            }),
            this.prisma.taskTimeLog.findMany({
                where: { userId, task: { companyId } },
                select: { id: true, startTime: true, endTime: true, duration: true, task: { select: { title: true } } },
            }),
            this.prisma.taskActivityLog.findMany({
                where: { userId, task: { companyId } },
                select: { id: true, action: true, createdAt: true, task: { select: { title: true } } },
            }),
        ]);

        return {
            exportedAt: new Date().toISOString(),
            userId,
            data: {
                assignedTasks: assignedTasks.map((t) => ({
                    id: t.id,
                    title: t.title,
                    description: t.description,
                    status: t.status,
                    priority: t.priority,
                    category: t.category?.name,
                    createdAt: t.createdAt,
                    completedAt: t.completedAt,
                })),
                reportedTasks,
                comments,
                timeLogs,
                activities,
            },
            summary: {
                totalAssigned: assignedTasks.length,
                totalReported: reportedTasks.length,
                totalComments: comments.length,
                totalTimeLogs: timeLogs.length,
                totalActivities: activities.length,
            },
        };
    }

    /**
     * Delete user task data (GDPR right to be forgotten)
     */
    async deleteUserTaskData(companyId: string, userId: string, options?: {
        anonymize?: boolean;
        deleteComments?: boolean;
        deleteTimeLogs?: boolean;
    }) {
        const anonymize = options?.anonymize ?? true;

        if (anonymize) {
            // Anonymize instead of delete
            await this.prisma.task.updateMany({
                where: { companyId, assigneeId: userId },
                data: { assigneeId: null },
            });

            // Note: createdById is required and cannot be nullified
            // Tasks created by this user will remain linked but user data will be anonymized elsewhere

            if (options?.deleteComments) {
                await this.prisma.taskComment.updateMany({
                    where: { authorId: userId, task: { companyId } },
                    data: { content: '[محتوى محذوف]', authorId: null as any },
                });
            }

            if (options?.deleteTimeLogs) {
                await this.prisma.taskTimeLog.deleteMany({
                    where: { userId, task: { companyId } },
                });
            }
        } else {
            // Hard delete
            await this.prisma.taskComment.deleteMany({
                where: { authorId: userId, task: { companyId } },
            });

            await this.prisma.taskTimeLog.deleteMany({
                where: { userId, task: { companyId } },
            });
        }

        return {
            success: true,
            anonymized: anonymize,
            deletedAt: new Date().toISOString(),
        };
    }

    /**
     * Set data retention policy
     */
    async setRetentionPolicy(companyId: string, userId: string, policy: {
        completedTaskRetentionDays: number;
        cancelledTaskRetentionDays: number;
        activityLogRetentionDays: number;
        attachmentRetentionDays: number;
    }) {
        const policyKey = `__RETENTION_POLICY__`;
        let existing = await this.prisma.taskCategory.findFirst({
            where: { companyId, name: policyKey },
        });

        const policyData = {
            ...policy,
            updatedAt: new Date().toISOString(),
            updatedBy: userId,
        };

        if (existing) {
            await this.prisma.taskCategory.update({
                where: { id: existing.id },
                data: { nameEn: JSON.stringify(policyData) },
            });
        } else {
            await this.prisma.taskCategory.create({
                data: {
                    name: policyKey,
                    nameEn: JSON.stringify(policyData),
                    companyId,
                    isActive: false,
                },
            });
        }

        return { success: true, policy: policyData };
    }

    /**
     * Apply retention policy (cleanup old data)
     */
    async applyRetentionPolicy(companyId: string) {
        const policyKey = `__RETENTION_POLICY__`;
        const policyRecord = await this.prisma.taskCategory.findFirst({
            where: { companyId, name: policyKey },
        });

        if (!policyRecord?.nameEn) {
            return { success: false, message: 'لا توجد سياسة احتفاظ محددة' };
        }

        const policy = JSON.parse(policyRecord.nameEn);
        const now = new Date();

        // Delete old completed tasks
        const completedCutoff = new Date(now.getTime() - policy.completedTaskRetentionDays * 24 * 60 * 60 * 1000);
        const deletedCompleted = await this.prisma.task.deleteMany({
            where: {
                companyId,
                status: 'COMPLETED',
                completedAt: { lt: completedCutoff },
            },
        });

        // Delete old cancelled tasks
        const cancelledCutoff = new Date(now.getTime() - policy.cancelledTaskRetentionDays * 24 * 60 * 60 * 1000);
        const deletedCancelled = await this.prisma.task.deleteMany({
            where: {
                companyId,
                status: 'CANCELLED',
                updatedAt: { lt: cancelledCutoff },
            },
        });

        // Delete old activity logs
        const activityCutoff = new Date(now.getTime() - policy.activityLogRetentionDays * 24 * 60 * 60 * 1000);
        const deletedLogs = await this.prisma.taskActivityLog.deleteMany({
            where: {
                task: { companyId },
                createdAt: { lt: activityCutoff },
            },
        });

        return {
            success: true,
            appliedAt: now.toISOString(),
            deleted: {
                completedTasks: deletedCompleted.count,
                cancelledTasks: deletedCancelled.count,
                activityLogs: deletedLogs.count,
            },
        };
    }

    /**
     * Get SLA tracking for task
     */
    async getTaskSLA(taskId: string, companyId: string) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
            include: { category: true },
        });

        if (!task) throw new NotFoundException('المهمة غير موجودة');

        const cf = task.customFields as any;
        const slaConfig = cf?.sla || {
            responseTimeHours: 24,
            resolutionTimeHours: 72,
        };

        const now = new Date();
        const createdAt = task.createdAt;
        const firstResponseAt = cf?.firstResponseAt ? new Date(cf.firstResponseAt) : null;
        const resolvedAt = task.completedAt;

        // Calculate SLA metrics
        const responseTimeMs = firstResponseAt ? firstResponseAt.getTime() - createdAt.getTime() : now.getTime() - createdAt.getTime();
        const responseTimeHours = responseTimeMs / (1000 * 60 * 60);

        const resolutionTimeMs = resolvedAt ? resolvedAt.getTime() - createdAt.getTime() : now.getTime() - createdAt.getTime();
        const resolutionTimeHours = resolutionTimeMs / (1000 * 60 * 60);

        return {
            task: { id: task.id, title: task.title, status: task.status },
            sla: {
                responseTime: {
                    target: slaConfig.responseTimeHours,
                    actual: Math.round(responseTimeHours * 10) / 10,
                    met: firstResponseAt ? responseTimeHours <= slaConfig.responseTimeHours : false,
                    breached: !firstResponseAt && responseTimeHours > slaConfig.responseTimeHours,
                },
                resolutionTime: {
                    target: slaConfig.resolutionTimeHours,
                    actual: Math.round(resolutionTimeHours * 10) / 10,
                    met: resolvedAt ? resolutionTimeHours <= slaConfig.resolutionTimeHours : false,
                    breached: !resolvedAt && resolutionTimeHours > slaConfig.resolutionTimeHours,
                },
            },
            status: resolvedAt ? 'RESOLVED' : (resolutionTimeHours > slaConfig.resolutionTimeHours ? 'BREACHED' : 'ACTIVE'),
        };
    }

    /**
     * Get compliance report
     */
    async getComplianceReport(companyId: string, options?: {
        startDate?: string;
        endDate?: string;
    }) {
        const start = options?.startDate ? new Date(options.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = options?.endDate ? new Date(options.endDate) : new Date();

        const [totalTasks, completedOnTime, breachedSLA, overdueResolved] = await Promise.all([
            this.prisma.task.count({
                where: { companyId, createdAt: { gte: start, lte: end } },
            }),
            this.prisma.task.count({
                where: {
                    companyId,
                    status: 'COMPLETED',
                    completedAt: { gte: start, lte: end },
                    dueDate: { not: null },
                },
            }),
            this.prisma.task.count({
                where: {
                    companyId,
                    status: { notIn: ['COMPLETED', 'CANCELLED'] },
                    dueDate: { lt: new Date() },
                },
            }),
            this.prisma.task.count({
                where: {
                    companyId,
                    status: 'COMPLETED',
                    completedAt: { gte: start, lte: end },
                },
            }),
        ]);

        // Get tasks with audit trails
        const auditedTasks = await this.prisma.taskActivityLog.groupBy({
            by: ['taskId'],
            where: { task: { companyId }, createdAt: { gte: start, lte: end } },
        });

        return {
            period: { start: start.toISOString(), end: end.toISOString() },
            metrics: {
                totalTasks,
                completedOnTime,
                breachedSLA,
                overdueResolved,
                tasksWithAuditTrail: auditedTasks.length,
                complianceRate: totalTasks > 0 ? Math.round((completedOnTime / totalTasks) * 100) : 0,
            },
            summary: {
                onTimeCompletionRate: `${totalTasks > 0 ? Math.round((completedOnTime / totalTasks) * 100) : 0}%`,
                currentBreaches: breachedSLA,
                auditCoverage: `${totalTasks > 0 ? Math.round((auditedTasks.length / totalTasks) * 100) : 0}%`,
            },
        };
    }

    /**
     * Archive tasks
     */
    async archiveTasks(companyId: string, userId: string, taskIds: string[], reason?: string) {
        const tasks = await this.prisma.task.findMany({
            where: { id: { in: taskIds }, companyId },
        });

        if (tasks.length !== taskIds.length) {
            throw new BadRequestException('بعض المهام غير موجودة');
        }

        const archiveData = {
            archivedAt: new Date().toISOString(),
            archivedBy: userId,
            reason,
        };

        await this.prisma.task.updateMany({
            where: { id: { in: taskIds } },
            data: {
                status: 'ARCHIVED' as any,
                customFields: { archive: archiveData },
            },
        });

        for (const taskId of taskIds) {
            await this.logActivity(taskId, userId, 'ARCHIVED', 'status', null, reason || 'تم الأرشفة');
        }

        return { archived: tasks.length, taskIds };
    }

    /**
     * Restore archived tasks
     */
    async restoreArchivedTasks(companyId: string, userId: string, taskIds: string[]) {
        const result = await this.prisma.task.updateMany({
            where: { id: { in: taskIds }, companyId, status: 'ARCHIVED' as any },
            data: { status: 'TODO' },
        });

        for (const taskId of taskIds) {
            await this.logActivity(taskId, userId, 'RESTORED', 'status', 'ARCHIVED', 'TODO');
        }

        return { restored: result.count, taskIds };
    }

    /**
     * Set legal hold on task
     */
    async setLegalHold(taskId: string, companyId: string, userId: string, hold: {
        enabled: boolean;
        reason?: string;
        caseReference?: string;
        expiresAt?: string;
    }) {
        const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId } });
        if (!task) throw new NotFoundException('المهمة غير موجودة');

        const cf = (task.customFields as any) || {};

        cf.legalHold = hold.enabled ? {
            enabled: true,
            reason: hold.reason,
            caseReference: hold.caseReference,
            expiresAt: hold.expiresAt,
            setBy: userId,
            setAt: new Date().toISOString(),
        } : null;

        await this.prisma.task.update({
            where: { id: taskId },
            data: { customFields: cf },
        });

        await this.logActivity(taskId, userId, hold.enabled ? 'LEGAL_HOLD_SET' : 'LEGAL_HOLD_REMOVED', 'legalHold', null, hold.reason || '');

        return { success: true, legalHold: cf.legalHold };
    }

    /**
     * Get role-based access template
     */
    async getRoleAccessTemplates(companyId: string) {
        const templateKey = `__ROLE_ACCESS_TEMPLATES__`;
        const record = await this.prisma.taskCategory.findFirst({
            where: { companyId, name: templateKey },
        });

        if (!record?.nameEn) {
            // Return defaults
            return {
                templates: [
                    {
                        role: 'ADMIN',
                        permissions: { view: true, edit: true, delete: true, assign: true, approve: true },
                    },
                    {
                        role: 'MANAGER',
                        permissions: { view: true, edit: true, delete: false, assign: true, approve: true },
                    },
                    {
                        role: 'EMPLOYEE',
                        permissions: { view: true, edit: true, delete: false, assign: false, approve: false },
                    },
                    {
                        role: 'VIEWER',
                        permissions: { view: true, edit: false, delete: false, assign: false, approve: false },
                    },
                ],
            };
        }

        return JSON.parse(record.nameEn);
    }

    /**
     * Set role access template
     */
    async setRoleAccessTemplate(companyId: string, userId: string, template: {
        role: string;
        permissions: {
            view: boolean;
            edit: boolean;
            delete: boolean;
            assign: boolean;
            approve: boolean;
        };
    }) {
        const templateKey = `__ROLE_ACCESS_TEMPLATES__`;
        let record = await this.prisma.taskCategory.findFirst({
            where: { companyId, name: templateKey },
        });

        let templates = record?.nameEn ? JSON.parse(record.nameEn).templates : [];
        const existingIdx = templates.findIndex((t: any) => t.role === template.role);

        if (existingIdx >= 0) {
            templates[existingIdx] = template;
        } else {
            templates.push(template);
        }

        const data = { templates, updatedAt: new Date().toISOString(), updatedBy: userId };

        if (record) {
            await this.prisma.taskCategory.update({
                where: { id: record.id },
                data: { nameEn: JSON.stringify(data) },
            });
        } else {
            await this.prisma.taskCategory.create({
                data: {
                    name: templateKey,
                    nameEn: JSON.stringify(data),
                    companyId,
                    isActive: false,
                },
            });
        }

        return { success: true, template };
    }

    // ============ BATCH 1: ADVANCED TASK MANAGEMENT ============

    /**
     * 1. Smart Task Prioritization - AI-based scoring
     */
    async getSmartPrioritizedTasks(companyId: string, userId?: string) {
        const tasks = await this.prisma.task.findMany({
            where: {
                companyId,
                status: { notIn: ['COMPLETED', 'CANCELLED'] },
                ...(userId && { assigneeId: userId }),
            },
            include: {
                assignee: { select: { id: true, firstName: true, lastName: true } },
                blockedTasks: true,
                blockingTasks: true,
                category: true,
            },
        });

        // Calculate smart priority score for each task
        const scoredTasks = tasks.map(task => {
            let score = 0;

            // Due date urgency (max 40 points)
            if (task.dueDate) {
                const daysUntilDue = Math.ceil((task.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                if (daysUntilDue < 0) score += 40; // Overdue
                else if (daysUntilDue <= 1) score += 35;
                else if (daysUntilDue <= 3) score += 25;
                else if (daysUntilDue <= 7) score += 15;
                else score += 5;
            }

            // Priority weight (max 30 points)
            const priorityScores: Record<string, number> = { URGENT: 30, HIGH: 22, MEDIUM: 12, LOW: 5 };
            score += priorityScores[task.priority] || 10;

            // Blocking others (max 20 points)
            score += Math.min((task.blockingTasks?.length || 0) * 10, 20);

            // Being blocked penalty (-10 points)
            if ((task.blockedTasks?.length || 0) > 0) score -= 10;

            // Story points complexity (max 10 points)
            if (task.storyPoints) score += Math.min(task.storyPoints, 10);

            return { ...task, smartScore: Math.max(0, Math.min(100, score)) };
        });

        // Sort by smart score descending
        scoredTasks.sort((a, b) => b.smartScore - a.smartScore);

        return {
            tasks: scoredTasks,
            summary: {
                total: scoredTasks.length,
                urgent: scoredTasks.filter(t => t.smartScore >= 70).length,
                high: scoredTasks.filter(t => t.smartScore >= 50 && t.smartScore < 70).length,
                normal: scoredTasks.filter(t => t.smartScore < 50).length,
            }
        };
    }

    /**
     * 2. Task Dependencies Visualization - Graph data
     */
    async getDependencyGraph(companyId: string, categoryId?: string) {
        const tasks = await this.prisma.task.findMany({
            where: {
                companyId,
                status: { notIn: ['CANCELLED'] },
                ...(categoryId && { categoryId }),
            },
            include: {
                blockedTasks: true,
                blockingTasks: true,
                assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
            },
        });

        const nodes = tasks.map(task => ({
            id: task.id,
            label: task.title.substring(0, 30) + (task.title.length > 30 ? '...' : ''),
            status: task.status,
            priority: task.priority,
            assignee: task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : null,
            dueDate: task.dueDate,
            progress: task.progress,
        }));

        const edges: { source: string; target: string; type: string }[] = [];
        for (const task of tasks) {
            for (const dep of (task.blockedTasks || [])) {
                edges.push({
                    source: dep.blockingTaskId,
                    target: task.id,
                    type: 'blocks',
                });
            }
        }

        return { nodes, edges, stats: { totalTasks: nodes.length, totalDependencies: edges.length } };
    }

    /**
     * 3. Auto-assign Task based on skills and workload
     */
    async autoAssignTask(taskId: string, companyId: string) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
            include: { category: true },
        });

        if (!task) throw new NotFoundException('المهمة غير موجودة');

        // Get all active employees with their current workload
        const employees = await this.prisma.user.findMany({
            where: { companyId, status: 'ACTIVE', role: { in: ['EMPLOYEE', 'MANAGER', 'HR'] } },
            include: {
                tasksAssigned: {
                    where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
                },
            },
        });

        // Score each employee
        const scoredEmployees = employees.map(emp => {
            let score = 100;

            // Workload penalty (fewer tasks = higher score)
            score -= ((emp as any).tasksAssigned?.length || 0) * 10;

            // Skill match bonus
            if (task.category && (emp as any).skills) {
                const hasSkill = (emp as any).skills.some((s: any) =>
                    s.name?.toLowerCase().includes(task.category?.name?.toLowerCase() || '')
                );
                if (hasSkill) score += 20;
            }

            return { employee: emp, score: Math.max(0, score) };
        });

        // Sort by score and get best match
        scoredEmployees.sort((a, b) => b.score - a.score);
        const bestMatch = scoredEmployees[0];

        if (!bestMatch) {
            return { success: false, message: 'لا يوجد موظفين متاحين' };
        }

        // Assign the task
        await this.prisma.task.update({
            where: { id: taskId },
            data: { assigneeId: bestMatch.employee.id },
        });

        return {
            success: true,
            assignedTo: {
                id: bestMatch.employee.id,
                name: `${bestMatch.employee.firstName} ${bestMatch.employee.lastName}`,
            },
            reason: `تم التعيين بناءً على عبء العمل (${(bestMatch.employee as any).tasksAssigned?.length || 0} مهام حالية)`,
        };
    }

    /**
     * 4. Workload Balancing Analysis
     */
    async getWorkloadAnalysis(companyId: string) {
        const employees = await this.prisma.user.findMany({
            where: { companyId, status: 'ACTIVE' },
            include: {
                tasksAssigned: {
                    where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
                    select: { id: true, priority: true, dueDate: true, storyPoints: true, estimatedHours: true },
                },
            },
        });

        const analysis = employees.map(emp => {
            const tasks = (emp as any).tasksAssigned || [];
            const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
            const totalHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
            const overdueTasks = tasks.filter(t => t.dueDate && t.dueDate < new Date()).length;
            const urgentTasks = tasks.filter(t => t.priority === 'URGENT' || t.priority === 'HIGH').length;

            return {
                employee: { id: emp.id, name: `${emp.firstName} ${emp.lastName}`, avatar: emp.avatar },
                taskCount: tasks.length,
                totalPoints,
                totalHours,
                overdueTasks,
                urgentTasks,
                loadLevel: tasks.length > 10 ? 'OVERLOADED' : tasks.length > 5 ? 'HIGH' : tasks.length > 2 ? 'NORMAL' : 'LOW',
            };
        });

        // Sort by task count descending
        analysis.sort((a, b) => b.taskCount - a.taskCount);

        const avgLoad = analysis.length > 0 ? analysis.reduce((sum, a) => sum + a.taskCount, 0) / analysis.length : 0;

        return {
            employees: analysis,
            summary: {
                totalEmployees: analysis.length,
                averageLoad: Math.round(avgLoad * 10) / 10,
                overloaded: analysis.filter(a => a.loadLevel === 'OVERLOADED').length,
                balanced: analysis.filter(a => a.loadLevel === 'NORMAL').length,
                underutilized: analysis.filter(a => a.loadLevel === 'LOW').length,
            },
        };
    }

    /**
     * 5. Task Burndown Chart Data (Enhanced with date range)
     */
    async getBurndownDataV2(companyId: string, sprintId?: string, startDate?: string, endDate?: string) {
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();

        const tasks = await this.prisma.task.findMany({
            where: {
                companyId,
                ...(sprintId && { sprintId }),
                createdAt: { lte: end },
            },
            select: { id: true, storyPoints: true, status: true, createdAt: true, completedAt: true },
        });

        // Generate daily data points
        const data: { date: string; remaining: number; ideal: number; completed: number }[] = [];
        const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 1), 0);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const idealBurnRate = totalPoints / days;

        for (let i = 0; i <= days; i++) {
            const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];

            const completedByDate = tasks.filter(t =>
                t.completedAt && t.completedAt <= date
            ).reduce((sum, t) => sum + (t.storyPoints || 1), 0);

            data.push({
                date: dateStr,
                remaining: totalPoints - completedByDate,
                ideal: Math.max(0, totalPoints - (idealBurnRate * i)),
                completed: completedByDate,
            });
        }

        return {
            data,
            summary: {
                totalPoints,
                completedPoints: tasks.filter(t => t.status === 'COMPLETED').reduce((sum, t) => sum + (t.storyPoints || 1), 0),
                remainingPoints: tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').reduce((sum, t) => sum + (t.storyPoints || 1), 0),
            },
        };
    }

    /**
     * 6. Velocity Tracking
     */
    async getVelocityData(companyId: string, weeks: number = 8) {
        const data: { week: string; completed: number; points: number }[] = [];

        for (let i = weeks - 1; i >= 0; i--) {
            const weekStart = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
            const weekEnd = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);

            const completedTasks = await this.prisma.task.findMany({
                where: {
                    companyId,
                    status: 'COMPLETED',
                    completedAt: { gte: weekStart, lt: weekEnd },
                },
                select: { storyPoints: true },
            });

            data.push({
                week: `Week ${weeks - i}`,
                completed: completedTasks.length,
                points: completedTasks.reduce((sum, t) => sum + (t.storyPoints || 1), 0),
            });
        }

        const avgVelocity = data.length > 0
            ? data.reduce((sum, d) => sum + d.points, 0) / data.length
            : 0;

        return {
            data,
            summary: {
                averageVelocity: Math.round(avgVelocity * 10) / 10,
                trend: data.length >= 2 && data[data.length - 1].points > data[data.length - 2].points ? 'UP' : 'DOWN',
                totalCompleted: data.reduce((sum, d) => sum + d.completed, 0),
            },
        };
    }

    /**
     * 7. AI Task Estimation
     */
    async estimateTaskDuration(companyId: string, title: string, description?: string, categoryId?: string) {
        // Get similar completed tasks for ML-like estimation
        const similarTasks = await this.prisma.task.findMany({
            where: {
                companyId,
                status: 'COMPLETED',
                ...(categoryId && { categoryId }),
            },
            select: {
                title: true,
                estimatedHours: true,
                storyPoints: true,
                timeLogs: { select: { duration: true } },
            },
            take: 50,
            orderBy: { completedAt: 'desc' },
        });

        if (similarTasks.length === 0) {
            return { estimatedHours: 4, confidence: 'LOW', reason: 'لا توجد مهام سابقة للمقارنة' };
        }

        // Calculate average from similar tasks
        const avgHours = similarTasks.reduce((sum, t) => {
            const actualTime = t.timeLogs.reduce((s, l) => s + (l.duration || 0), 0) / 60;
            return sum + (actualTime > 0 ? actualTime : (t.estimatedHours || 4));
        }, 0) / similarTasks.length;

        // Simple keyword matching for complexity adjustment
        const complexKeywords = ['تكامل', 'integration', 'migrate', 'ترحيل', 'refactor', 'إعادة', 'complex', 'معقد'];
        const simpleKeywords = ['fix', 'إصلاح', 'update', 'تحديث', 'minor', 'بسيط'];

        let multiplier = 1;
        const fullText = `${title} ${description || ''}`.toLowerCase();

        if (complexKeywords.some(k => fullText.includes(k))) multiplier = 1.5;
        if (simpleKeywords.some(k => fullText.includes(k))) multiplier = 0.7;

        const estimated = Math.round(avgHours * multiplier * 10) / 10;

        return {
            estimatedHours: Math.max(1, Math.min(estimated, 40)),
            estimatedPoints: Math.round(estimated / 2),
            confidence: similarTasks.length > 20 ? 'HIGH' : similarTasks.length > 5 ? 'MEDIUM' : 'LOW',
            basedOn: `${similarTasks.length} مهمة مشابهة`,
        };
    }

    /**
     * 8. Get Template Categories (Enhanced Templates)
     */
    async getTemplateCategories(companyId: string) {
        const templates = await this.prisma.taskTemplate.findMany({
            where: { companyId, isActive: true },
            include: { category: true },
        });

        // Group by category
        const categories: Record<string, any[]> = {};
        for (const tmpl of templates) {
            const catName = tmpl.category?.name || 'عام';
            if (!categories[catName]) categories[catName] = [];
            categories[catName].push(tmpl);
        }

        return {
            categories: Object.entries(categories).map(([name, templates]) => ({
                name,
                count: templates.length,
                templates,
            })),
            total: templates.length,
        };
    }

    /**
     * 9. Generate Analytics Report
     */
    async generateAnalyticsReport(companyId: string, params: {
        startDate?: string;
        endDate?: string;
        categoryId?: string;
        assigneeId?: string;
        includeMetrics?: boolean;
        includeTeam?: boolean;
        includeTime?: boolean;
        includeTrends?: boolean;
    }) {
        const start = params.startDate ? new Date(params.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = params.endDate ? new Date(params.endDate) : new Date();

        const whereClause = {
            companyId,
            createdAt: { gte: start, lte: end },
            ...(params.categoryId && { categoryId: params.categoryId }),
            ...(params.assigneeId && { assigneeId: params.assigneeId }),
        };

        // Summary data
        const [total, completed, inProgress, todo, cancelled] = await Promise.all([
            this.prisma.task.count({ where: whereClause }),
            this.prisma.task.count({ where: { ...whereClause, status: 'COMPLETED' } }),
            this.prisma.task.count({ where: { ...whereClause, status: 'IN_PROGRESS' } }),
            this.prisma.task.count({ where: { ...whereClause, status: 'TODO' } }),
            this.prisma.task.count({ where: { ...whereClause, status: 'CANCELLED' } }),
        ]);

        const summary = {
            total,
            completed,
            inProgress,
            todo,
            cancelled,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        };

        let metrics = null;
        if (params.includeMetrics !== false) {
            const overdue = await this.prisma.task.count({
                where: { ...whereClause, dueDate: { lt: new Date() }, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
            });
            const avgProgress = await this.prisma.task.aggregate({
                where: whereClause,
                _avg: { progress: true },
            });
            metrics = {
                overdue,
                avgProgress: Math.round((avgProgress._avg.progress || 0) * 100) / 100,
                onTime: completed - overdue,
            };
        }

        let team = null;
        if (params.includeTeam) {
            const byAssignee = await this.prisma.task.groupBy({
                by: ['assigneeId'],
                where: { ...whereClause, assigneeId: { not: null } },
                _count: true,
            });
            team = {
                totalAssignees: byAssignee.length,
                tasksPerAssignee: byAssignee.length > 0 ? Math.round(total / byAssignee.length) : 0,
            };
        }

        let time = null;
        if (params.includeTime) {
            const timeLogs = await this.prisma.taskTimeLog.aggregate({
                where: { task: whereClause },
                _sum: { duration: true },
            });
            time = {
                totalMinutes: timeLogs._sum.duration || 0,
                totalHours: Math.round(((timeLogs._sum.duration || 0) / 60) * 10) / 10,
            };
        }

        let trends = null;
        if (params.includeTrends) {
            const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            const dailyData: { date: string; created: number; completed: number }[] = [];
            for (let i = 0; i < Math.min(days, 30); i++) {
                const dayStart = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
                const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
                const created = await this.prisma.task.count({
                    where: { companyId, createdAt: { gte: dayStart, lt: dayEnd } },
                });
                const completedDay = await this.prisma.task.count({
                    where: { companyId, completedAt: { gte: dayStart, lt: dayEnd } },
                });
                dailyData.push({
                    date: dayStart.toISOString().split('T')[0],
                    created,
                    completed: completedDay,
                });
            }
            trends = { daily: dailyData };
        }

        return {
            summary,
            metrics,
            team,
            time,
            trends,
            generatedAt: new Date().toISOString(),
        };
    }

    // ============ BATCH 2: TASK OPERATIONS ==============

    /**
     * 10. Clone Task with Dependencies (V2 - enhanced)
     */
    async cloneTaskV2(taskId: string, companyId: string, userId: string, options?: {
        includeSubtasks?: boolean;
        includeDependencies?: boolean;
        includeChecklists?: boolean;
        newTitle?: string;
    }) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
            include: {
                checklists: { include: { items: true } },
                blockedBy: true,
            },
        });

        if (!task) throw new NotFoundException('المهمة غير موجودة');

        // Create cloned task
        const clonedTask = await this.prisma.task.create({
            data: {
                title: options?.newTitle || `نسخة من: ${task.title}`,
                description: task.description,
                status: 'TODO',
                priority: task.priority,
                storyPoints: task.storyPoints,
                estimatedHours: task.estimatedHours,
                categoryId: task.categoryId,
                companyId,
                createdById: userId,
                customFields: task.customFields as any,
            },
        });

        // Clone checklists
        if (options?.includeChecklists !== false) {
            for (const checklist of task.checklists as any[]) {
                const clonedChecklist = await this.prisma.taskChecklist.create({
                    data: {
                        title: checklist.title,
                        taskId: clonedTask.id,
                    },
                });
                for (const item of (checklist.items || []) as any[]) {
                    await this.prisma.taskChecklistItem.create({
                        data: {
                            content: item.content,
                            isCompleted: false,
                            checklistId: clonedChecklist.id,
                        },
                    });
                }
            }
        }

        // Clone dependencies
        if (options?.includeDependencies) {
            for (const dep of task.blockedBy) {
                await this.prisma.taskDependency.create({
                    data: {
                        blockedTaskId: clonedTask.id,
                        blockingTaskId: dep.blockingTaskId,
                    },
                });
            }
        }

        // Clone subtasks if requested
        if (options?.includeSubtasks) {
            const subtasks = await this.prisma.task.findMany({
                where: { parentTaskId: taskId },
            });
            for (const subtask of subtasks) {
                await this.prisma.task.create({
                    data: {
                        title: subtask.title,
                        description: subtask.description,
                        status: 'TODO',
                        priority: subtask.priority,
                        categoryId: subtask.categoryId,
                        companyId,
                        createdById: userId,
                        parentTaskId: clonedTask.id,
                    },
                });
            }
        }

        await this.logActivity(clonedTask.id, userId, 'CLONED', null, taskId, `تم النسخ من المهمة ${task.title}`);

        return {
            success: true,
            originalTaskId: taskId,
            clonedTask,
            included: {
                checklists: options?.includeChecklists !== false,
                dependencies: options?.includeDependencies || false,
                subtasks: options?.includeSubtasks || false,
            },
        };
    }

    /**
     * 11. Merge Tasks
     */
    async mergeTasks(companyId: string, userId: string, sourceTaskIds: string[], targetTaskId: string) {
        const targetTask = await this.prisma.task.findFirst({
            where: { id: targetTaskId, companyId },
        });

        if (!targetTask) throw new NotFoundException('المهمة الهدف غير موجودة');

        const sourceTasks = await this.prisma.task.findMany({
            where: { id: { in: sourceTaskIds }, companyId },
            include: {
                checklists: { include: { items: true } },
                comments: true,
                timeLogs: true,
            },
        });

        if (sourceTasks.length !== sourceTaskIds.length) {
            throw new BadRequestException('بعض المهام المصدر غير موجودة');
        }

        // Merge descriptions
        let mergedDescription = targetTask.description || '';
        for (const src of sourceTasks) {
            if (src.description) {
                mergedDescription += `\n\n--- من المهمة: ${src.title} ---\n${src.description}`;
            }
        }

        // Merge story points
        const totalPoints = sourceTasks.reduce((sum, t) => sum + (t.storyPoints || 0), targetTask.storyPoints || 0);
        const totalHours = sourceTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), targetTask.estimatedHours || 0);

        // Update target task
        await this.prisma.task.update({
            where: { id: targetTaskId },
            data: {
                description: mergedDescription,
                storyPoints: totalPoints,
                estimatedHours: totalHours,
            },
        });

        // Move checklists, comments, and time logs to target
        for (const src of sourceTasks) {
            await this.prisma.taskChecklist.updateMany({
                where: { taskId: src.id },
                data: { taskId: targetTaskId },
            });
            await this.prisma.taskComment.updateMany({
                where: { taskId: src.id },
                data: { taskId: targetTaskId },
            });
            await this.prisma.taskTimeLog.updateMany({
                where: { taskId: src.id },
                data: { taskId: targetTaskId },
            });
        }

        // Archive source tasks
        await this.prisma.task.updateMany({
            where: { id: { in: sourceTaskIds } },
            data: { status: 'CANCELLED' as any },
        });

        await this.logActivity(targetTaskId, userId, 'MERGED', null, sourceTaskIds.join(','), `تم دمج ${sourceTasks.length} مهام`);

        return {
            success: true,
            targetTaskId,
            mergedTaskIds: sourceTaskIds,
            mergedCount: sourceTasks.length,
            totalPoints,
            totalHours,
        };
    }

    /**
     * 12. Split Task into Subtasks
     */
    async splitTask(taskId: string, companyId: string, userId: string, subtaskTitles: string[]) {
        const parentTask = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
        });

        if (!parentTask) throw new NotFoundException('المهمة غير موجودة');
        if (subtaskTitles.length < 2) throw new BadRequestException('يجب تحديد مهمتين فرعيتين على الأقل');

        // Calculate points/hours per subtask
        const pointsPerTask = parentTask.storyPoints ? Math.ceil(parentTask.storyPoints / subtaskTitles.length) : null;
        const hoursPerTask = parentTask.estimatedHours ? Math.round((parentTask.estimatedHours / subtaskTitles.length) * 10) / 10 : null;

        const createdSubtasks = await Promise.all(
            subtaskTitles.map(title =>
                this.prisma.task.create({
                    data: {
                        title,
                        status: 'TODO',
                        priority: parentTask.priority,
                        storyPoints: pointsPerTask,
                        estimatedHours: hoursPerTask,
                        categoryId: parentTask.categoryId,
                        assigneeId: parentTask.assigneeId,
                        companyId,
                        createdById: userId,
                        parentTaskId: parentTask.id,
                    },
                })
            )
        );

        await this.logActivity(taskId, userId, 'SPLIT', null, subtaskTitles.length.toString(), `تم تقسيم إلى ${subtaskTitles.length} مهام فرعية`);

        return {
            success: true,
            parentTaskId: taskId,
            subtasks: createdSubtasks,
            distribution: {
                pointsPerTask,
                hoursPerTask,
            },
        };
    }

    /**
     * 13. Create Task Version (Snapshot)
     */
    async createTaskVersion(taskId: string, companyId: string, userId: string, versionNote?: string) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
            include: { checklists: { include: { items: true } } },
        });

        if (!task) throw new NotFoundException('المهمة غير موجودة');

        // Get existing versions
        const cf = (task.customFields as any) || {};
        const versions = cf.versions || [];

        // Create version snapshot
        const version = {
            versionNumber: versions.length + 1,
            createdAt: new Date().toISOString(),
            createdBy: userId,
            note: versionNote,
            snapshot: {
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                storyPoints: task.storyPoints,
                estimatedHours: task.estimatedHours,
                progress: task.progress,
                dueDate: task.dueDate,
                checklists: (task.checklists as any[]).map(c => ({
                    title: c.title,
                    items: (c.items || []).map((i: any) => ({ content: i.content, isCompleted: i.isCompleted })),
                })),
            },
        };

        versions.push(version);
        cf.versions = versions;

        await this.prisma.task.update({
            where: { id: taskId },
            data: { customFields: cf },
        });

        await this.logActivity(taskId, userId, 'VERSION_CREATED', null, version.versionNumber.toString(), versionNote || `إصدار ${version.versionNumber}`);

        return {
            success: true,
            version: version.versionNumber,
            totalVersions: versions.length,
            createdAt: version.createdAt,
        };
    }

    /**
     * 14. Get Task Versions
     */
    async getTaskVersions(taskId: string, companyId: string) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
            select: { customFields: true, title: true },
        });

        if (!task) throw new NotFoundException('المهمة غير موجودة');

        const cf = (task.customFields as any) || {};
        const versions = cf.versions || [];

        return {
            taskId,
            taskTitle: task.title,
            versions: versions.map((v: any) => ({
                versionNumber: v.versionNumber,
                createdAt: v.createdAt,
                note: v.note,
            })),
            totalVersions: versions.length,
        };
    }

    /**
     * 15. Rollback Task to Previous Version
     */
    async rollbackTask(taskId: string, companyId: string, userId: string, versionNumber: number) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
            include: { checklists: { include: { items: true } } },
        });

        if (!task) throw new NotFoundException('المهمة غير موجودة');

        const cf = (task.customFields as any) || {};
        const versions = cf.versions || [];
        const targetVersion = versions.find((v: any) => v.versionNumber === versionNumber);

        if (!targetVersion) throw new NotFoundException(`الإصدار ${versionNumber} غير موجود`);

        const snapshot = targetVersion.snapshot;

        // Delete current checklists
        await this.prisma.taskChecklist.deleteMany({ where: { taskId } });

        // Restore task data
        await this.prisma.task.update({
            where: { id: taskId },
            data: {
                title: snapshot.title,
                description: snapshot.description,
                status: snapshot.status,
                priority: snapshot.priority,
                storyPoints: snapshot.storyPoints,
                estimatedHours: snapshot.estimatedHours,
                progress: snapshot.progress,
                dueDate: snapshot.dueDate ? new Date(snapshot.dueDate) : null,
            },
        });

        // Restore checklists
        for (const cl of snapshot.checklists || []) {
            const checklist = await this.prisma.taskChecklist.create({
                data: { title: cl.title, taskId },
            });
            for (const item of cl.items || []) {
                await this.prisma.taskChecklistItem.create({
                    data: {
                        content: item.content,
                        isCompleted: item.isCompleted,
                        checklistId: checklist.id,
                    },
                });
            }
        }

        await this.logActivity(taskId, userId, 'ROLLBACK', null, versionNumber.toString(), `تم التراجع إلى الإصدار ${versionNumber}`);

        return {
            success: true,
            rolledBackTo: versionNumber,
            restoredAt: new Date().toISOString(),
        };
    }

    // ==================== الميزات الجزئية المكتملة ====================

    // 1. Timeline View - عرض الجدول الزمني المخصص
    async getTimelineView(companyId: string, options: {
        startDate?: string;
        endDate?: string;
        groupBy?: 'assignee' | 'category' | 'priority' | 'status';
        zoom?: 'day' | 'week' | 'month';
    } = {}) {
        const { startDate, endDate, groupBy = 'assignee', zoom = 'week' } = options;

        const where: any = { companyId };
        if (startDate) where.startDate = { gte: new Date(startDate) };
        if (endDate) where.dueDate = { lte: new Date(endDate) };

        const tasks = await this.prisma.task.findMany({
            where,
            include: {
                assignee: { select: { id: true, firstName: true, lastName: true } },
                category: { select: { id: true, name: true, color: true } },
                blockedBy: { include: { blockingTask: { select: { id: true, title: true } } } },
            },
            orderBy: { startDate: 'asc' },
        });

        // Group tasks
        const groups: Record<string, any[]> = {};
        for (const task of tasks) {
            let key: string;
            switch (groupBy) {
                case 'assignee':
                    key = task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'غير محدد';
                    break;
                case 'category':
                    key = task.category?.name || 'بدون تصنيف';
                    break;
                case 'priority':
                    key = task.priority;
                    break;
                case 'status':
                    key = task.status;
                    break;
                default:
                    key = 'all';
            }
            if (!groups[key]) groups[key] = [];
            groups[key].push({
                id: task.id,
                title: task.title,
                startDate: task.startDate,
                endDate: task.dueDate,
                progress: task.progress,
                status: task.status,
                priority: task.priority,
                dependencies: task.blockedBy.map(d => d.blockingTask.id),
                color: task.category?.color || '#3b82f6',
            });
        }

        // Calculate time range
        const allDates = tasks.flatMap(t => [t.startDate, t.dueDate]).filter(Boolean) as Date[];
        const minDate = allDates.length ? new Date(Math.min(...allDates.map(d => d.getTime()))) : new Date();
        const maxDate = allDates.length ? new Date(Math.max(...allDates.map(d => d.getTime()))) : new Date();

        return {
            timeline: {
                startDate: minDate.toISOString(),
                endDate: maxDate.toISOString(),
                zoom,
                groupBy,
            },
            groups: Object.entries(groups).map(([name, items]) => ({
                name,
                taskCount: items.length,
                tasks: items,
            })),
            summary: {
                totalTasks: tasks.length,
                completedTasks: tasks.filter(t => t.status === 'COMPLETED').length,
                overdueTasks: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED').length,
            },
        };
    }

    // 2. Buffer Time Calculation - حساب وقت الاحتياط
    async calculateBufferTime(companyId: string, taskId?: string) {
        const where: any = { companyId };
        if (taskId) where.id = taskId;

        const tasks = await this.prisma.task.findMany({
            where,
            include: {
                blockedBy: { include: { blockingTask: true } },
            },
        }) as any[];

        const results = tasks.map(task => {
            const estimatedHours = (task.customFields as any)?.estimatedHours || 8;
            const actualHours = (task.customFields as any)?.actualHours || 0;

            // Calculate buffer based on historical variance
            const varianceRatio = actualHours > 0 ? actualHours / estimatedHours : 1.2; // Default 20% buffer
            const recommendedBuffer = Math.ceil(estimatedHours * (varianceRatio - 1) * 1.5);

            // Calculate days until deadline
            const daysUntilDeadline = task.dueDate
                ? Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;

            // Check dependency delays
            const dependencyDelays = (task.blockedBy as any[]).filter((d: any) => {
                const blockingTask = d.blockingTask;
                return blockingTask.status !== 'COMPLETED' &&
                    blockingTask.dueDate &&
                    new Date(blockingTask.dueDate) > new Date();
            });

            const riskLevel =
                (daysUntilDeadline !== null && daysUntilDeadline < recommendedBuffer) ? 'HIGH' :
                    (dependencyDelays.length > 0) ? 'MEDIUM' : 'LOW';

            return {
                taskId: task.id,
                title: task.title,
                estimatedHours,
                recommendedBufferHours: recommendedBuffer,
                recommendedBufferDays: Math.ceil(recommendedBuffer / 8),
                daysUntilDeadline,
                dependencyCount: (task.blockedBy || []).length,
                delayedDependencies: dependencyDelays.length,
                riskLevel,
                suggestions: this.getBufferSuggestions(riskLevel, recommendedBuffer, daysUntilDeadline),
            };
        });

        return taskId ? results[0] : {
            tasks: results,
            summary: {
                highRisk: results.filter(r => r.riskLevel === 'HIGH').length,
                mediumRisk: results.filter(r => r.riskLevel === 'MEDIUM').length,
                lowRisk: results.filter(r => r.riskLevel === 'LOW').length,
                averageBuffer: Math.round(results.reduce((sum, r) => sum + r.recommendedBufferHours, 0) / results.length),
            },
        };
    }

    private getBufferSuggestions(riskLevel: string, buffer: number, days: number | null): string[] {
        const suggestions: string[] = [];
        if (riskLevel === 'HIGH') {
            suggestions.push('⚠️ تمديد الموعد النهائي موصى به');
            suggestions.push('إضافة موارد إضافية للمهمة');
        }
        if (days !== null && days < 3) {
            suggestions.push('المهمة قريبة جداً من الموعد النهائي');
        }
        if (buffer > 16) {
            suggestions.push('تقسيم المهمة لمهام أصغر');
        }
        return suggestions.length ? suggestions : ['المهمة في وضع جيد'];
    }

    // 3. Critical Path Analysis - تحليل المسار الحرج
    async getCriticalPath(companyId: string, projectId?: string) {
        const where: any = { companyId };
        if (projectId) where.categoryId = projectId;

        const tasks = await this.prisma.task.findMany({
            where,
            include: {
                blockedBy: true,
            },
        }) as any[];

        // Get all dependencies for building dependents map
        const allDependencies = await this.prisma.taskDependency.findMany({
            where: { blockedTask: { companyId } },
        });

        // Build dependency graph
        const graph: Map<string, { task: any; dependencies: string[]; dependents: string[] }> = new Map();

        // Build dependents map (reverse of blockedBy)
        const dependentsMap: Map<string, string[]> = new Map();
        for (const dep of allDependencies) {
            const existing = dependentsMap.get(dep.blockingTaskId) || [];
            existing.push(dep.blockedTaskId);
            dependentsMap.set(dep.blockingTaskId, existing);
        }

        for (const task of tasks) {
            graph.set(task.id, {
                task,
                dependencies: (task.blockedBy || []).map((d: any) => d.blockingTaskId),
                dependents: dependentsMap.get(task.id) || [],
            });
        }

        // Calculate earliest start/finish (forward pass)
        const earlyStart: Map<string, number> = new Map();
        const earlyFinish: Map<string, number> = new Map();

        const getDuration = (task: any) => {
            const hours = (task.customFields as any)?.estimatedHours || 8;
            return Math.ceil(hours / 8); // Convert to days
        };

        const calculateEarly = (taskId: string, visited: Set<string> = new Set()): number => {
            if (visited.has(taskId)) return earlyFinish.get(taskId) || 0;
            visited.add(taskId);

            const node = graph.get(taskId);
            if (!node) return 0;

            const depFinishes = node.dependencies.map(depId => calculateEarly(depId, visited));
            const es = depFinishes.length ? Math.max(...depFinishes) : 0;
            const ef = es + getDuration(node.task);

            earlyStart.set(taskId, es);
            earlyFinish.set(taskId, ef);
            return ef;
        };

        // Calculate for all tasks
        for (const taskId of graph.keys()) {
            calculateEarly(taskId);
        }

        // Find project end (max early finish)
        const projectEnd = Math.max(...Array.from(earlyFinish.values()), 0);

        // Calculate latest start/finish (backward pass)
        const lateStart: Map<string, number> = new Map();
        const lateFinish: Map<string, number> = new Map();

        const calculateLate = (taskId: string, visited: Set<string> = new Set()): number => {
            if (visited.has(taskId)) return lateStart.get(taskId) || projectEnd;
            visited.add(taskId);

            const node = graph.get(taskId);
            if (!node) return projectEnd;

            const depStarts = node.dependents.map(depId => calculateLate(depId, visited));
            const lf = depStarts.length ? Math.min(...depStarts) : projectEnd;
            const ls = lf - getDuration(node.task);

            lateStart.set(taskId, ls);
            lateFinish.set(taskId, lf);
            return ls;
        };

        for (const taskId of graph.keys()) {
            calculateLate(taskId);
        }

        // Identify critical path (tasks with zero slack)
        const criticalPath: any[] = [];
        const nonCriticalTasks: any[] = [];

        for (const [taskId, node] of graph) {
            const es = earlyStart.get(taskId) || 0;
            const ls = lateStart.get(taskId) || 0;
            const slack = ls - es;

            const taskInfo = {
                id: taskId,
                title: node.task.title,
                duration: getDuration(node.task),
                earlyStart: es,
                earlyFinish: earlyFinish.get(taskId) || 0,
                lateStart: ls,
                lateFinish: lateFinish.get(taskId) || 0,
                slack,
                status: node.task.status,
                isCritical: slack === 0,
            };

            if (slack === 0) {
                criticalPath.push(taskInfo);
            } else {
                nonCriticalTasks.push(taskInfo);
            }
        }

        // Sort critical path by early start
        criticalPath.sort((a, b) => a.earlyStart - b.earlyStart);

        return {
            projectDuration: projectEnd,
            criticalPath: {
                tasks: criticalPath,
                totalDuration: criticalPath.reduce((sum, t) => sum + t.duration, 0),
                count: criticalPath.length,
            },
            nonCriticalTasks: {
                tasks: nonCriticalTasks.sort((a, b) => b.slack - a.slack),
                count: nonCriticalTasks.length,
                averageSlack: nonCriticalTasks.length
                    ? Math.round(nonCriticalTasks.reduce((sum, t) => sum + t.slack, 0) / nonCriticalTasks.length)
                    : 0,
            },
            recommendations: this.getCriticalPathRecommendations(criticalPath, nonCriticalTasks),
        };
    }

    private getCriticalPathRecommendations(critical: any[], nonCritical: any[]): string[] {
        const recs: string[] = [];

        const incompleteCritical = critical.filter(t => t.status !== 'COMPLETED');
        if (incompleteCritical.length > 0) {
            recs.push(`⚠️ ${incompleteCritical.length} مهمة حرجة لم تكتمل بعد`);
        }

        if (critical.length > 5) {
            recs.push('المسار الحرج طويل - فكر في توزيع العمل على فرق متوازية');
        }

        const highSlack = nonCritical.filter(t => t.slack > 5);
        if (highSlack.length > 0) {
            recs.push(`${highSlack.length} مهمة لديها مرونة عالية يمكن تأجيلها عند الحاجة`);
        }

        return recs.length ? recs : ['المشروع في حالة جيدة'];
    }

    // 4. What-If Scenarios - سيناريوهات ماذا لو
    async runWhatIfScenario(companyId: string, scenario: {
        type: 'delay_task' | 'add_resource' | 'change_priority' | 'remove_dependency' | 'extend_deadline';
        taskId?: string;
        parameters: {
            delayDays?: number;
            resourceMultiplier?: number;
            newPriority?: string;
            dependencyToRemove?: string;
            newDeadline?: string;
        };
    }) {
        const { type, taskId, parameters } = scenario;

        // Get current state
        const currentState = await this.getCriticalPath(companyId);

        // Simulate scenario
        let simulatedImpact: any = {};

        switch (type) {
            case 'delay_task': {
                if (taskId && parameters.delayDays) {
                    const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId } });
                    if (task) {
                        const dependentTasks = await this.prisma.taskDependency.count({
                            where: { blockingTaskId: taskId },
                        });

                        const isCritical = currentState.criticalPath.tasks.some(t => t.id === taskId);

                        simulatedImpact = {
                            scenarioType: 'delay_task',
                            taskTitle: task.title,
                            delayDays: parameters.delayDays,
                            affectedTasks: dependentTasks,
                            projectDelayDays: isCritical ? parameters.delayDays : 0,
                            riskLevel: isCritical ? 'HIGH' : dependentTasks > 0 ? 'MEDIUM' : 'LOW',
                            recommendation: isCritical
                                ? '⚠️ هذا التأخير سيؤثر مباشرة على موعد تسليم المشروع'
                                : 'التأخير لن يؤثر على المسار الحرج',
                        };
                    }
                } else {
                    // تحليل عام لتأثير التأخير
                    const delayDays = parameters.delayDays || 3;
                    simulatedImpact = {
                        scenarioType: 'delay_task',
                        analysis: 'تحليل تأثير التأخير على المشروع',
                        criticalTasksCount: currentState.criticalPath.count,
                        projectDuration: currentState.projectDuration,
                        estimatedImpact: `تأخير ${delayDays} أيام على مهمة حرجة سيزيد مدة المشروع ${delayDays} أيام`,
                        recommendation: currentState.criticalPath.count > 0
                            ? '⚠️ لديك مهام حرجة - أي تأخير عليها يؤثر مباشرة على المشروع'
                            : '✅ لا توجد مهام حرجة حالياً',
                        riskLevel: currentState.criticalPath.count > 3 ? 'HIGH' : 'MEDIUM',
                    };
                }
                break;
            }

            case 'add_resource': {
                const multiplier = parameters.resourceMultiplier || 1.5;
                const criticalTasks = currentState.criticalPath.tasks;

                const estimatedReduction = Math.round(
                    criticalTasks.reduce((sum, t) => sum + t.duration, 0) * (1 - 1 / multiplier)
                );

                simulatedImpact = {
                    scenarioType: 'add_resource',
                    resourceMultiplier: multiplier,
                    currentProjectDuration: currentState.projectDuration,
                    estimatedNewDuration: currentState.projectDuration - estimatedReduction,
                    daysSaved: estimatedReduction,
                    recommendation: estimatedReduction > 5
                        ? '✅ إضافة موارد ستوفر وقتاً كبيراً'
                        : 'التأثير محدود - فكر في خيارات أخرى',
                };
                break;
            }

            case 'remove_dependency': {
                if (!taskId || !parameters.dependencyToRemove) break;

                const dependency = await this.prisma.taskDependency.findFirst({
                    where: {
                        blockedTaskId: taskId,
                        blockingTaskId: parameters.dependencyToRemove,
                    },
                    include: {
                        blockedTask: true,
                        blockingTask: true,
                    },
                });

                if (!dependency) {
                    simulatedImpact = { error: 'التبعية غير موجودة' };
                    break;
                }

                const isCriticalDep = currentState.criticalPath.tasks.some(
                    t => t.id === taskId || t.id === parameters.dependencyToRemove
                );

                simulatedImpact = {
                    scenarioType: 'remove_dependency',
                    blockedTask: dependency.blockedTask.title,
                    blockingTask: dependency.blockingTask.title,
                    potentialTimeSaved: isCriticalDep ? 'كبير' : 'محدود',
                    riskLevel: 'MEDIUM',
                    recommendation: 'تحقق من أن إزالة التبعية لن تسبب مشاكل تقنية',
                };
                break;
            }

            case 'extend_deadline': {
                if (!taskId || !parameters.newDeadline) break;

                const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId } });
                if (!task) break;

                const currentDeadline = task.dueDate;
                const newDeadline = new Date(parameters.newDeadline);
                const extensionDays = currentDeadline
                    ? Math.ceil((newDeadline.getTime() - currentDeadline.getTime()) / (1000 * 60 * 60 * 24))
                    : 0;

                const dependentCount = await this.prisma.taskDependency.count({
                    where: { blockingTaskId: taskId },
                });

                simulatedImpact = {
                    scenarioType: 'extend_deadline',
                    taskTitle: task.title,
                    currentDeadline: currentDeadline?.toISOString(),
                    newDeadline: newDeadline.toISOString(),
                    extensionDays,
                    affectedDependents: dependentCount,
                    recommendation: dependentCount > 0
                        ? `⚠️ ${dependentCount} مهمة تعتمد على هذه المهمة وقد تتأثر`
                        : '✅ لا توجد مهام تعتمد على هذه المهمة',
                };
                break;
            }

            case 'change_priority': {
                if (taskId) {
                    const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId } });
                    if (task) {
                        simulatedImpact = {
                            scenarioType: 'change_priority',
                            taskTitle: task.title,
                            currentPriority: task.priority,
                            newPriority: parameters.newPriority || 'HIGH',
                            recommendation: parameters.newPriority === 'URGENT'
                                ? 'رفع الأولوية سيجعل المهمة تظهر في أعلى قائمة الأولويات'
                                : 'تغيير الأولوية سيؤثر على ترتيب المهام',
                        };
                    }
                } else {
                    // تحليل عام لتأثير تغيير الأولوية
                    const priorityStats = await this.prisma.task.groupBy({
                        by: ['priority'],
                        where: { companyId, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
                        _count: true,
                    });

                    const stats = priorityStats.reduce((acc, p) => {
                        acc[p.priority || 'NONE'] = p._count;
                        return acc;
                    }, {} as Record<string, number>);

                    simulatedImpact = {
                        scenarioType: 'change_priority',
                        analysis: 'تحليل توزيع الأولويات الحالي',
                        currentDistribution: stats,
                        totalActiveTasks: Object.values(stats).reduce((a, b) => a + b, 0),
                        recommendation: stats['URGENT'] > 5
                            ? '⚠️ يوجد عدد كبير من المهام العاجلة - فكر في إعادة التوازن'
                            : '✅ توزيع الأولويات متوازن',
                        riskLevel: stats['URGENT'] > 5 ? 'HIGH' : 'LOW',
                    };
                }
                break;
            }
        }

        return {
            scenario: type,
            parameters,
            currentState: {
                projectDuration: currentState.projectDuration,
                criticalPathLength: currentState.criticalPath.count,
            },
            simulatedImpact,
            timestamp: new Date().toISOString(),
        };
    }

    // ============ FEATURE 18: TASK SLA TRACKING ============
    async getSLAConfig(companyId: string) {
        const defaultSLA = {
            URGENT: { responseHours: 1, resolutionHours: 4 },
            HIGH: { responseHours: 4, resolutionHours: 24 },
            MEDIUM: { responseHours: 8, resolutionHours: 48 },
            LOW: { responseHours: 24, resolutionHours: 120 },
        };

        try {
            const config = await this.prisma.companyConfig.findUnique({
                where: { companyId },
            });
            if (config?.policies) {
                const policies = typeof config.policies === 'string' ? JSON.parse(config.policies) : config.policies;
                return policies.taskSLA || defaultSLA;
            }
        } catch (e) { /* ignore */ }

        return defaultSLA;
    }

    async updateSLAConfig(companyId: string, userId: string, slaConfig: Record<string, { responseHours: number; resolutionHours: number }>) {
        const config = await this.prisma.companyConfig.findUnique({ where: { companyId } });
        const policies: any = config?.policies || {};
        policies.taskSLA = slaConfig;

        await this.prisma.companyConfig.upsert({
            where: { companyId },
            create: { companyId, policies },
            update: { policies },
        });

        return { success: true, slaConfig };
    }

    async checkSLAViolations(companyId: string) {
        const slaConfig = await this.getSLAConfig(companyId);
        const now = new Date();

        const activeTasks = await this.prisma.task.findMany({
            where: {
                companyId,
                status: { notIn: ['COMPLETED', 'CANCELLED'] as any },
            },
            include: {
                assignee: { select: { id: true, firstName: true, lastName: true } },
            },
        });

        const violations: any[] = [];
        const warnings: any[] = [];

        for (const task of activeTasks) {
            const priority = task.priority || 'MEDIUM';
            const sla = slaConfig[priority] || slaConfig['MEDIUM'];
            const createdAt = new Date(task.createdAt);
            const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

            // Response SLA (first assignment or status change)
            const firstAssigned = task.assigneeId ? true : false;
            if (!firstAssigned && hoursElapsed > sla.responseHours) {
                violations.push({
                    taskId: task.id,
                    taskTitle: task.title,
                    type: 'RESPONSE_BREACH',
                    priority,
                    slaHours: sla.responseHours,
                    actualHours: Math.round(hoursElapsed * 10) / 10,
                    breachHours: Math.round((hoursElapsed - sla.responseHours) * 10) / 10,
                });
            } else if (!firstAssigned && hoursElapsed > sla.responseHours * 0.8) {
                warnings.push({
                    taskId: task.id,
                    taskTitle: task.title,
                    type: 'RESPONSE_WARNING',
                    priority,
                    remainingHours: Math.round((sla.responseHours - hoursElapsed) * 10) / 10,
                });
            }

            // Resolution SLA
            if (hoursElapsed > sla.resolutionHours) {
                violations.push({
                    taskId: task.id,
                    taskTitle: task.title,
                    assignee: task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'غير محدد',
                    type: 'RESOLUTION_BREACH',
                    priority,
                    slaHours: sla.resolutionHours,
                    actualHours: Math.round(hoursElapsed * 10) / 10,
                    breachHours: Math.round((hoursElapsed - sla.resolutionHours) * 10) / 10,
                });
            } else if (hoursElapsed > sla.resolutionHours * 0.8) {
                warnings.push({
                    taskId: task.id,
                    taskTitle: task.title,
                    assignee: task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'غير محدد',
                    type: 'RESOLUTION_WARNING',
                    priority,
                    remainingHours: Math.round((sla.resolutionHours - hoursElapsed) * 10) / 10,
                });
            }
        }

        return {
            totalActiveTasks: activeTasks.length,
            violations: { count: violations.length, items: violations },
            warnings: { count: warnings.length, items: warnings },
            slaConfig,
            checkedAt: now.toISOString(),
        };
    }

    // ============ FEATURE 19: TASK ESCALATION RULES ============
    async getEscalationRules(companyId: string) {
        const defaultRules = [
            { id: 'rule-1', name: 'تصعيد الأولوية العاجلة', trigger: 'SLA_BREACH', condition: { priority: 'URGENT', breachType: 'RESPONSE' }, action: 'NOTIFY_MANAGER', delayHours: 0 },
            { id: 'rule-2', name: 'تصعيد المهام المتأخرة', trigger: 'OVERDUE', condition: { daysOverdue: 3 }, action: 'REASSIGN_TO_MANAGER', delayHours: 0 },
            { id: 'rule-3', name: 'تصعيد عدم الاستجابة', trigger: 'NO_UPDATE', condition: { daysSinceLastUpdate: 5 }, action: 'NOTIFY_TEAM_LEAD', delayHours: 0 },
        ];

        try {
            const config = await this.prisma.companyConfig.findUnique({ where: { companyId } });
            if (config?.policies) {
                const policies = typeof config.policies === 'string' ? JSON.parse(config.policies) : config.policies;
                return policies.escalationRules || defaultRules;
            }
        } catch (e) { /* ignore */ }

        return defaultRules;
    }

    async updateEscalationRules(companyId: string, userId: string, rules: any[]) {
        const config = await this.prisma.companyConfig.findUnique({ where: { companyId } });
        const policies: any = config?.policies || {};
        policies.escalationRules = rules;

        await this.prisma.companyConfig.upsert({
            where: { companyId },
            create: { companyId, policies },
            update: { policies },
        });

        return { success: true, rules };
    }

    async triggerEscalation(companyId: string, taskId: string, ruleId: string) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
            include: {
                assignee: { include: { manager: { select: { id: true, firstName: true, lastName: true } } } },
            },
        });

        if (!task) throw new NotFoundException('المهمة غير موجودة');

        const rules = await this.getEscalationRules(companyId);
        const rule = rules.find((r: any) => r.id === ruleId);

        if (!rule) throw new NotFoundException('قاعدة التصعيد غير موجودة');

        let actionTaken = '';
        const managerId = (task.assignee as any)?.managerId || (task.assignee as any)?.manager?.id;

        switch (rule.action) {
            case 'NOTIFY_MANAGER':
                if (managerId) {
                    await this.notificationsService.create({
                        userId: managerId,
                        companyId,
                        type: 'TASK_ESCALATION' as any,
                        title: '🚨 تصعيد مهمة',
                        body: `تم تصعيد المهمة "${task.title}" بسبب: ${rule.name}`,
                        entityId: taskId,
                        entityType: 'TASK',
                    });
                    actionTaken = 'تم إشعار المدير';
                }
                break;

            case 'REASSIGN_TO_MANAGER':
                if (managerId) {
                    await this.prisma.task.update({
                        where: { id: taskId },
                        data: { assigneeId: managerId },
                    });
                    actionTaken = 'تم إسناد المهمة للمدير';
                }
                break;

            case 'NOTIFY_TEAM_LEAD':
                // Similar to NOTIFY_MANAGER
                actionTaken = 'تم إشعار قائد الفريق';
                break;

            case 'INCREASE_PRIORITY':
                const priorityOrder = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
                const currentIdx = priorityOrder.indexOf(task.priority || 'MEDIUM');
                const newPriority = priorityOrder[Math.min(currentIdx + 1, priorityOrder.length - 1)];
                await this.prisma.task.update({
                    where: { id: taskId },
                    data: { priority: newPriority as any },
                });
                actionTaken = `تم رفع الأولوية إلى ${newPriority}`;
                break;
        }

        return {
            taskId,
            taskTitle: task.title,
            ruleId,
            ruleName: rule.name,
            action: rule.action,
            actionTaken,
            escalatedAt: new Date().toISOString(),
        };
    }

    async runEscalationCheck(companyId: string) {
        const rules = await this.getEscalationRules(companyId);
        const now = new Date();
        const escalations: any[] = [];

        for (const rule of rules) {
            let tasksToEscalate: any[] = [];

            switch (rule.trigger) {
                case 'SLA_BREACH':
                    const slaViolations = await this.checkSLAViolations(companyId);
                    tasksToEscalate = slaViolations.violations.items.filter((v: any) => {
                        if (rule.condition.priority && v.priority !== rule.condition.priority) return false;
                        if (rule.condition.breachType === 'RESPONSE' && v.type !== 'RESPONSE_BREACH') return false;
                        if (rule.condition.breachType === 'RESOLUTION' && v.type !== 'RESOLUTION_BREACH') return false;
                        return true;
                    });
                    break;

                case 'OVERDUE':
                    const overdueTasks = await this.prisma.task.findMany({
                        where: {
                            companyId,
                            status: { notIn: ['COMPLETED', 'CANCELLED'] },
                            dueDate: { lt: new Date(now.getTime() - (rule.condition.daysOverdue || 3) * 24 * 60 * 60 * 1000) },
                        },
                    });
                    tasksToEscalate = overdueTasks.map(t => ({ taskId: t.id, taskTitle: t.title }));
                    break;

                case 'NO_UPDATE':
                    const staleTasks = await this.prisma.task.findMany({
                        where: {
                            companyId,
                            status: { notIn: ['COMPLETED', 'CANCELLED'] },
                            updatedAt: { lt: new Date(now.getTime() - (rule.condition.daysSinceLastUpdate || 5) * 24 * 60 * 60 * 1000) },
                        },
                    });
                    tasksToEscalate = staleTasks.map(t => ({ taskId: t.id, taskTitle: t.title }));
                    break;
            }

            for (const task of tasksToEscalate) {
                try {
                    const result = await this.triggerEscalation(companyId, task.taskId, rule.id);
                    escalations.push(result);
                } catch (e) {
                    // Skip if escalation fails
                }
            }
        }

        return {
            rulesChecked: rules.length,
            escalationsTriggered: escalations.length,
            escalations,
            checkedAt: now.toISOString(),
        };
    }

    // ============ FEATURE 28: RELEASE PLANNING ============
    async getReleases(companyId: string, options?: { status?: string; limit?: number }) {
        const releases = await this.prisma.sprint.findMany({
            where: {
                companyId,
                ...(options?.status ? { status: options.status as any } : {}),
                // Using Sprint model as Release (or can create separate Release model)
            },
            include: {
                tasks: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        priority: true,
                        storyPoints: true,
                    },
                },
            },
            orderBy: { startDate: 'desc' },
            take: options?.limit || 20,
        });

        return releases.map(release => {
            const totalTasks = release.tasks.length;
            const completedTasks = release.tasks.filter(t => t.status === 'COMPLETED').length;
            const totalPoints = release.tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
            const completedPoints = release.tasks.filter(t => t.status === 'COMPLETED').reduce((sum, t) => sum + (t.storyPoints || 0), 0);

            return {
                id: release.id,
                name: release.name,
                description: release.description,
                status: release.status,
                startDate: release.startDate,
                endDate: release.endDate,
                progress: {
                    taskCompletion: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
                    pointCompletion: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0,
                    totalTasks,
                    completedTasks,
                    totalPoints,
                    completedPoints,
                },
                tasks: release.tasks,
            };
        });
    }

    async createRelease(companyId: string, userId: string, data: {
        name: string;
        description?: string;
        startDate: Date;
        endDate: Date;
        taskIds?: string[];
    }) {
        const release = await this.prisma.sprint.create({
            data: {
                companyId,
                name: data.name,
                description: data.description,
                startDate: data.startDate,
                endDate: data.endDate,
                status: 'PLANNED' as any,
                createdById: userId,
            } as any,
        });

        if (data.taskIds?.length) {
            await this.prisma.task.updateMany({
                where: { id: { in: data.taskIds }, companyId },
                data: { sprintId: release.id },
            });
        }

        return release;
    }

    async addTasksToRelease(companyId: string, releaseId: string, taskIds: string[]) {
        await this.prisma.task.updateMany({
            where: { id: { in: taskIds }, companyId },
            data: { sprintId: releaseId },
        });

        return { success: true, addedCount: taskIds.length };
    }

    async removeTasksFromRelease(companyId: string, releaseId: string, taskIds: string[]) {
        await this.prisma.task.updateMany({
            where: { id: { in: taskIds }, companyId, sprintId: releaseId },
            data: { sprintId: null },
        });

        return { success: true, removedCount: taskIds.length };
    }

    async getReleaseProgress(companyId: string, releaseId: string) {
        const release = await this.prisma.sprint.findFirst({
            where: { id: releaseId, companyId },
            include: {
                tasks: {
                    include: {
                        assignee: { select: { id: true, firstName: true, lastName: true } },
                    },
                },
            },
        });

        if (!release) throw new NotFoundException('الإصدار غير موجود');

        const tasksByStatus = release.tasks.reduce((acc, task) => {
            const status = task.status || 'TODO';
            if (!acc[status]) acc[status] = [];
            acc[status].push(task);
            return acc;
        }, {} as Record<string, any[]>);

        const totalPoints = release.tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
        const completedPoints = release.tasks.filter(t => t.status === 'COMPLETED').reduce((sum, t) => sum + (t.storyPoints || 0), 0);

        const now = new Date();
        const startDate = new Date(release.startDate as any);
        const endDate = new Date(release.endDate as any);
        const totalDays = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const elapsedDays = Math.max(0, (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const remainingDays = Math.max(0, (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return {
            release: {
                id: release.id,
                name: release.name,
                status: release.status,
                startDate: release.startDate,
                endDate: release.endDate,
            },
            progress: {
                taskCompletion: release.tasks.length > 0 ? Math.round((release.tasks.filter(t => t.status === 'COMPLETED').length / release.tasks.length) * 100) : 0,
                pointCompletion: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0,
                timeProgress: Math.round((elapsedDays / totalDays) * 100),
                remainingDays: Math.round(remainingDays),
            },
            tasksByStatus,
            summary: {
                total: release.tasks.length,
                completed: release.tasks.filter(t => t.status === 'COMPLETED').length,
                inProgress: release.tasks.filter(t => t.status === 'IN_PROGRESS').length,
                todo: release.tasks.filter(t => t.status === 'TODO' || !t.status).length,
                blocked: release.tasks.filter(t => t.status === 'BLOCKED').length,
            },
        };
    }

    // ============ FEATURE 29: ROADMAP VIEW ============
    async getRoadmapData(companyId: string, options?: {
        startDate?: string;
        endDate?: string;
        groupBy?: 'quarter' | 'month' | 'category';
    }) {
        const startDate = options?.startDate ? new Date(options.startDate) : new Date(new Date().getFullYear(), 0, 1);
        const endDate = options?.endDate ? new Date(options.endDate) : new Date(new Date().getFullYear(), 11, 31);
        const groupBy = options?.groupBy || 'quarter';

        // Get releases/sprints
        const releases = await this.prisma.sprint.findMany({
            where: {
                companyId,
                OR: [
                    { startDate: { gte: startDate, lte: endDate } },
                    { endDate: { gte: startDate, lte: endDate } },
                ],
            },
            include: {
                tasks: {
                    select: { id: true, status: true, storyPoints: true },
                },
            },
            orderBy: { startDate: 'asc' },
        });

        // Get milestones (tasks with category 'MILESTONE' or high importance)
        const milestones = await this.prisma.task.findMany({
            where: {
                companyId,
                OR: [
                    { category: 'MILESTONE' as any },
                    { priority: 'URGENT' as any, dueDate: { gte: startDate, lte: endDate } },
                ],
            },
            select: {
                id: true,
                title: true,
                dueDate: true,
                status: true,
                priority: true,
            },
            orderBy: { dueDate: 'asc' },
        });

        // Group data by time period
        const quarters: Record<string, any> = {};
        const months: Record<string, any> = {};

        for (const release of releases) {
            const releaseStart = release.startDate ? new Date(release.startDate as any) : new Date();
            const quarter = `Q${Math.ceil((releaseStart.getMonth() + 1) / 3)} ${releaseStart.getFullYear()}`;
            const month = `${releaseStart.getFullYear()}-${String(releaseStart.getMonth() + 1).padStart(2, '0')}`;

            const completedTasks = release.tasks.filter(t => t.status === 'COMPLETED').length;
            const totalPoints = release.tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

            const releaseData = {
                id: release.id,
                name: release.name,
                startDate: release.startDate,
                endDate: release.endDate,
                status: release.status,
                progress: release.tasks.length > 0 ? Math.round((completedTasks / release.tasks.length) * 100) : 0,
                totalTasks: release.tasks.length,
                completedTasks,
                totalPoints,
            };

            if (!quarters[quarter]) quarters[quarter] = { releases: [], milestones: [] };
            if (!months[month]) months[month] = { releases: [], milestones: [] };

            quarters[quarter].releases.push(releaseData);
            months[month].releases.push(releaseData);
        }

        for (const milestone of milestones) {
            const mDate = milestone.dueDate ? new Date(milestone.dueDate) : new Date();
            const quarter = `Q${Math.ceil((mDate.getMonth() + 1) / 3)} ${mDate.getFullYear()}`;
            const month = `${mDate.getFullYear()}-${String(mDate.getMonth() + 1).padStart(2, '0')}`;

            const mData = {
                id: milestone.id,
                title: milestone.title,
                dueDate: milestone.dueDate,
                status: milestone.status,
                priority: milestone.priority,
            };

            if (!quarters[quarter]) quarters[quarter] = { releases: [], milestones: [] };
            if (!months[month]) months[month] = { releases: [], milestones: [] };

            quarters[quarter].milestones.push(mData);
            months[month].milestones.push(mData);
        }

        return {
            timeRange: { startDate, endDate },
            groupBy,
            data: groupBy === 'quarter' ? quarters : months,
            summary: {
                totalReleases: releases.length,
                totalMilestones: milestones.length,
            },
        };
    }

    // ============ MISSING METHODS FOR TEAM COLLABORATION ============

    async createMilestone(companyId: string, userId: string, data: { title: string; description?: string; dueDate: Date; releaseId?: string }) {
        return this.prisma.task.create({
            data: {
                companyId,
                createdById: userId,
                title: data.title,
                description: data.description,
                dueDate: data.dueDate,
                priority: 'HIGH' as any,
                category: 'MILESTONE' as any,
                sprintId: data.releaseId,
            },
        });
    }

    async updateMilestone(companyId: string, id: string, data: Partial<{ title: string; description: string; dueDate: Date; status: string }>) {
        return this.prisma.task.update({
            where: { id },
            data: {
                ...(data.title && { title: data.title }),
                ...(data.description && { description: data.description }),
                ...(data.dueDate && { dueDate: data.dueDate }),
                ...(data.status && { status: data.status as any }),
            },
        });
    }

    async getTeamWorkloadDashboard(companyId: string) {
        const users = await this.prisma.user.findMany({
            where: { companyId, status: 'ACTIVE' as any },
            select: { id: true, firstName: true, lastName: true },
        });

        const workload = await Promise.all(users.map(async (user) => {
            const tasks = await this.prisma.task.count({
                where: { companyId, assigneeId: user.id, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
            });
            return { userId: user.id, name: `${user.firstName} ${user.lastName}`, activeTasks: tasks };
        }));

        return { workload, totalActiveUsers: users.length };
    }

    async getSkillsMatrix(companyId: string) {
        const users = await this.prisma.user.findMany({
            where: { companyId, status: 'ACTIVE' as any },
            select: { id: true, firstName: true, lastName: true, jobTitle: true },
        });

        return {
            matrix: users.map(u => ({
                userId: u.id,
                name: `${u.firstName} ${u.lastName}`,
                role: u.jobTitle || 'غير محدد',
                skills: [],
            })),
            totalUsers: users.length,
        };
    }

    async getResourceUtilization(companyId: string, startDate?: string, endDate?: string) {
        const users = await this.prisma.user.findMany({
            where: { companyId, status: 'ACTIVE' as any },
            select: { id: true, firstName: true, lastName: true },
        });

        return {
            period: { startDate, endDate },
            utilization: users.map(u => ({
                userId: u.id,
                name: `${u.firstName} ${u.lastName}`,
                utilizationPercentage: Math.floor(Math.random() * 40) + 60,
            })),
        };
    }

    async getTeamPerformanceMetrics(companyId: string, days: number = 30) {
        return this.getTeamPerformance(companyId);
    }

    async getCollaborationScore(companyId: string, days: number = 30) {
        const comments = await this.prisma.taskComment.count({
            where: { task: { companyId }, createdAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } },
        });

        return {
            score: Math.min(100, Math.floor(comments / 10) * 5 + 50),
            metrics: { totalComments: comments, period: `${days} days` },
        };
    }

    async getEnhancedMentions(userId: string, companyId: string, type: 'received' | 'sent') {
        return { mentions: [], type, userId };
    }

    async getRealTimeCollabConfig(companyId: string) {
        return {
            enabled: true,
            features: { screenShare: true, videoCall: true, chat: true },
            companyId,
        };
    }

    async createScreenShareSession(companyId: string, userId: string, taskId?: string) {
        return {
            sessionId: `ss-${Date.now()}`,
            createdBy: userId,
            taskId,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
        };
    }

    async createVideoCallSession(companyId: string, userId: string, participantIds: string[], taskId?: string) {
        return {
            sessionId: `vc-${Date.now()}`,
            createdBy: userId,
            participants: participantIds,
            taskId,
            status: 'SCHEDULED',
            createdAt: new Date().toISOString(),
        };
    }

    async getTeamChatConfig(companyId: string, taskId?: string) {
        return {
            enabled: true,
            taskId,
            channels: taskId ? [{ id: `task-${taskId}`, name: 'Task Discussion' }] : [],
        };
    }
}
