import { TaskPriority } from '@prisma/client';
export declare class CreateTaskTemplateDto {
    name: string;
    nameEn?: string;
    description?: string;
    categoryId?: string;
    defaultPriority?: TaskPriority;
    defaultDueDays?: number;
    workflowType?: string;
    checklistTemplate?: any[];
}
export declare class UpdateTaskTemplateDto {
    name?: string;
    nameEn?: string;
    description?: string;
    categoryId?: string;
    defaultPriority?: TaskPriority;
    defaultDueDays?: number;
    workflowType?: string;
    checklistTemplate?: any[];
}
