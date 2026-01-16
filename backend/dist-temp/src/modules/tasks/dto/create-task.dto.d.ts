import { TaskPriority, TaskStatus } from '@prisma/client';
export declare class CreateTaskDto {
    title: string;
    description?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
    categoryId?: string;
    templateId?: string;
    dueDate?: string;
    startDate?: string;
    assigneeId?: string;
    tags?: string[];
    customFields?: Record<string, any>;
}
