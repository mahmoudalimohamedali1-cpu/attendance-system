export declare class CreateChecklistDto {
    title: string;
}
export declare class CreateChecklistItemDto {
    content: string;
}
export declare class ToggleChecklistItemDto {
    isCompleted: boolean;
}
export declare class CreateCommentDto {
    content: string;
    mentions?: string[];
}
export declare class UpdateCommentDto {
    content: string;
}
export declare class AssignTaskDto {
    userId: string;
}
export declare class BulkAssignDto {
    userIds: string[];
}
export declare class CreateTimeLogDto {
    startTime: string;
    endTime?: string;
    duration?: number;
    description?: string;
    isBillable?: boolean;
}
export declare class AddDependencyDto {
    blockingTaskId: string;
}
export declare class ReorderTaskDto {
    status: string;
    order: number;
}
