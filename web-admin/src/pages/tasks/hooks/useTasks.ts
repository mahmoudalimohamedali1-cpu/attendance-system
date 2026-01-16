import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi, taskCategoriesApi, taskTemplatesApi, TaskQuery, Task } from '@/services/tasks.service';

// ============ TASKS HOOKS ============

export const useTasks = (query?: TaskQuery) => {
    return useQuery({
        queryKey: ['tasks', query],
        queryFn: () => tasksApi.getTasks(query),
    });
};

export const useTask = (id: string) => {
    return useQuery({
        queryKey: ['task', id],
        queryFn: () => tasksApi.getTask(id),
        enabled: !!id,
    });
};

export const useKanbanBoard = (categoryId?: string, myTasks?: boolean) => {
    return useQuery({
        queryKey: ['kanban', categoryId, myTasks],
        queryFn: () => tasksApi.getKanban(categoryId, myTasks),
    });
};

export const useTaskStats = (myStats?: boolean) => {
    return useQuery({
        queryKey: ['taskStats', myStats],
        queryFn: () => tasksApi.getStats(myStats),
    });
};

export const useCreateTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<Task>) => tasksApi.createTask(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['kanban'] });
            queryClient.invalidateQueries({ queryKey: ['taskStats'] });
        },
    });
};

export const useUpdateTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) => tasksApi.updateTask(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['task', id] });
            queryClient.invalidateQueries({ queryKey: ['kanban'] });
        },
    });
};

export const useDeleteTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => tasksApi.deleteTask(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['kanban'] });
            queryClient.invalidateQueries({ queryKey: ['taskStats'] });
        },
    });
};

export const useReorderTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status, order }: { id: string; status: string; order: number }) =>
            tasksApi.reorderTask(id, status, order),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kanban'] });
        },
    });
};

// ============ CHECKLISTS HOOKS ============

export const useAddChecklist = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ taskId, title }: { taskId: string; title: string }) =>
            tasksApi.addChecklist(taskId, title),
        onSuccess: (_, { taskId }) => {
            queryClient.invalidateQueries({ queryKey: ['task', taskId] });
        },
    });
};

export const useAddChecklistItem = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ checklistId, content }: { checklistId: string; content: string }) =>
            tasksApi.addChecklistItem(checklistId, content),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task'] });
        },
    });
};

export const useToggleChecklistItem = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ itemId, isCompleted }: { itemId: string; isCompleted: boolean }) =>
            tasksApi.toggleChecklistItem(itemId, isCompleted),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task'] });
            queryClient.invalidateQueries({ queryKey: ['kanban'] });
        },
    });
};

export const useDeleteChecklistItem = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (itemId: string) => tasksApi.deleteChecklistItem(itemId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task'] });
            queryClient.invalidateQueries({ queryKey: ['kanban'] });
        },
    });
};

// ============ COMMENTS HOOKS ============

export const useAddComment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ taskId, content, mentions }: { taskId: string; content: string; mentions?: string[] }) =>
            tasksApi.addComment(taskId, content, mentions),
        onSuccess: (_, { taskId }) => {
            queryClient.invalidateQueries({ queryKey: ['task', taskId] });
        },
    });
};

export const useDeleteComment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (commentId: string) => tasksApi.deleteComment(commentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task'] });
        },
    });
};

// ============ TIME LOGS HOOKS ============

export const useAddTimeLog = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ taskId, data }: { taskId: string; data: { startTime: string; endTime?: string; duration?: number; description?: string } }) =>
            tasksApi.addTimeLog(taskId, data),
        onSuccess: (_, { taskId }) => {
            queryClient.invalidateQueries({ queryKey: ['task', taskId] });
        },
    });
};

// ============ DEPENDENCIES HOOKS ============

export const useAddDependency = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ blockedTaskId, blockingTaskId }: { blockedTaskId: string; blockingTaskId: string }) =>
            tasksApi.addDependency(blockedTaskId, blockingTaskId),
        onSuccess: (_, { blockedTaskId }) => {
            queryClient.invalidateQueries({ queryKey: ['task', blockedTaskId] });
        },
    });
};

export const useRemoveDependency = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ blockedTaskId, blockingTaskId }: { blockedTaskId: string; blockingTaskId: string }) =>
            tasksApi.removeDependency(blockedTaskId, blockingTaskId),
        onSuccess: (_, { blockedTaskId }) => {
            queryClient.invalidateQueries({ queryKey: ['task', blockedTaskId] });
        },
    });
};

// ============ ATTACHMENTS HOOKS ============

export const useUploadAttachment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ taskId, file }: { taskId: string; file: File }) =>
            tasksApi.uploadAttachment(taskId, file),
        onSuccess: (_, { taskId }) => {
            queryClient.invalidateQueries({ queryKey: ['task', taskId] });
        },
    });
};

export const useDeleteAttachment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (attachmentId: string) => tasksApi.deleteAttachment(attachmentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['task'] });
        },
    });
};

// ============ CATEGORIES HOOKS ============

export const useTaskCategories = () => {
    return useQuery({
        queryKey: ['taskCategories'],
        queryFn: () => taskCategoriesApi.getAll(),
    });
};

export const useCreateCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { name: string; nameEn?: string; color?: string; icon?: string }) =>
            taskCategoriesApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['taskCategories'] });
        },
    });
};

// ============ TEMPLATES HOOKS ============

export const useTaskTemplates = () => {
    return useQuery({
        queryKey: ['taskTemplates'],
        queryFn: () => taskTemplatesApi.getAll(),
    });
};

export const useCreateTemplate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => taskTemplatesApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['taskTemplates'] });
        },
    });
};

// ============ GANTT CHART HOOKS ============

export interface GanttTask {
    id: string;
    name: string;
    start: string | null;
    end: string | null;
    progress: number;
    status: string;
    priority: string;
    assignee?: {
        id: string;
        firstName: string;
        lastName: string;
        avatar?: string;
    };
    category?: {
        id: string;
        name: string;
        color: string;
    };
    dependencies: string[];
    type: 'task' | 'milestone';
}

export const useGanttData = (categoryId?: string) => {
    return useQuery({
        queryKey: ['ganttData', categoryId],
        queryFn: async () => {
            const response = await tasksApi.getGanttData(categoryId);
            return response.data as GanttTask[];
        },
    });
};
