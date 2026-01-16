import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { CreateTaskCategoryDto, UpdateTaskCategoryDto } from './dto/task-category.dto';
import { CreateTaskTemplateDto, UpdateTaskTemplateDto } from './dto/task-template.dto';
import { CreateChecklistDto, CreateChecklistItemDto, ToggleChecklistItemDto, CreateCommentDto, CreateTimeLogDto, AddDependencyDto, ReorderTaskDto } from './dto/task-actions.dto';
export declare class TasksController {
    private readonly tasksService;
    constructor(tasksService: TasksService);
    create(req: any, dto: CreateTaskDto): Promise<{
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
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
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
    getMyTasks(req: any): Promise<({
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
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
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
    findAll(req: any, query: TaskQueryDto): Promise<{
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
            customFields: import("@prisma/client/runtime/library").JsonValue | null;
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
    getKanban(req: any, categoryId?: string, myTasks?: string): Promise<Record<string, ({
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
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
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
    getStats(req: any, myStats?: string): Promise<{
        total: number;
        byStatus: {
            [k: string]: number;
        };
        byPriority: {
            [k: string]: number;
        };
        overdue: number;
    }>;
    findOne(req: any, id: string): Promise<{
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
            checklistTemplate: import("@prisma/client/runtime/library").JsonValue | null;
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
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
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
    update(req: any, id: string, dto: UpdateTaskDto): Promise<{
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
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
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
    remove(req: any, id: string): Promise<{
        message: string;
    }>;
    reorder(req: any, id: string, dto: ReorderTaskDto): Promise<{
        success: boolean;
    }>;
    addChecklist(req: any, id: string, dto: CreateChecklistDto): Promise<{
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
    addChecklistItem(req: any, checklistId: string, dto: CreateChecklistItemDto): Promise<{
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
    toggleChecklistItem(req: any, itemId: string, dto: ToggleChecklistItemDto): Promise<{
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
    deleteChecklistItem(req: any, itemId: string): Promise<{
        message: string;
    }>;
    addComment(req: any, id: string, dto: CreateCommentDto): Promise<{
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
    deleteComment(req: any, commentId: string): Promise<{
        message: string;
    }>;
    addTimeLog(req: any, id: string, dto: CreateTimeLogDto): Promise<{
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
    watch(req: any, id: string): Promise<{
        message: string;
    }>;
    unwatch(req: any, id: string): Promise<{
        message: string;
    }>;
    addDependency(req: any, id: string, dto: AddDependencyDto): Promise<{
        message: string;
    }>;
    removeDependency(req: any, id: string, blockingTaskId: string): Promise<{
        message: string;
    }>;
    uploadAttachment(req: any, id: string, file: Express.Multer.File): Promise<{
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
    deleteAttachment(req: any, attachmentId: string): Promise<{
        message: string;
    }>;
    requestReview(req: any, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TaskStatus;
        companyId: string;
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
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
    startReview(req: any, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TaskStatus;
        companyId: string;
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
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
    approveTask(req: any, id: string, body: {
        comment?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TaskStatus;
        companyId: string;
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
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
    rejectTask(req: any, id: string, body: {
        reason: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TaskStatus;
        companyId: string;
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
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
    requestChanges(req: any, id: string, body: {
        feedback: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TaskStatus;
        companyId: string;
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
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
    getApprovalHistory(req: any, id: string): Promise<({
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
    submitEvidence(req: any, id: string, body: {
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
    getEvidences(req: any, id: string): Promise<({
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
    verifyEvidence(req: any, evidenceId: string, body: {
        status: 'APPROVED' | 'REJECTED';
        comment?: string;
    }): Promise<{
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
    deleteEvidence(req: any, evidenceId: string): Promise<{
        success: boolean;
    }>;
    getDependencies(req: any, id: string): Promise<{
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
    updateDependencyType(req: any, dependencyId: string, body: {
        type: 'BLOCKS' | 'BLOCKED_BY' | 'RELATED' | 'DUPLICATES';
    }): Promise<{
        id: string;
        createdAt: Date;
        type: import(".prisma/client").$Enums.DependencyType;
        blockingTaskId: string;
        blockedTaskId: string;
    }>;
    getGanttData(req: any, categoryId?: string): Promise<{
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
    getComments(req: any, id: string): Promise<({
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
    replyToComment(req: any, commentId: string, body: {
        content: string;
        mentions?: string[];
    }): Promise<{
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
    addReaction(req: any, commentId: string, body: {
        emoji: string;
    }): Promise<{
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
    removeReaction(req: any, commentId: string, emoji: string): Promise<{
        success: boolean;
    }>;
    getActivityFeed(req: any, id: string, limit?: string): Promise<({
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
    getProductivityMetrics(req: any, startDate?: string, endDate?: string): Promise<{
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
    getTeamPerformance(req: any, startDate?: string, endDate?: string): Promise<any[]>;
    getTimeAnalytics(req: any, startDate?: string, endDate?: string): Promise<{
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
    getTaskTrends(req: any, days?: string): Promise<{
        created: number;
        completed: number;
        date: string;
    }[]>;
    generateReport(req: any, body: {
        startDate?: string;
        endDate?: string;
        categoryId?: string;
        assigneeId?: string;
        includeMetrics?: boolean;
        includeTeam?: boolean;
        includeTime?: boolean;
        includeTrends?: boolean;
    }): Promise<any>;
    createAutomation(req: any, body: {
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
        triggerConfig: import("@prisma/client/runtime/library").JsonValue | null;
        actionConfig: import("@prisma/client/runtime/library").JsonValue | null;
        lastRunAt: Date | null;
        runCount: number;
    }>;
    getAutomations(req: any): Promise<({
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
        triggerConfig: import("@prisma/client/runtime/library").JsonValue | null;
        actionConfig: import("@prisma/client/runtime/library").JsonValue | null;
        lastRunAt: Date | null;
        runCount: number;
    })[]>;
    updateAutomation(req: any, id: string, body: Partial<{
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
        triggerConfig: import("@prisma/client/runtime/library").JsonValue | null;
        actionConfig: import("@prisma/client/runtime/library").JsonValue | null;
        lastRunAt: Date | null;
        runCount: number;
    }>;
    deleteAutomation(req: any, id: string): Promise<{
        success: boolean;
    }>;
    toggleAutomation(req: any, id: string): Promise<{
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
        triggerConfig: import("@prisma/client/runtime/library").JsonValue | null;
        actionConfig: import("@prisma/client/runtime/library").JsonValue | null;
        lastRunAt: Date | null;
        runCount: number;
    }>;
    getAutomationLogs(req: any, id: string, limit?: string): Promise<{
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
export declare class TaskCategoriesController {
    private readonly tasksService;
    constructor(tasksService: TasksService);
    findAll(req: any): Promise<({
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
    create(req: any, dto: CreateTaskCategoryDto): Promise<{
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
    update(req: any, id: string, dto: UpdateTaskCategoryDto): Promise<{
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
    remove(req: any, id: string): Promise<{
        message: string;
    }>;
}
export declare class TaskTemplatesController {
    private readonly tasksService;
    constructor(tasksService: TasksService);
    findAll(req: any): Promise<({
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
        checklistTemplate: import("@prisma/client/runtime/library").JsonValue | null;
    })[]>;
    create(req: any, dto: CreateTaskTemplateDto): Promise<{
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
        checklistTemplate: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    update(req: any, id: string, dto: UpdateTaskTemplateDto): Promise<{
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
        checklistTemplate: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    remove(req: any, id: string): Promise<{
        message: string;
    }>;
}
