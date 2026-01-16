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
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const client_1 = require("@prisma/client");
let TasksService = class TasksService {
    constructor(prisma, notificationsService) {
        this.prisma = prisma;
        this.notificationsService = notificationsService;
    }
    async createTask(userId, companyId, dto) {
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
                priority: dto.priority || templateData.priority || 'MEDIUM',
                status: dto.status || 'TODO',
                categoryId: dto.categoryId,
                templateId: dto.templateId,
                dueDate: dto.dueDate
                    ? new Date(dto.dueDate)
                    : templateData.dueDate,
                startDate: dto.startDate ? new Date(dto.startDate) : undefined,
                assigneeId: dto.assigneeId,
                tags: dto.tags || [],
                customFields: dto.customFields,
            },
            include: {
                category: true,
                createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
            },
        });
        await this.logActivity(task.id, userId, 'CREATED', null, null, 'تم إنشاء المهمة');
        if (dto.templateId) {
            const template = await this.prisma.taskTemplate.findUnique({
                where: { id: dto.templateId },
            });
            if (template?.checklistTemplate) {
                const checklists = template.checklistTemplate;
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
        if (dto.assigneeId && dto.assigneeId !== userId) {
            await this.notificationsService.create({
                companyId,
                userId: dto.assigneeId,
                type: client_1.NotificationType.GENERAL,
                title: 'مهمة جديدة مسندة إليك',
                body: `تم تكليفك بمهمة: ${dto.title}`,
                data: { taskId: task.id },
            });
        }
        return task;
    }
    async getTasks(companyId, query) {
        const { search, status, priority, categoryId, assigneeId, createdById, dueDateFrom, dueDateTo, tags, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', } = query;
        const where = {
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
        };
        const [tasks, total] = await Promise.all([
            this.prisma.task.findMany({
                where,
                include: {
                    category: true,
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
    async getMyTasks(userId, companyId) {
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
    async getTaskById(id, companyId) {
        const task = await this.prisma.task.findFirst({
            where: { id, companyId },
            include: {
                category: true,
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
                blockedBy: {
                    include: {
                        blockingTask: { select: { id: true, title: true, status: true } },
                    },
                },
                blocks: {
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
            throw new common_1.NotFoundException('المهمة غير موجودة');
        }
        return task;
    }
    async updateTask(id, companyId, userId, dto) {
        const existing = await this.prisma.task.findFirst({
            where: { id, companyId },
        });
        if (!existing) {
            throw new common_1.NotFoundException('المهمة غير موجودة');
        }
        const changes = [];
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
                ...(dto.dueDate !== undefined && {
                    dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
                }),
                ...(dto.startDate !== undefined && {
                    startDate: dto.startDate ? new Date(dto.startDate) : null,
                }),
                ...(dto.assigneeId !== undefined && { assigneeId: dto.assigneeId }),
                ...(dto.tags && { tags: dto.tags }),
                ...(dto.customFields && { customFields: dto.customFields }),
                ...(dto.progress !== undefined && { progress: dto.progress }),
                ...(dto.order !== undefined && { order: dto.order }),
                ...(dto.status === 'COMPLETED' && { completedAt: new Date() }),
            },
            include: {
                category: true,
                assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
            },
        });
        for (const change of changes) {
            await this.logActivity(id, userId, 'UPDATED', change.oldVal, change.newVal, `تم تغيير ${this.getFieldLabel(change.field)}`);
        }
        if (dto.assigneeId && dto.assigneeId !== existing.assigneeId && dto.assigneeId !== userId) {
            await this.notificationsService.create({
                companyId,
                userId: dto.assigneeId,
                type: client_1.NotificationType.GENERAL,
                title: 'تم تعيينك في مهمة',
                body: `تم تكليفك بمهمة: ${task.title}`,
                data: { taskId: id },
            });
        }
        return task;
    }
    async deleteTask(id, companyId, userId) {
        const task = await this.prisma.task.findFirst({
            where: { id, companyId },
        });
        if (!task) {
            throw new common_1.NotFoundException('المهمة غير موجودة');
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (task.createdById !== userId && user?.role !== 'ADMIN' && user?.role !== 'HR') {
            throw new common_1.ForbiddenException('ليس لديك صلاحية حذف هذه المهمة');
        }
        await this.prisma.task.delete({ where: { id } });
        return { message: 'تم حذف المهمة بنجاح' };
    }
    async getKanbanBoard(companyId, categoryId, userId) {
        const where = {
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
        const board = {
            BACKLOG: [],
            TODO: [],
            IN_PROGRESS: [],
            IN_REVIEW: [],
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
    async reorderTask(id, companyId, userId, dto) {
        const task = await this.prisma.task.findFirst({
            where: { id, companyId },
        });
        if (!task) {
            throw new common_1.NotFoundException('المهمة غير موجودة');
        }
        const oldStatus = task.status;
        const newStatus = dto.status;
        await this.prisma.task.update({
            where: { id },
            data: {
                status: newStatus,
                order: dto.order,
                ...(newStatus === 'COMPLETED' && { completedAt: new Date() }),
            },
        });
        if (oldStatus !== newStatus) {
            await this.logActivity(id, userId, 'STATUS_CHANGED', oldStatus, newStatus, 'تم تغيير حالة المهمة');
        }
        return { success: true };
    }
    async addChecklist(taskId, companyId, userId, dto) {
        const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId } });
        if (!task)
            throw new common_1.NotFoundException('المهمة غير موجودة');
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
    async addChecklistItem(checklistId, companyId, userId, dto) {
        const checklist = await this.prisma.taskChecklist.findFirst({
            where: { id: checklistId },
            include: { task: true },
        });
        if (!checklist || checklist.task.companyId !== companyId) {
            throw new common_1.NotFoundException('قائمة التحقق غير موجودة');
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
    async toggleChecklistItem(itemId, companyId, userId, isCompleted) {
        const item = await this.prisma.taskChecklistItem.findFirst({
            where: { id: itemId },
            include: { checklist: { include: { task: true } } },
        });
        if (!item || item.checklist.task.companyId !== companyId) {
            throw new common_1.NotFoundException('العنصر غير موجود');
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
    async deleteChecklistItem(itemId, companyId, userId) {
        const item = await this.prisma.taskChecklistItem.findFirst({
            where: { id: itemId },
            include: { checklist: { include: { task: true } } },
        });
        if (!item || item.checklist.task.companyId !== companyId) {
            throw new common_1.NotFoundException('العنصر غير موجود');
        }
        await this.prisma.taskChecklistItem.delete({
            where: { id: itemId },
        });
        await this.updateTaskProgress(item.checklist.taskId);
        await this.logActivity(item.checklist.taskId, userId, 'CHECKLIST_ITEM_DELETED', item.content, null, 'تم حذف عنصر من القائمة');
        return { message: 'تم حذف العنصر' };
    }
    async updateTaskProgress(taskId) {
        const checklists = await this.prisma.taskChecklist.findMany({
            where: { taskId },
            include: { items: true },
        });
        const allItems = checklists.flatMap((c) => c.items);
        if (allItems.length === 0)
            return;
        const completedCount = allItems.filter((i) => i.isCompleted).length;
        const progress = Math.round((completedCount / allItems.length) * 100);
        await this.prisma.task.update({
            where: { id: taskId },
            data: { progress },
        });
    }
    async addComment(taskId, companyId, userId, dto) {
        const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId } });
        if (!task)
            throw new common_1.NotFoundException('المهمة غير موجودة');
        const comment = await this.prisma.taskComment.create({
            data: {
                taskId,
                authorId: userId,
                content: dto.content,
                mentions: dto.mentions || [],
            },
            include: {
                author: { select: { id: true, firstName: true, lastName: true, avatar: true } },
            },
        });
        if (dto.mentions && dto.mentions.length > 0) {
            for (const mentionedUserId of dto.mentions) {
                if (mentionedUserId !== userId) {
                    await this.notificationsService.create({
                        companyId,
                        userId: mentionedUserId,
                        type: client_1.NotificationType.GENERAL,
                        title: 'تم ذكرك في تعليق',
                        body: `تم ذكرك في تعليق على المهمة: ${task.title}`,
                        data: { taskId, commentId: comment.id },
                    });
                }
            }
        }
        if (task.assigneeId && task.assigneeId !== userId) {
            await this.notificationsService.create({
                companyId,
                userId: task.assigneeId,
                type: client_1.NotificationType.GENERAL,
                title: 'تعليق جديد على المهمة',
                body: `تم إضافة تعليق جديد على المهمة: ${task.title}`,
                data: { taskId, commentId: comment.id },
            });
        }
        await this.logActivity(taskId, userId, 'COMMENT_ADDED', null, null, 'تم إضافة تعليق');
        return comment;
    }
    async deleteComment(commentId, companyId, userId) {
        const comment = await this.prisma.taskComment.findFirst({
            where: { id: commentId },
            include: { task: true },
        });
        if (!comment || comment.task.companyId !== companyId) {
            throw new common_1.NotFoundException('التعليق غير موجود');
        }
        if (comment.authorId !== userId) {
            throw new common_1.ForbiddenException('لا يمكنك حذف تعليق شخص آخر');
        }
        await this.prisma.taskComment.delete({ where: { id: commentId } });
        return { message: 'تم حذف التعليق' };
    }
    async addTimeLog(taskId, companyId, userId, dto) {
        const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId } });
        if (!task)
            throw new common_1.NotFoundException('المهمة غير موجودة');
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
        await this.logActivity(taskId, userId, 'TIME_LOGGED', null, `${duration} دقيقة`, 'تم تسجيل وقت عمل');
        return timeLog;
    }
    async getCategories(companyId) {
        return this.prisma.taskCategory.findMany({
            where: { companyId, isActive: true },
            include: {
                _count: { select: { tasks: true } },
            },
            orderBy: { order: 'asc' },
        });
    }
    async createCategory(companyId, dto) {
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
    async updateCategory(id, companyId, dto) {
        const category = await this.prisma.taskCategory.findFirst({
            where: { id, companyId },
        });
        if (!category)
            throw new common_1.NotFoundException('الفئة غير موجودة');
        return this.prisma.taskCategory.update({
            where: { id },
            data: dto,
        });
    }
    async deleteCategory(id, companyId) {
        const category = await this.prisma.taskCategory.findFirst({
            where: { id, companyId },
            include: { _count: { select: { tasks: true } } },
        });
        if (!category)
            throw new common_1.NotFoundException('الفئة غير موجودة');
        if (category._count.tasks > 0) {
            throw new common_1.BadRequestException('لا يمكن حذف فئة تحتوي على مهام');
        }
        await this.prisma.taskCategory.delete({ where: { id } });
        return { message: 'تم حذف الفئة' };
    }
    async getTemplates(companyId) {
        return this.prisma.taskTemplate.findMany({
            where: { companyId, isActive: true },
            include: {
                category: true,
                _count: { select: { tasks: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createTemplate(companyId, dto) {
        return this.prisma.taskTemplate.create({
            data: {
                companyId,
                name: dto.name,
                nameEn: dto.nameEn,
                description: dto.description,
                categoryId: dto.categoryId,
                defaultPriority: dto.defaultPriority || 'MEDIUM',
                defaultDueDays: dto.defaultDueDays,
                workflowType: dto.workflowType,
                checklistTemplate: dto.checklistTemplate,
            },
            include: { category: true },
        });
    }
    async updateTemplate(id, companyId, dto) {
        const template = await this.prisma.taskTemplate.findFirst({
            where: { id, companyId },
        });
        if (!template)
            throw new common_1.NotFoundException('القالب غير موجود');
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
                ...(dto.checklistTemplate && { checklistTemplate: dto.checklistTemplate }),
            },
            include: { category: true },
        });
    }
    async deleteTemplate(id, companyId) {
        const template = await this.prisma.taskTemplate.findFirst({
            where: { id, companyId },
        });
        if (!template)
            throw new common_1.NotFoundException('القالب غير موجود');
        await this.prisma.taskTemplate.update({
            where: { id },
            data: { isActive: false },
        });
        return { message: 'تم حذف القالب' };
    }
    async addWatcher(taskId, companyId, userId) {
        const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId } });
        if (!task)
            throw new common_1.NotFoundException('المهمة غير موجودة');
        const existing = await this.prisma.taskWatcher.findFirst({
            where: { taskId, userId },
        });
        if (existing)
            return { message: 'أنت تتابع هذه المهمة مسبقاً' };
        await this.prisma.taskWatcher.create({
            data: { taskId, userId },
        });
        return { message: 'تمت إضافتك لمتابعة المهمة' };
    }
    async removeWatcher(taskId, companyId, userId) {
        const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId } });
        if (!task)
            throw new common_1.NotFoundException('المهمة غير موجودة');
        await this.prisma.taskWatcher.deleteMany({
            where: { taskId, userId },
        });
        return { message: 'تم إلغاء متابعتك للمهمة' };
    }
    async addDependency(blockedTaskId, blockingTaskId, companyId, userId) {
        const task1 = await this.prisma.task.findFirst({ where: { id: blockedTaskId, companyId } });
        const task2 = await this.prisma.task.findFirst({ where: { id: blockingTaskId, companyId } });
        if (!task1 || !task2)
            throw new common_1.NotFoundException('المهمة غير موجودة');
        if (blockedTaskId === blockingTaskId) {
            throw new common_1.BadRequestException('لا يمكن أن تكون المهمة معتمدة على نفسها');
        }
        const existingReverse = await this.prisma.taskDependency.findFirst({
            where: { blockedTaskId: blockingTaskId, blockingTaskId: blockedTaskId },
        });
        if (existingReverse) {
            throw new common_1.BadRequestException('سيؤدي هذا إلى اعتماد دائري');
        }
        await this.prisma.taskDependency.create({
            data: { blockedTaskId, blockingTaskId },
        });
        await this.logActivity(blockedTaskId, userId, 'DEPENDENCY_ADDED', null, task2.title, 'تم إضافة اعتماد');
        return { message: 'تم إضافة الاعتماد' };
    }
    async removeDependency(blockedTaskId, blockingTaskId, companyId) {
        await this.prisma.taskDependency.deleteMany({
            where: { blockedTaskId, blockingTaskId },
        });
        return { message: 'تم إزالة الاعتماد' };
    }
    async getTaskStats(companyId, userId) {
        const where = {
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
    async addAttachment(taskId, companyId, userId, file) {
        const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId } });
        if (!task)
            throw new common_1.NotFoundException('المهمة غير موجودة');
        const attachment = await this.prisma.taskAttachment.create({
            data: {
                taskId,
                uploadedById: userId,
                fileName: file.originalname,
                storagePath: `/uploads/tasks/${file.filename}`,
                mimeType: file.mimetype,
                fileSize: file.size,
            },
            include: {
                uploadedBy: { select: { id: true, firstName: true, lastName: true } },
            },
        });
        await this.logActivity(taskId, userId, 'ATTACHMENT_ADDED', null, file.originalname, 'تم إضافة مرفق');
        return attachment;
    }
    async deleteAttachment(attachmentId, companyId, userId) {
        const attachment = await this.prisma.taskAttachment.findFirst({
            where: { id: attachmentId },
            include: { task: true },
        });
        if (!attachment || attachment.task.companyId !== companyId) {
            throw new common_1.NotFoundException('المرفق غير موجود');
        }
        await this.prisma.taskAttachment.delete({ where: { id: attachmentId } });
        await this.logActivity(attachment.taskId, userId, 'ATTACHMENT_DELETED', attachment.fileName, null, 'تم حذف مرفق');
        return { message: 'تم حذف المرفق' };
    }
    async logActivity(taskId, userId, action, oldValue, newValue, description) {
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
    getFieldLabel(field) {
        const labels = {
            status: 'الحالة',
            priority: 'الأولوية',
            assigneeId: 'المكلف',
            dueDate: 'تاريخ الاستحقاق',
            title: 'العنوان',
        };
        return labels[field] || field;
    }
    async requestReview(taskId, companyId, userId) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
            include: { reviewer: true },
        });
        if (!task)
            throw new common_1.NotFoundException('المهمة غير موجودة');
        if (task.assigneeId !== userId) {
            throw new common_1.ForbiddenException('فقط المنفذ يمكنه طلب المراجعة');
        }
        if (!task.reviewerId) {
            throw new common_1.BadRequestException('لم يتم تعيين مراجع لهذه المهمة');
        }
        const updated = await this.prisma.task.update({
            where: { id: taskId },
            data: {
                status: 'PENDING_REVIEW',
                reviewRequestedAt: new Date(),
            },
        });
        await this.prisma.taskApproval.create({
            data: {
                taskId,
                userId,
                action: 'SUBMITTED_FOR_REVIEW',
                comment: 'طلب مراجعة المهمة',
            },
        });
        if (task.reviewer) {
            await this.notificationsService.sendNotification(task.reviewerId, 'TASK_UPDATED', 'طلب مراجعة مهمة', `تم طلب مراجعة المهمة: ${task.title}`, { taskId });
        }
        await this.logActivity(taskId, userId, 'STATUS_CHANGED', 'IN_PROGRESS', 'PENDING_REVIEW', 'طلب مراجعة');
        return updated;
    }
    async startReview(taskId, companyId, userId) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
        });
        if (!task)
            throw new common_1.NotFoundException('المهمة غير موجودة');
        if (task.reviewerId !== userId) {
            throw new common_1.ForbiddenException('فقط المراجع المعين يمكنه بدء المراجعة');
        }
        const updated = await this.prisma.task.update({
            where: { id: taskId },
            data: { status: 'IN_REVIEW' },
        });
        await this.logActivity(taskId, userId, 'STATUS_CHANGED', 'PENDING_REVIEW', 'IN_REVIEW', 'بدأ المراجعة');
        return updated;
    }
    async approveTask(taskId, companyId, userId, comment) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
            include: { assignee: true, approver: true },
        });
        if (!task)
            throw new common_1.NotFoundException('المهمة غير موجودة');
        const isReviewer = task.reviewerId === userId;
        const isApprover = task.approverId === userId;
        if (!isReviewer && !isApprover) {
            throw new common_1.ForbiddenException('غير مصرح لك بالموافقة على هذه المهمة');
        }
        let newStatus = 'APPROVED';
        if (isReviewer && task.approverId && task.approverId !== userId) {
            newStatus = 'APPROVED';
        }
        else {
            newStatus = 'COMPLETED';
        }
        const updated = await this.prisma.task.update({
            where: { id: taskId },
            data: {
                status: newStatus,
                reviewedAt: isReviewer ? new Date() : task.reviewedAt,
                approvedAt: new Date(),
                completedAt: newStatus === 'COMPLETED' ? new Date() : undefined,
            },
        });
        await this.prisma.taskApproval.create({
            data: {
                taskId,
                userId,
                action: 'APPROVED',
                comment: comment || 'تمت الموافقة على المهمة',
            },
        });
        if (task.assignee) {
            await this.notificationsService.sendNotification(task.assigneeId, 'TASK_UPDATED', 'تمت الموافقة على مهمتك', `تمت الموافقة على المهمة: ${task.title}`, { taskId });
        }
        await this.logActivity(taskId, userId, 'STATUS_CHANGED', task.status, newStatus, 'تمت الموافقة');
        return updated;
    }
    async rejectTask(taskId, companyId, userId, reason) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
            include: { assignee: true },
        });
        if (!task)
            throw new common_1.NotFoundException('المهمة غير موجودة');
        const isReviewer = task.reviewerId === userId;
        const isApprover = task.approverId === userId;
        if (!isReviewer && !isApprover) {
            throw new common_1.ForbiddenException('غير مصرح لك برفض هذه المهمة');
        }
        const updated = await this.prisma.task.update({
            where: { id: taskId },
            data: {
                status: 'REJECTED',
                rejectedAt: new Date(),
                rejectionReason: reason,
            },
        });
        await this.prisma.taskApproval.create({
            data: {
                taskId,
                userId,
                action: 'REJECTED',
                comment: reason,
            },
        });
        if (task.assignee) {
            await this.notificationsService.sendNotification(task.assigneeId, 'TASK_UPDATED', 'تم رفض مهمتك', `تم رفض المهمة: ${task.title}. السبب: ${reason}`, { taskId });
        }
        await this.logActivity(taskId, userId, 'STATUS_CHANGED', task.status, 'REJECTED', `رفض: ${reason}`);
        return updated;
    }
    async requestChanges(taskId, companyId, userId, feedback) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
            include: { assignee: true },
        });
        if (!task)
            throw new common_1.NotFoundException('المهمة غير موجودة');
        const isReviewer = task.reviewerId === userId;
        const isApprover = task.approverId === userId;
        if (!isReviewer && !isApprover) {
            throw new common_1.ForbiddenException('غير مصرح لك بطلب تعديلات');
        }
        const updated = await this.prisma.task.update({
            where: { id: taskId },
            data: {
                status: 'IN_PROGRESS',
            },
        });
        await this.prisma.taskApproval.create({
            data: {
                taskId,
                userId,
                action: 'CHANGES_REQUESTED',
                comment: feedback,
            },
        });
        if (task.assignee) {
            await this.notificationsService.sendNotification(task.assigneeId, 'TASK_UPDATED', 'مطلوب تعديلات على مهمتك', `مطلوب تعديلات على المهمة: ${task.title}. الملاحظات: ${feedback}`, { taskId });
        }
        await this.logActivity(taskId, userId, 'STATUS_CHANGED', task.status, 'IN_PROGRESS', `طلب تعديلات: ${feedback}`);
        return updated;
    }
    async getApprovalHistory(taskId, companyId) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
        });
        if (!task)
            throw new common_1.NotFoundException('المهمة غير موجودة');
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
    async submitEvidence(taskId, companyId, userId, data) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
            include: { reviewer: true, approver: true },
        });
        if (!task)
            throw new common_1.NotFoundException('المهمة غير موجودة');
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
        const notifyUserId = task.reviewerId || task.approverId;
        if (notifyUserId) {
            await this.notificationsService.sendNotification(notifyUserId, 'TASK_UPDATED', 'تم تقديم إثبات إنجاز', `تم تقديم إثبات إنجاز للمهمة: ${task.title}`, { taskId, evidenceId: evidence.id });
        }
        await this.logActivity(taskId, userId, 'EVIDENCE_SUBMITTED', null, evidence.id, 'تقديم إثبات إنجاز');
        return evidence;
    }
    async getEvidences(taskId, companyId) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
        });
        if (!task)
            throw new common_1.NotFoundException('المهمة غير موجودة');
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
    async verifyEvidence(evidenceId, companyId, userId, status, comment) {
        const evidence = await this.prisma.taskEvidence.findFirst({
            where: { id: evidenceId },
            include: {
                task: true,
                submittedBy: true,
            },
        });
        if (!evidence)
            throw new common_1.NotFoundException('الإثبات غير موجود');
        if (evidence.task.companyId !== companyId) {
            throw new common_1.ForbiddenException('غير مصرح بالوصول');
        }
        const task = evidence.task;
        const isReviewer = task.reviewerId === userId;
        const isApprover = task.approverId === userId;
        if (!isReviewer && !isApprover) {
            throw new common_1.ForbiddenException('فقط المراجع أو المعتمد يمكنه التحقق من الإثبات');
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
        const statusAr = status === 'APPROVED' ? 'تم اعتماد' : 'تم رفض';
        await this.notificationsService.sendNotification(evidence.submittedById, 'TASK_UPDATED', `${statusAr} إثبات الإنجاز`, `${statusAr} إثبات الإنجاز للمهمة: ${task.title}`, { taskId: task.id, evidenceId });
        await this.logActivity(task.id, userId, 'EVIDENCE_VERIFIED', null, status, `${statusAr} إثبات الإنجاز`);
        return updated;
    }
    async deleteEvidence(evidenceId, companyId, userId) {
        const evidence = await this.prisma.taskEvidence.findFirst({
            where: { id: evidenceId },
            include: { task: true },
        });
        if (!evidence)
            throw new common_1.NotFoundException('الإثبات غير موجود');
        if (evidence.task.companyId !== companyId) {
            throw new common_1.ForbiddenException('غير مصرح بالوصول');
        }
        if (evidence.submittedById !== userId) {
            throw new common_1.ForbiddenException('فقط مقدم الإثبات يمكنه حذفه');
        }
        await this.prisma.taskEvidence.delete({
            where: { id: evidenceId },
        });
        return { success: true };
    }
    async getDependencies(taskId, companyId) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
        });
        if (!task)
            throw new common_1.NotFoundException('المهمة غير موجودة');
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
    async updateDependencyType(dependencyId, companyId, type) {
        const dependency = await this.prisma.taskDependency.findFirst({
            where: { id: dependencyId },
            include: { blockedTask: true },
        });
        if (!dependency)
            throw new common_1.NotFoundException('التبعية غير موجودة');
        if (dependency.blockedTask.companyId !== companyId) {
            throw new common_1.ForbiddenException('غير مصرح بالوصول');
        }
        return this.prisma.taskDependency.update({
            where: { id: dependencyId },
            data: { type },
        });
    }
    async getGanttData(companyId, categoryId) {
        const where = { companyId };
        if (categoryId)
            where.categoryId = categoryId;
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
                blockedBy: {
                    select: { blockingTaskId: true, type: true },
                },
                blocks: {
                    select: { blockedTaskId: true, type: true },
                },
            },
            orderBy: [{ startDate: 'asc' }, { dueDate: 'asc' }],
        });
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
            dependencies: task.blockedBy.map(d => d.blockingTaskId),
            type: task.blockedBy.length > 0 ? 'task' : 'milestone',
        }));
    }
    async getComments(taskId, companyId) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
        });
        if (!task)
            throw new common_1.NotFoundException('المهمة غير موجودة');
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
    async replyToComment(commentId, companyId, userId, content, mentions = []) {
        const parentComment = await this.prisma.taskComment.findFirst({
            where: { id: commentId },
            include: { task: true, author: true },
        });
        if (!parentComment)
            throw new common_1.NotFoundException('التعليق غير موجود');
        if (parentComment.task.companyId !== companyId) {
            throw new common_1.ForbiddenException('غير مصرح بالوصول');
        }
        const reply = await this.prisma.taskComment.create({
            data: {
                taskId: parentComment.taskId,
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
        if (parentComment.authorId !== userId) {
            await this.notificationsService.sendNotification(parentComment.authorId, 'TASK_UPDATED', 'رد على تعليقك', `تم الرد على تعليقك في المهمة: ${parentComment.task.title}`, { taskId: parentComment.taskId, commentId: reply.id });
        }
        for (const mentionedUserId of mentions) {
            if (mentionedUserId !== userId && mentionedUserId !== parentComment.authorId) {
                await this.notificationsService.sendNotification(mentionedUserId, 'TASK_UPDATED', 'تمت الإشارة إليك', `تمت الإشارة إليك في تعليق على المهمة: ${parentComment.task.title}`, { taskId: parentComment.taskId, commentId: reply.id });
            }
        }
        return reply;
    }
    async addReaction(commentId, companyId, userId, emoji) {
        const comment = await this.prisma.taskComment.findFirst({
            where: { id: commentId },
            include: { task: true, author: true },
        });
        if (!comment)
            throw new common_1.NotFoundException('التعليق غير موجود');
        if (comment.task.companyId !== companyId) {
            throw new common_1.ForbiddenException('غير مصرح بالوصول');
        }
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
        if (comment.authorId !== userId) {
            await this.notificationsService.sendNotification(comment.authorId, 'TASK_UPDATED', `${emoji} تفاعل على تعليقك`, `تفاعل شخص ما على تعليقك في المهمة`, { taskId: comment.taskId, commentId });
        }
        return reaction;
    }
    async removeReaction(commentId, companyId, userId, emoji) {
        const comment = await this.prisma.taskComment.findFirst({
            where: { id: commentId },
            include: { task: true },
        });
        if (!comment)
            throw new common_1.NotFoundException('التعليق غير موجود');
        if (comment.task.companyId !== companyId) {
            throw new common_1.ForbiddenException('غير مصرح بالوصول');
        }
        await this.prisma.commentReaction.deleteMany({
            where: { commentId, userId, emoji },
        });
        return { success: true };
    }
    async getActivityFeed(taskId, companyId, limit = 50) {
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, companyId },
        });
        if (!task)
            throw new common_1.NotFoundException('المهمة غير موجودة');
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
    async getProductivityMetrics(companyId, startDate, endDate) {
        const dateFilter = {};
        if (startDate)
            dateFilter.gte = startDate;
        if (endDate)
            dateFilter.lte = endDate;
        const whereClause = { companyId };
        if (startDate || endDate) {
            whereClause.createdAt = dateFilter;
        }
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
        const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && !['COMPLETED', 'APPROVED', 'CANCELLED'].includes(t.status)).length;
        const completedWithDue = tasks.filter(t => t.status === 'COMPLETED' && t.dueDate && t.completedAt);
        const onTimeCompleted = completedWithDue.filter(t => new Date(t.completedAt) <= new Date(t.dueDate)).length;
        const completedWithTimes = tasks.filter(t => t.completedAt && t.createdAt);
        const avgCompletionHours = completedWithTimes.length > 0
            ? completedWithTimes.reduce((sum, t) => {
                const diff = new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime();
                return sum + (diff / (1000 * 60 * 60));
            }, 0) / completedWithTimes.length
            : 0;
        const byPriority = {
            URGENT: tasks.filter(t => t.priority === 'URGENT').length,
            HIGH: tasks.filter(t => t.priority === 'HIGH').length,
            MEDIUM: tasks.filter(t => t.priority === 'MEDIUM').length,
            LOW: tasks.filter(t => t.priority === 'LOW').length,
        };
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
    async getTeamPerformance(companyId, startDate, endDate) {
        const dateFilter = {};
        if (startDate)
            dateFilter.gte = startDate;
        if (endDate)
            dateFilter.lte = endDate;
        const whereClause = { companyId, assigneeId: { not: null } };
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
        const byUser = new Map();
        for (const task of tasks) {
            if (!task.assigneeId)
                continue;
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
            }
            else if (task.status === 'IN_PROGRESS' || task.status === 'IN_REVIEW') {
                stats.inProgress++;
            }
            if (task.dueDate && new Date(task.dueDate) < new Date() &&
                !['COMPLETED', 'APPROVED', 'CANCELLED'].includes(task.status)) {
                stats.overdue++;
            }
        }
        const teamStats = Array.from(byUser.values()).map(stats => ({
            ...stats,
            completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
        }));
        teamStats.sort((a, b) => b.completionRate - a.completionRate);
        return teamStats;
    }
    async getTimeAnalytics(companyId, startDate, endDate) {
        const dateFilter = {};
        if (startDate)
            dateFilter.gte = startDate;
        if (endDate)
            dateFilter.lte = endDate;
        const whereClause = {
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
        const totalMinutes = timeLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
        const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
        const byUser = new Map();
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
    async getTaskTrends(companyId, days = 30) {
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
        const dailyStats = new Map();
        for (let i = 0; i <= days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const key = date.toISOString().split('T')[0];
            dailyStats.set(key, { created: 0, completed: 0 });
        }
        for (const task of tasks) {
            const createdKey = new Date(task.createdAt).toISOString().split('T')[0];
            if (dailyStats.has(createdKey)) {
                dailyStats.get(createdKey).created++;
            }
            if (task.completedAt) {
                const completedKey = new Date(task.completedAt).toISOString().split('T')[0];
                if (dailyStats.has(completedKey)) {
                    dailyStats.get(completedKey).completed++;
                }
            }
        }
        const trends = Array.from(dailyStats.entries())
            .map(([date, stats]) => ({ date, ...stats }))
            .sort((a, b) => a.date.localeCompare(b.date));
        return trends;
    }
    async generateReport(companyId, options = {}) {
        const report = {
            generatedAt: new Date(),
            period: {
                start: options.startDate || null,
                end: options.endDate || null,
            },
        };
        if (options.includeMetrics !== false) {
            report.metrics = await this.getProductivityMetrics(companyId, options.startDate, options.endDate);
        }
        if (options.includeTeam !== false) {
            report.team = await this.getTeamPerformance(companyId, options.startDate, options.endDate);
        }
        if (options.includeTime) {
            report.timeTracking = await this.getTimeAnalytics(companyId, options.startDate, options.endDate);
        }
        if (options.includeTrends) {
            report.trends = await this.getTaskTrends(companyId, 30);
        }
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
    async createAutomation(companyId, userId, data) {
        return this.prisma.taskAutomation.create({
            data: {
                companyId,
                createdById: userId,
                name: data.name,
                description: data.description,
                trigger: data.trigger,
                triggerConfig: data.triggerConfig,
                action: data.action,
                actionConfig: data.actionConfig,
                categoryId: data.categoryId,
                priority: data.priority,
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
    async getAutomations(companyId) {
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
    async updateAutomation(automationId, companyId, data) {
        const automation = await this.prisma.taskAutomation.findFirst({
            where: { id: automationId, companyId },
        });
        if (!automation)
            throw new common_1.NotFoundException('القاعدة غير موجودة');
        return this.prisma.taskAutomation.update({
            where: { id: automationId },
            data: {
                ...data,
                trigger: data.trigger,
                action: data.action,
                priority: data.priority,
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
    async deleteAutomation(automationId, companyId) {
        const automation = await this.prisma.taskAutomation.findFirst({
            where: { id: automationId, companyId },
        });
        if (!automation)
            throw new common_1.NotFoundException('القاعدة غير موجودة');
        await this.prisma.taskAutomation.delete({
            where: { id: automationId },
        });
        return { success: true };
    }
    async toggleAutomation(automationId, companyId) {
        const automation = await this.prisma.taskAutomation.findFirst({
            where: { id: automationId, companyId },
        });
        if (!automation)
            throw new common_1.NotFoundException('القاعدة غير موجودة');
        return this.prisma.taskAutomation.update({
            where: { id: automationId },
            data: { isActive: !automation.isActive },
        });
    }
    async processAutomations(companyId, taskId, trigger, context = {}) {
        const automations = await this.prisma.taskAutomation.findMany({
            where: {
                companyId,
                trigger: trigger,
                isActive: true,
            },
        });
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
            include: { assignee: true, reviewer: true, approver: true },
        });
        if (!task)
            return [];
        const results = [];
        for (const automation of automations) {
            if (automation.categoryId && task.categoryId !== automation.categoryId)
                continue;
            if (automation.priority && task.priority !== automation.priority)
                continue;
            const triggerConfig = automation.triggerConfig;
            if (triggerConfig) {
                if (trigger === 'STATUS_CHANGED') {
                    if (triggerConfig.fromStatus && context.fromStatus !== triggerConfig.fromStatus)
                        continue;
                    if (triggerConfig.toStatus && context.toStatus !== triggerConfig.toStatus)
                        continue;
                }
            }
            try {
                await this.executeAutomationAction(automation, task, context);
                await this.prisma.automationLog.create({
                    data: {
                        automationId: automation.id,
                        taskId,
                        trigger,
                        action: automation.action,
                        success: true,
                    },
                });
                await this.prisma.taskAutomation.update({
                    where: { id: automation.id },
                    data: {
                        lastRunAt: new Date(),
                        runCount: { increment: 1 },
                    },
                });
                results.push({ automationId: automation.id, success: true });
            }
            catch (error) {
                await this.prisma.automationLog.create({
                    data: {
                        automationId: automation.id,
                        taskId,
                        trigger,
                        action: automation.action,
                        success: false,
                        error: error.message,
                    },
                });
                results.push({ automationId: automation.id, success: false, error: error.message });
            }
        }
        return results;
    }
    async executeAutomationAction(automation, task, context) {
        const actionConfig = automation.actionConfig || {};
        switch (automation.action) {
            case 'SEND_NOTIFICATION':
                const targetUserId = actionConfig.userId || task.assigneeId;
                if (targetUserId) {
                    await this.notificationsService.sendNotification(targetUserId, 'TASK_UPDATED', actionConfig.title || 'إشعار تلقائي', actionConfig.message || `تم تنفيذ إجراء تلقائي على المهمة: ${task.title}`, { taskId: task.id, automationId: automation.id });
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
    async getAutomationLogs(automationId, companyId, limit = 50) {
        const automation = await this.prisma.taskAutomation.findFirst({
            where: { id: automationId, companyId },
        });
        if (!automation)
            throw new common_1.NotFoundException('القاعدة غير موجودة');
        return this.prisma.automationLog.findMany({
            where: { automationId },
            orderBy: { executedAt: 'desc' },
            take: limit,
        });
    }
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], TasksService);
//# sourceMappingURL=tasks.service.js.map