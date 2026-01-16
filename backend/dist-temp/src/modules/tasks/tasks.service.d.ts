import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { CreateTaskCategoryDto, UpdateTaskCategoryDto } from './dto/task-category.dto';
import { CreateTaskTemplateDto, UpdateTaskTemplateDto } from './dto/task-template.dto';
import { CreateChecklistDto, CreateChecklistItemDto, CreateCommentDto, CreateTimeLogDto, ReorderTaskDto } from './dto/task-actions.dto';
import { Prisma } from '@prisma/client';
export declare class TasksService {
    private prisma;
    private notificationsService;
    constructor(prisma: PrismaService, notificationsService: NotificationsService);
    createTask(userId: string, companyId: string, dto: CreateTaskDto): Promise<{
        category: {
            id: string;
            name: string;
            nameEn: string | null;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            isActive: boolean;
            order: number;
            color: string;
            icon: string | null;
        } | null;
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
            avatar: string | null;
        };
        assignee: {
            id: string;
            firstName: string;
            lastName: string;
            avatar: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TaskStatus;
        companyId: string;
        customFields: Prisma.JsonValue | null;
        description: string | null;
        priority: import(".prisma/client").$Enums.TaskPriority;
        startDate: Date | null;
        createdById: string;
        order: number;
        approvedAt: Date | null;
        approverId: string | null;
        title: string;
        tags: string[];
        reviewedAt: Date | null;
        completedAt: Date | null;
        templateId: string | null;
        categoryId: string | null;
        dueDate: Date | null;
        assigneeId: string | null;
        reviewerId: string | null;
        reviewRequestedAt: Date | null;
        rejectedAt: Date | null;
        rejectionReason: string | null;
        slaHours: number | null;
        escalatedAt: Date | null;
        isEscalated: boolean;
        recurrenceType: import(".prisma/client").$Enums.TaskRecurrenceType | null;
        recurrenceEnd: Date | null;
        parentTaskId: string | null;
        progress: number;
    }>;
    getTasks(companyId: string, query: TaskQueryDto): Promise<{
        data: ({
            _count: {
                attachments: number;
                comments: number;
            };
            category: {
                id: string;
                name: string;
                nameEn: string | null;
                createdAt: Date;
                updatedAt: Date;
                companyId: string;
                isActive: boolean;
                order: number;
                color: string;
                icon: string | null;
            } | null;
            createdBy: {
                id: string;
                firstName: string;
                lastName: string;
                avatar: string | null;
            };
            assignee: {
                id: string;
                firstName: string;
                lastName: string;
                avatar: string | null;
            } | null;
            checklists: ({
                items: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    order: number;
                    content: string;
                    completedAt: Date | null;
                    isCompleted: boolean;
                    completedById: string | null;
                    checklistId: string;
                }[];
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                order: number;
                title: string;
                taskId: string;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.TaskStatus;
            companyId: string;
            customFields: Prisma.JsonValue | null;
            description: string | null;
            priority: import(".prisma/client").$Enums.TaskPriority;
            startDate: Date | null;
            createdById: string;
            order: number;
            approvedAt: Date | null;
            approverId: string | null;
            title: string;
            tags: string[];
            reviewedAt: Date | null;
            completedAt: Date | null;
            templateId: string | null;
            categoryId: string | null;
            dueDate: Date | null;
            assigneeId: string | null;
            reviewerId: string | null;
            reviewRequestedAt: Date | null;
            rejectedAt: Date | null;
            rejectionReason: string | null;
            slaHours: number | null;
            escalatedAt: Date | null;
            isEscalated: boolean;
            recurrenceType: import(".prisma/client").$Enums.TaskRecurrenceType | null;
            recurrenceEnd: Date | null;
            parentTaskId: string | null;
            progress: number;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getMyTasks(userId: string, companyId: string): Promise<({
        category: {
            id: string;
            name: string;
            nameEn: string | null;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            isActive: boolean;
            order: number;
            color: string;
            icon: string | null;
        } | null;
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
            avatar: string | null;
        };
        assignee: {
            id: string;
            firstName: string;
            lastName: string;
            avatar: string | null;
        } | null;
        checklists: ({
            items: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                order: number;
                content: string;
                completedAt: Date | null;
                isCompleted: boolean;
                completedById: string | null;
                checklistId: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            order: number;
            title: string;
            taskId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TaskStatus;
        companyId: string;
        customFields: Prisma.JsonValue | null;
        description: string | null;
        priority: import(".prisma/client").$Enums.TaskPriority;
        startDate: Date | null;
        createdById: string;
        order: number;
        approvedAt: Date | null;
        approverId: string | null;
        title: string;
        tags: string[];
        reviewedAt: Date | null;
        completedAt: Date | null;
        templateId: string | null;
        categoryId: string | null;
        dueDate: Date | null;
        assigneeId: string | null;
        reviewerId: string | null;
        reviewRequestedAt: Date | null;
        rejectedAt: Date | null;
        rejectionReason: string | null;
        slaHours: number | null;
        escalatedAt: Date | null;
        isEscalated: boolean;
        recurrenceType: import(".prisma/client").$Enums.TaskRecurrenceType | null;
        recurrenceEnd: Date | null;
        parentTaskId: string | null;
        progress: number;
    })[]>;
    getTaskById(id: string, companyId: string): Promise<{
        category: {
            id: string;
            name: string;
            nameEn: string | null;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            isActive: boolean;
            order: number;
            color: string;
            icon: string | null;
        } | null;
        attachments: ({
            uploadedBy: {
                id: string;
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            fileSize: number;
            uploadedById: string;
            taskId: string;
            fileName: string;
            mimeType: string;
            storagePath: string;
        })[];
        template: {
            id: string;
            name: string;
            nameEn: string | null;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            description: string | null;
            isActive: boolean;
            categoryId: string | null;
            defaultPriority: import(".prisma/client").$Enums.TaskPriority;
            defaultDueDays: number | null;
            workflowType: string | null;
            checklistTemplate: Prisma.JsonValue | null;
        } | null;
        createdBy: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            avatar: string | null;
        };
        assignee: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            avatar: string | null;
        } | null;
        assignments: ({
            user: {
                id: string;
                firstName: string;
                lastName: string;
                avatar: string | null;
            };
        } & {
            id: string;
            userId: string;
            assignedAt: Date;
            assignedById: string | null;
            taskId: string;
        })[];
        watchers: ({
            user: {
                id: string;
                firstName: string;
                lastName: string;
                avatar: string | null;
            };
        } & {
            id: string;
            userId: string;
            taskId: string;
            watchingSince: Date;
        })[];
        checklists: ({
            items: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                order: number;
                content: string;
                completedAt: Date | null;
                isCompleted: boolean;
                completedById: string | null;
                checklistId: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            order: number;
            title: string;
            taskId: string;
        })[];
        comments: ({
            author: {
                id: string;
                firstName: string;
                lastName: string;
                avatar: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            parentId: string | null;
            content: string;
            taskId: string;
            authorId: string;
            mentions: string[];
            isEdited: boolean;
            editedAt: Date | null;
        })[];
        timeLogs: ({
            user: {
                id: string;
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            userId: string;
            taskId: string;
            startTime: Date;
            endTime: Date | null;
            duration: number | null;
            isBillable: boolean;
        })[];
        activities: ({
            user: {
                id: string;
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            description: string | null;
            userId: string;
            action: string;
            oldValue: string | null;
            newValue: string | null;
            taskId: string;
        })[];
        blockedBy: ({
            blockingTask: {
                id: string;
                status: import(".prisma/client").$Enums.TaskStatus;
                title: string;
            };
        } & {
            id: string;
            createdAt: Date;
            type: import(".prisma/client").$Enums.DependencyType;
            blockingTaskId: string;
            blockedTaskId: string;
        })[];
        blocks: ({
            blockedTask: {
                id: string;
                status: import(".prisma/client").$Enums.TaskStatus;
                title: string;
            };
        } & {
            id: string;
            createdAt: Date;
            type: import(".prisma/client").$Enums.DependencyType;
            blockingTaskId: string;
            blockedTaskId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TaskStatus;
        companyId: string;
        customFields: Prisma.JsonValue | null;
        description: string | null;
        priority: import(".prisma/client").$Enums.TaskPriority;
        startDate: Date | null;
        createdById: string;
        order: number;
        approvedAt: Date | null;
        approverId: string | null;
        title: string;
        tags: string[];
        reviewedAt: Date | null;
        completedAt: Date | null;
        templateId: string | null;
        categoryId: string | null;
        dueDate: Date | null;
        assigneeId: string | null;
        reviewerId: string | null;
        reviewRequestedAt: Date | null;
        rejectedAt: Date | null;
        rejectionReason: string | null;
        slaHours: number | null;
        escalatedAt: Date | null;
        isEscalated: boolean;
        recurrenceType: import(".prisma/client").$Enums.TaskRecurrenceType | null;
        recurrenceEnd: Date | null;
        parentTaskId: string | null;
        progress: number;
    }>;
    updateTask(id: string, companyId: string, userId: string, dto: UpdateTaskDto): Promise<{
        category: {
            id: string;
            name: string;
            nameEn: string | null;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            isActive: boolean;
            order: number;
            color: string;
            icon: string | null;
        } | null;
        assignee: {
            id: string;
            firstName: string;
            lastName: string;
            avatar: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TaskStatus;
        companyId: string;
        customFields: Prisma.JsonValue | null;
        description: string | null;
        priority: import(".prisma/client").$Enums.TaskPriority;
        startDate: Date | null;
        createdById: string;
        order: number;
        approvedAt: Date | null;
        approverId: string | null;
        title: string;
        tags: string[];
        reviewedAt: Date | null;
        completedAt: Date | null;
        templateId: string | null;
        categoryId: string | null;
        dueDate: Date | null;
        assigneeId: string | null;
        reviewerId: string | null;
        reviewRequestedAt: Date | null;
        rejectedAt: Date | null;
        rejectionReason: string | null;
        slaHours: number | null;
        escalatedAt: Date | null;
        isEscalated: boolean;
        recurrenceType: import(".prisma/client").$Enums.TaskRecurrenceType | null;
        recurrenceEnd: Date | null;
        parentTaskId: string | null;
        progress: number;
    }>;
    deleteTask(id: string, companyId: string, userId: string): Promise<{
        message: string;
    }>;
    getKanbanBoard(companyId: string, categoryId?: string, userId?: string): Promise<Record<string, ({
        _count: {
            attachments: number;
            comments: number;
        };
        category: {
            id: string;
            name: string;
            nameEn: string | null;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            isActive: boolean;
            order: number;
            color: string;
            icon: string | null;
        } | null;
        assignee: {
            id: string;
            firstName: string;
            lastName: string;
            avatar: string | null;
        } | null;
        checklists: ({
            items: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                order: number;
                content: string;
                completedAt: Date | null;
                isCompleted: boolean;
                completedById: string | null;
                checklistId: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            order: number;
            title: string;
            taskId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TaskStatus;
        companyId: string;
        customFields: Prisma.JsonValue | null;
        description: string | null;
        priority: import(".prisma/client").$Enums.TaskPriority;
        startDate: Date | null;
        createdById: string;
        order: number;
        approvedAt: Date | null;
        approverId: string | null;
        title: string;
        tags: string[];
        reviewedAt: Date | null;
        completedAt: Date | null;
        templateId: string | null;
        categoryId: string | null;
        dueDate: Date | null;
        assigneeId: string | null;
        reviewerId: string | null;
        reviewRequestedAt: Date | null;
        rejectedAt: Date | null;
        rejectionReason: string | null;
        slaHours: number | null;
        escalatedAt: Date | null;
        isEscalated: boolean;
        recurrenceType: import(".prisma/client").$Enums.TaskRecurrenceType | null;
        recurrenceEnd: Date | null;
        parentTaskId: string | null;
        progress: number;
    })[]>>;
    reorderTask(id: string, companyId: string, userId: string, dto: ReorderTaskDto): Promise<{
        success: boolean;
    }>;
    addChecklist(taskId: string, companyId: string, userId: string, dto: CreateChecklistDto): Promise<{
        items: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            order: number;
            content: string;
            completedAt: Date | null;
            isCompleted: boolean;
            completedById: string | null;
            checklistId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        order: number;
        title: string;
        taskId: string;
    }>;
    addChecklistItem(checklistId: string, companyId: string, userId: string, dto: CreateChecklistItemDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        order: number;
        content: string;
        completedAt: Date | null;
        isCompleted: boolean;
        completedById: string | null;
        checklistId: string;
    }>;
    toggleChecklistItem(itemId: string, companyId: string, userId: string, isCompleted: boolean): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        order: number;
        content: string;
        completedAt: Date | null;
        isCompleted: boolean;
        completedById: string | null;
        checklistId: string;
    }>;
    deleteChecklistItem(itemId: string, companyId: string, userId: string): Promise<{
        message: string;
    }>;
    private updateTaskProgress;
    addComment(taskId: string, companyId: string, userId: string, dto: CreateCommentDto): Promise<{
        author: {
            id: string;
            firstName: string;
            lastName: string;
            avatar: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        parentId: string | null;
        content: string;
        taskId: string;
        authorId: string;
        mentions: string[];
        isEdited: boolean;
        editedAt: Date | null;
    }>;
    deleteComment(commentId: string, companyId: string, userId: string): Promise<{
        message: string;
    }>;
    addTimeLog(taskId: string, companyId: string, userId: string, dto: CreateTimeLogDto): Promise<{
        user: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        userId: string;
        taskId: string;
        startTime: Date;
        endTime: Date | null;
        duration: number | null;
        isBillable: boolean;
    }>;
    getCategories(companyId: string): Promise<({
        _count: {
            tasks: number;
        };
    } & {
        id: string;
        name: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        isActive: boolean;
        order: number;
        color: string;
        icon: string | null;
    })[]>;
    createCategory(companyId: string, dto: CreateTaskCategoryDto): Promise<{
        id: string;
        name: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        isActive: boolean;
        order: number;
        color: string;
        icon: string | null;
    }>;
    updateCategory(id: string, companyId: string, dto: UpdateTaskCategoryDto): Promise<{
        id: string;
        name: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        isActive: boolean;
        order: number;
        color: string;
        icon: string | null;
    }>;
    deleteCategory(id: string, companyId: string): Promise<{
        message: string;
    }>;
    getTemplates(companyId: string): Promise<({
        _count: {
            tasks: number;
        };
        category: {
            id: string;
            name: string;
            nameEn: string | null;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            isActive: boolean;
            order: number;
            color: string;
            icon: string | null;
        } | null;
    } & {
        id: string;
        name: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        description: string | null;
        isActive: boolean;
        categoryId: string | null;
        defaultPriority: import(".prisma/client").$Enums.TaskPriority;
        defaultDueDays: number | null;
        workflowType: string | null;
        checklistTemplate: Prisma.JsonValue | null;
    })[]>;
    createTemplate(companyId: string, dto: CreateTaskTemplateDto): Promise<{
        category: {
            id: string;
            name: string;
            nameEn: string | null;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            isActive: boolean;
            order: number;
            color: string;
            icon: string | null;
        } | null;
    } & {
        id: string;
        name: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        description: string | null;
        isActive: boolean;
        categoryId: string | null;
        defaultPriority: import(".prisma/client").$Enums.TaskPriority;
        defaultDueDays: number | null;
        workflowType: string | null;
        checklistTemplate: Prisma.JsonValue | null;
    }>;
    updateTemplate(id: string, companyId: string, dto: UpdateTaskTemplateDto): Promise<{
        category: {
            id: string;
            name: string;
            nameEn: string | null;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            isActive: boolean;
            order: number;
            color: string;
            icon: string | null;
        } | null;
    } & {
        id: string;
        name: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        description: string | null;
        isActive: boolean;
        categoryId: string | null;
        defaultPriority: import(".prisma/client").$Enums.TaskPriority;
        defaultDueDays: number | null;
        workflowType: string | null;
        checklistTemplate: Prisma.JsonValue | null;
    }>;
    deleteTemplate(id: string, companyId: string): Promise<{
        message: string;
    }>;
    addWatcher(taskId: string, companyId: string, userId: string): Promise<{
        message: string;
    }>;
    removeWatcher(taskId: string, companyId: string, userId: string): Promise<{
        message: string;
    }>;
    addDependency(blockedTaskId: string, blockingTaskId: string, companyId: string, userId: string): Promise<{
        message: string;
    }>;
    removeDependency(blockedTaskId: string, blockingTaskId: string, companyId: string): Promise<{
        message: string;
    }>;
    getTaskStats(companyId: string, userId?: string): Promise<{
        total: number;
        byStatus: {
            [k: string]: number;
        };
        byPriority: {
            [k: string]: number;
        };
        overdue: number;
    }>;
    addAttachment(taskId: string, companyId: string, userId: string, file: {
        filename: string;
        originalname: string;
        mimetype: string;
        size: number;
        path: string;
    }): Promise<{
        uploadedBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        fileSize: number;
        uploadedById: string;
        taskId: string;
        fileName: string;
        mimeType: string;
        storagePath: string;
    }>;
    deleteAttachment(attachmentId: string, companyId: string, userId: string): Promise<{
        message: string;
    }>;
    private logActivity;
    private getFieldLabel;
    requestReview(taskId: string, companyId: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TaskStatus;
        companyId: string;
        customFields: Prisma.JsonValue | null;
        description: string | null;
        priority: import(".prisma/client").$Enums.TaskPriority;
        startDate: Date | null;
        createdById: string;
        order: number;
        approvedAt: Date | null;
        approverId: string | null;
        title: string;
        tags: string[];
        reviewedAt: Date | null;
        completedAt: Date | null;
        templateId: string | null;
        categoryId: string | null;
        dueDate: Date | null;
        assigneeId: string | null;
        reviewerId: string | null;
        reviewRequestedAt: Date | null;
        rejectedAt: Date | null;
        rejectionReason: string | null;
        slaHours: number | null;
        escalatedAt: Date | null;
        isEscalated: boolean;
        recurrenceType: import(".prisma/client").$Enums.TaskRecurrenceType | null;
        recurrenceEnd: Date | null;
        parentTaskId: string | null;
        progress: number;
    }>;
    startReview(taskId: string, companyId: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TaskStatus;
        companyId: string;
        customFields: Prisma.JsonValue | null;
        description: string | null;
        priority: import(".prisma/client").$Enums.TaskPriority;
        startDate: Date | null;
        createdById: string;
        order: number;
        approvedAt: Date | null;
        approverId: string | null;
        title: string;
        tags: string[];
        reviewedAt: Date | null;
        completedAt: Date | null;
        templateId: string | null;
        categoryId: string | null;
        dueDate: Date | null;
        assigneeId: string | null;
        reviewerId: string | null;
        reviewRequestedAt: Date | null;
        rejectedAt: Date | null;
        rejectionReason: string | null;
        slaHours: number | null;
        escalatedAt: Date | null;
        isEscalated: boolean;
        recurrenceType: import(".prisma/client").$Enums.TaskRecurrenceType | null;
        recurrenceEnd: Date | null;
        parentTaskId: string | null;
        progress: number;
    }>;
    approveTask(taskId: string, companyId: string, userId: string, comment?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TaskStatus;
        companyId: string;
        customFields: Prisma.JsonValue | null;
        description: string | null;
        priority: import(".prisma/client").$Enums.TaskPriority;
        startDate: Date | null;
        createdById: string;
        order: number;
        approvedAt: Date | null;
        approverId: string | null;
        title: string;
        tags: string[];
        reviewedAt: Date | null;
        completedAt: Date | null;
        templateId: string | null;
        categoryId: string | null;
        dueDate: Date | null;
        assigneeId: string | null;
        reviewerId: string | null;
        reviewRequestedAt: Date | null;
        rejectedAt: Date | null;
        rejectionReason: string | null;
        slaHours: number | null;
        escalatedAt: Date | null;
        isEscalated: boolean;
        recurrenceType: import(".prisma/client").$Enums.TaskRecurrenceType | null;
        recurrenceEnd: Date | null;
        parentTaskId: string | null;
        progress: number;
    }>;
    rejectTask(taskId: string, companyId: string, userId: string, reason: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TaskStatus;
        companyId: string;
        customFields: Prisma.JsonValue | null;
        description: string | null;
        priority: import(".prisma/client").$Enums.TaskPriority;
        startDate: Date | null;
        createdById: string;
        order: number;
        approvedAt: Date | null;
        approverId: string | null;
        title: string;
        tags: string[];
        reviewedAt: Date | null;
        completedAt: Date | null;
        templateId: string | null;
        categoryId: string | null;
        dueDate: Date | null;
        assigneeId: string | null;
        reviewerId: string | null;
        reviewRequestedAt: Date | null;
        rejectedAt: Date | null;
        rejectionReason: string | null;
        slaHours: number | null;
        escalatedAt: Date | null;
        isEscalated: boolean;
        recurrenceType: import(".prisma/client").$Enums.TaskRecurrenceType | null;
        recurrenceEnd: Date | null;
        parentTaskId: string | null;
        progress: number;
    }>;
    requestChanges(taskId: string, companyId: string, userId: string, feedback: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TaskStatus;
        companyId: string;
        customFields: Prisma.JsonValue | null;
        description: string | null;
        priority: import(".prisma/client").$Enums.TaskPriority;
        startDate: Date | null;
        createdById: string;
        order: number;
        approvedAt: Date | null;
        approverId: string | null;
        title: string;
        tags: string[];
        reviewedAt: Date | null;
        completedAt: Date | null;
        templateId: string | null;
        categoryId: string | null;
        dueDate: Date | null;
        assigneeId: string | null;
        reviewerId: string | null;
        reviewRequestedAt: Date | null;
        rejectedAt: Date | null;
        rejectionReason: string | null;
        slaHours: number | null;
        escalatedAt: Date | null;
        isEscalated: boolean;
        recurrenceType: import(".prisma/client").$Enums.TaskRecurrenceType | null;
        recurrenceEnd: Date | null;
        parentTaskId: string | null;
        progress: number;
    }>;
    getApprovalHistory(taskId: string, companyId: string): Promise<({
        user: {
            id: string;
            firstName: string;
            lastName: string;
            avatar: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        action: import(".prisma/client").$Enums.TaskApprovalAction;
        taskId: string;
        comment: string | null;
    })[]>;
    submitEvidence(taskId: string, companyId: string, userId: string, data: {
        description?: string;
        fileUrl?: string;
        fileName?: string;
        fileType?: string;
        fileSize?: number;
        latitude?: number;
        longitude?: number;
        locationName?: string;
    }): Promise<{
        submittedBy: {
            id: string;
            firstName: string;
            lastName: string;
            avatar: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.TaskEvidenceStatus;
        description: string | null;
        latitude: number | null;
        longitude: number | null;
        verifiedAt: Date | null;
        fileType: string | null;
        fileSize: number | null;
        verifiedById: string | null;
        taskId: string;
        fileName: string | null;
        submittedById: string;
        fileUrl: string | null;
        locationName: string | null;
        verificationComment: string | null;
    }>;
    getEvidences(taskId: string, companyId: string): Promise<({
        verifiedBy: {
            id: string;
            firstName: string;
            lastName: string;
            avatar: string | null;
        } | null;
        submittedBy: {
            id: string;
            firstName: string;
            lastName: string;
            avatar: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.TaskEvidenceStatus;
        description: string | null;
        latitude: number | null;
        longitude: number | null;
        verifiedAt: Date | null;
        fileType: string | null;
        fileSize: number | null;
        verifiedById: string | null;
        taskId: string;
        fileName: string | null;
        submittedById: string;
        fileUrl: string | null;
        locationName: string | null;
        verificationComment: string | null;
    })[]>;
    verifyEvidence(evidenceId: string, companyId: string, userId: string, status: 'APPROVED' | 'REJECTED', comment?: string): Promise<{
        verifiedBy: {
            id: string;
            firstName: string;
            lastName: string;
            avatar: string | null;
        } | null;
        submittedBy: {
            id: string;
            firstName: string;
            lastName: string;
            avatar: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.TaskEvidenceStatus;
        description: string | null;
        latitude: number | null;
        longitude: number | null;
        verifiedAt: Date | null;
        fileType: string | null;
        fileSize: number | null;
        verifiedById: string | null;
        taskId: string;
        fileName: string | null;
        submittedById: string;
        fileUrl: string | null;
        locationName: string | null;
        verificationComment: string | null;
    }>;
    deleteEvidence(evidenceId: string, companyId: string, userId: string): Promise<{
        success: boolean;
    }>;
    getDependencies(taskId: string, companyId: string): Promise<{
        blockedBy: ({
            blockingTask: {
                id: string;
                status: import(".prisma/client").$Enums.TaskStatus;
                priority: import(".prisma/client").$Enums.TaskPriority;
                title: string;
                dueDate: Date | null;
            };
        } & {
            id: string;
            createdAt: Date;
            type: import(".prisma/client").$Enums.DependencyType;
            blockingTaskId: string;
            blockedTaskId: string;
        })[];
        blocks: ({
            blockedTask: {
                id: string;
                status: import(".prisma/client").$Enums.TaskStatus;
                priority: import(".prisma/client").$Enums.TaskPriority;
                title: string;
                dueDate: Date | null;
            };
        } & {
            id: string;
            createdAt: Date;
            type: import(".prisma/client").$Enums.DependencyType;
            blockingTaskId: string;
            blockedTaskId: string;
        })[];
    }>;
    updateDependencyType(dependencyId: string, companyId: string, type: 'BLOCKS' | 'BLOCKED_BY' | 'RELATED' | 'DUPLICATES'): Promise<{
        id: string;
        createdAt: Date;
        type: import(".prisma/client").$Enums.DependencyType;
        blockingTaskId: string;
        blockedTaskId: string;
    }>;
    getGanttData(companyId: string, categoryId?: string): Promise<{
        id: string;
        name: string;
        start: Date | null;
        end: Date | null;
        progress: number;
        status: import(".prisma/client").$Enums.TaskStatus;
        priority: import(".prisma/client").$Enums.TaskPriority;
        assignee: {
            id: string;
            firstName: string;
            lastName: string;
            avatar: string | null;
        } | null;
        category: {
            id: string;
            name: string;
            color: string;
        } | null;
        dependencies: string[];
        type: string;
    }[]>;
    getComments(taskId: string, companyId: string): Promise<({
        author: {
            id: string;
            firstName: string;
            lastName: string;
            avatar: string | null;
        };
        replies: ({
            author: {
                id: string;
                firstName: string;
                lastName: string;
                avatar: string | null;
            };
            reactions: ({
                user: {
                    id: string;
                    firstName: string;
                    lastName: string;
                };
            } & {
                id: string;
                createdAt: Date;
                userId: string;
                commentId: string;
                emoji: string;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            parentId: string | null;
            content: string;
            taskId: string;
            authorId: string;
            mentions: string[];
            isEdited: boolean;
            editedAt: Date | null;
        })[];
        reactions: ({
            user: {
                id: string;
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            commentId: string;
            emoji: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        parentId: string | null;
        content: string;
        taskId: string;
        authorId: string;
        mentions: string[];
        isEdited: boolean;
        editedAt: Date | null;
    })[]>;
    replyToComment(commentId: string, companyId: string, userId: string, content: string, mentions?: string[]): Promise<{
        author: {
            id: string;
            firstName: string;
            lastName: string;
            avatar: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        parentId: string | null;
        content: string;
        taskId: string;
        authorId: string;
        mentions: string[];
        isEdited: boolean;
        editedAt: Date | null;
    }>;
    addReaction(commentId: string, companyId: string, userId: string, emoji: string): Promise<{
        user: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        commentId: string;
        emoji: string;
    }>;
    removeReaction(commentId: string, companyId: string, userId: string, emoji: string): Promise<{
        success: boolean;
    }>;
    getActivityFeed(taskId: string, companyId: string, limit?: number): Promise<({
        user: {
            id: string;
            firstName: string;
            lastName: string;
            avatar: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        description: string | null;
        userId: string;
        action: string;
        oldValue: string | null;
        newValue: string | null;
        taskId: string;
    })[]>;
    getProductivityMetrics(companyId: string, startDate?: Date, endDate?: Date): Promise<{
        totalTasks: number;
        completedTasks: number;
        approvedTasks: number;
        overdueTasks: number;
        completionRate: number;
        onTimeRate: number;
        avgCompletionHours: number;
        byPriority: {
            URGENT: number;
            HIGH: number;
            MEDIUM: number;
            LOW: number;
        };
        byStatus: {
            TODO: number;
            IN_PROGRESS: number;
            PENDING_REVIEW: number;
            IN_REVIEW: number;
            APPROVED: number;
            COMPLETED: number;
            REJECTED: number;
            BLOCKED: number;
        };
    }>;
    getTeamPerformance(companyId: string, startDate?: Date, endDate?: Date): Promise<any[]>;
    getTimeAnalytics(companyId: string, startDate?: Date, endDate?: Date): Promise<{
        totalHours: number;
        totalLogs: number;
        byUser: {
            userId: string;
            user: {
                id: string;
                firstName: string;
                lastName: string;
            } | undefined;
            hours: number;
        }[];
    }>;
    getTaskTrends(companyId: string, days?: number): Promise<{
        created: number;
        completed: number;
        date: string;
    }[]>;
    generateReport(companyId: string, options?: {
        startDate?: Date;
        endDate?: Date;
        categoryId?: string;
        assigneeId?: string;
        includeMetrics?: boolean;
        includeTeam?: boolean;
        includeTime?: boolean;
        includeTrends?: boolean;
    }): Promise<any>;
    createAutomation(companyId: string, userId: string, data: {
        name: string;
        description?: string;
        trigger: string;
        triggerConfig?: any;
        action: string;
        actionConfig?: any;
        categoryId?: string;
        priority?: string;
    }): Promise<{
        category: {
            id: string;
            name: string;
            color: string;
        } | null;
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        description: string | null;
        isActive: boolean;
        priority: import(".prisma/client").$Enums.TaskPriority | null;
        createdById: string;
        action: import(".prisma/client").$Enums.AutomationAction;
        categoryId: string | null;
        trigger: import(".prisma/client").$Enums.AutomationTrigger;
        triggerConfig: Prisma.JsonValue | null;
        actionConfig: Prisma.JsonValue | null;
        lastRunAt: Date | null;
        runCount: number;
    }>;
    getAutomations(companyId: string): Promise<({
        _count: {
            logs: number;
        };
        category: {
            id: string;
            name: string;
            color: string;
        } | null;
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        description: string | null;
        isActive: boolean;
        priority: import(".prisma/client").$Enums.TaskPriority | null;
        createdById: string;
        action: import(".prisma/client").$Enums.AutomationAction;
        categoryId: string | null;
        trigger: import(".prisma/client").$Enums.AutomationTrigger;
        triggerConfig: Prisma.JsonValue | null;
        actionConfig: Prisma.JsonValue | null;
        lastRunAt: Date | null;
        runCount: number;
    })[]>;
    updateAutomation(automationId: string, companyId: string, data: Partial<{
        name: string;
        description: string;
        trigger: string;
        triggerConfig: any;
        action: string;
        actionConfig: any;
        categoryId: string;
        priority: string;
        isActive: boolean;
    }>): Promise<{
        category: {
            id: string;
            name: string;
            color: string;
        } | null;
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        description: string | null;
        isActive: boolean;
        priority: import(".prisma/client").$Enums.TaskPriority | null;
        createdById: string;
        action: import(".prisma/client").$Enums.AutomationAction;
        categoryId: string | null;
        trigger: import(".prisma/client").$Enums.AutomationTrigger;
        triggerConfig: Prisma.JsonValue | null;
        actionConfig: Prisma.JsonValue | null;
        lastRunAt: Date | null;
        runCount: number;
    }>;
    deleteAutomation(automationId: string, companyId: string): Promise<{
        success: boolean;
    }>;
    toggleAutomation(automationId: string, companyId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        description: string | null;
        isActive: boolean;
        priority: import(".prisma/client").$Enums.TaskPriority | null;
        createdById: string;
        action: import(".prisma/client").$Enums.AutomationAction;
        categoryId: string | null;
        trigger: import(".prisma/client").$Enums.AutomationTrigger;
        triggerConfig: Prisma.JsonValue | null;
        actionConfig: Prisma.JsonValue | null;
        lastRunAt: Date | null;
        runCount: number;
    }>;
    processAutomations(companyId: string, taskId: string, trigger: string, context?: any): Promise<({
        automationId: string;
        success: boolean;
        error?: undefined;
    } | {
        automationId: string;
        success: boolean;
        error: any;
    })[]>;
    private executeAutomationAction;
    getAutomationLogs(automationId: string, companyId: string, limit?: number): Promise<{
        error: string | null;
        id: string;
        action: string;
        executedAt: Date;
        taskId: string;
        trigger: string;
        success: boolean;
        automationId: string;
    }[]>;
}
