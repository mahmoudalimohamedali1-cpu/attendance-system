import { TaskPriority, TaskStatus } from '@prisma/client';
export declare class TaskQueryDto {
    search?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    categoryId?: string;
    assigneeId?: string;
    createdById?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
    tags?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
