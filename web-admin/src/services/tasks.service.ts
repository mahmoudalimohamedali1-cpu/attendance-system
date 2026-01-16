import { api } from './api.service';

export interface Task {
    id: string;
    title: string;
    description?: string;
    status: 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED';
    priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
    categoryId?: string;
    category?: TaskCategory;
    // Sprint support
    sprintId?: string;
    sprint?: Sprint;
    storyPoints?: number;
    estimatedHours?: number;
    // Dates
    dueDate?: string;
    startDate?: string;
    completedAt?: string;
    createdById: string;
    createdBy: UserBrief;
    assigneeId?: string;
    assignee?: UserBrief;
    // Workflow roles
    reviewerId?: string;
    reviewer?: UserBrief;
    approverId?: string;
    approver?: UserBrief;
    // Workflow tracking
    reviewRequestedAt?: string;
    reviewedAt?: string;
    approvedAt?: string;
    rejectedAt?: string;
    rejectionReason?: string;
    // Other
    progress: number;
    tags: string[];
    recurrenceType?: string;
    checklists: TaskChecklist[];
    _count?: { comments: number; attachments: number };
    createdAt: string;
    updatedAt: string;
}

export interface UserBrief {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    email?: string;
}

export interface TaskCategory {
    id: string;
    name: string;
    nameEn?: string;
    color: string;
    icon?: string;
    _count?: { tasks: number };
}

export interface TaskTemplate {
    id: string;
    name: string;
    nameEn?: string;
    description?: string;
    category?: TaskCategory;
    defaultPriority: string;
    defaultDueDays?: number;
    workflowType?: string;
    checklistTemplate?: any[];
}

export interface TaskChecklist {
    id: string;
    title: string;
    order: number;
    items: TaskChecklistItem[];
}

export interface TaskChecklistItem {
    id: string;
    content: string;
    isCompleted: boolean;
    order: number;
}

export interface TaskComment {
    id: string;
    content: string;
    author: UserBrief;
    mentions: string[];
    createdAt: string;
}

export interface TaskTimeLog {
    id: string;
    startTime: string;
    endTime?: string;
    duration?: number;
    description?: string;
    user: UserBrief;
}

export interface TaskQuery {
    search?: string;
    status?: string;
    priority?: string;
    categoryId?: string;
    sprintId?: string;
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

export interface KanbanBoard {
    BACKLOG: Task[];
    TODO: Task[];
    IN_PROGRESS: Task[];
    IN_REVIEW: Task[];
    BLOCKED: Task[];
    COMPLETED: Task[];
}

export interface TaskStats {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    overdue: number;
}

// ============ TASKS API ============

export const tasksApi = {
    // Tasks CRUD
    getTasks: (params?: TaskQuery) => api.get<{ data: Task[]; meta: any }>('/tasks', { params }),
    getTask: (id: string) => api.get<Task>(`/tasks/${id}`),
    createTask: (data: Partial<Task>) => api.post<Task>('/tasks', data),
    updateTask: (id: string, data: Partial<Task>) => api.patch<Task>(`/tasks/${id}`, data),
    deleteTask: (id: string) => api.delete(`/tasks/${id}`),

    // Kanban
    getKanban: (categoryId?: string, myTasks?: boolean) =>
        api.get<KanbanBoard>('/tasks/kanban', { params: { categoryId, myTasks } }),
    reorderTask: (id: string, status: string, order: number) =>
        api.patch(`/tasks/${id}/reorder`, { status, order }),

    // Stats
    getStats: (myStats?: boolean) => api.get<TaskStats>('/tasks/stats', { params: { myStats } }),

    // Checklists
    addChecklist: (taskId: string, title: string) =>
        api.post<TaskChecklist>(`/tasks/${taskId}/checklists`, { title }),
    addChecklistItem: (checklistId: string, content: string) =>
        api.post<TaskChecklistItem>(`/tasks/checklists/${checklistId}/items`, { content }),
    toggleChecklistItem: (itemId: string, isCompleted: boolean) =>
        api.patch(`/tasks/checklist-items/${itemId}/toggle`, { isCompleted }),
    deleteChecklistItem: (itemId: string) =>
        api.delete(`/tasks/checklist-items/${itemId}`),

    // Comments
    addComment: (taskId: string, content: string, mentions?: string[]) =>
        api.post<TaskComment>(`/tasks/${taskId}/comments`, { content, mentions }),
    deleteComment: (commentId: string) => api.delete(`/tasks/comments/${commentId}`),

    // Time Logs
    addTimeLog: (taskId: string, data: { startTime: string; endTime?: string; duration?: number; description?: string }) =>
        api.post<TaskTimeLog>(`/tasks/${taskId}/time-logs`, data),

    // Attachments
    uploadAttachment: (taskId: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post(`/tasks/${taskId}/attachments`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    deleteAttachment: (attachmentId: string) => api.delete(`/tasks/attachments/${attachmentId}`),

    // Watchers
    watch: (taskId: string) => api.post(`/tasks/${taskId}/watch`),
    unwatch: (taskId: string) => api.delete(`/tasks/${taskId}/watch`),

    // Workflow Actions
    requestReview: (taskId: string) => api.post(`/tasks/${taskId}/workflow/request-review`),
    startReview: (taskId: string) => api.post(`/tasks/${taskId}/workflow/start-review`),
    approve: (taskId: string, comment?: string) =>
        api.post(`/tasks/${taskId}/workflow/approve`, { comment }),
    reject: (taskId: string, reason: string) =>
        api.post(`/tasks/${taskId}/workflow/reject`, { reason }),
    requestChanges: (taskId: string, feedback: string) =>
        api.post(`/tasks/${taskId}/workflow/request-changes`, { feedback }),
    getApprovalHistory: (taskId: string) =>
        api.get(`/tasks/${taskId}/workflow/history`),

    // Evidence APIs
    submitEvidence: (taskId: string, data: {
        description?: string;
        fileUrl?: string;
        fileName?: string;
        fileType?: string;
        fileSize?: number;
        latitude?: number;
        longitude?: number;
        locationName?: string;
    }) => api.post(`/tasks/${taskId}/evidence`, data),
    getEvidences: (taskId: string) =>
        api.get(`/tasks/${taskId}/evidence`),
    verifyEvidence: (evidenceId: string, status: 'APPROVED' | 'REJECTED', comment?: string) =>
        api.post(`/tasks/evidence/${evidenceId}/verify`, { status, comment }),
    deleteEvidence: (evidenceId: string) =>
        api.delete(`/tasks/evidence/${evidenceId}`),

    // Dependencies
    addDependency: (blockedTaskId: string, blockingTaskId: string, type?: string) =>
        api.post(`/tasks/${blockedTaskId}/dependencies`, { blockingTaskId, type }),
    removeDependency: (blockedTaskId: string, blockingTaskId: string) =>
        api.delete(`/tasks/${blockedTaskId}/dependencies/${blockingTaskId}`),
    getDependencies: (taskId: string) =>
        api.get(`/tasks/${taskId}/dependencies`),
    updateDependencyType: (dependencyId: string, type: 'BLOCKS' | 'BLOCKED_BY' | 'RELATED' | 'DUPLICATES') =>
        api.patch(`/tasks/dependencies/${dependencyId}/type`, { type }),

    // Gantt Chart
    getGanttData: (categoryId?: string) =>
        api.get('/tasks/gantt', { params: categoryId ? { categoryId } : {} }),

    // Communication Hub
    getThreadedComments: (taskId: string) =>
        api.get(`/tasks/${taskId}/comments/threaded`),
    replyToComment: (commentId: string, content: string, mentions?: string[]) =>
        api.post(`/tasks/comments/${commentId}/reply`, { content, mentions }),
    addReaction: (commentId: string, emoji: string) =>
        api.post(`/tasks/comments/${commentId}/reactions`, { emoji }),
    removeReaction: (commentId: string, emoji: string) =>
        api.delete(`/tasks/comments/${commentId}/reactions/${emoji}`),
    getActivityFeed: (taskId: string, limit?: number) =>
        api.get(`/tasks/${taskId}/activity`, { params: limit ? { limit } : {} }),

    // Analytics
    getProductivityMetrics: (startDate?: string, endDate?: string) =>
        api.get('/tasks/analytics/metrics', { params: { startDate, endDate } }),
    getTeamPerformance: (startDate?: string, endDate?: string) =>
        api.get('/tasks/analytics/team', { params: { startDate, endDate } }),
    getTimeAnalytics: (startDate?: string, endDate?: string) =>
        api.get('/tasks/analytics/time', { params: { startDate, endDate } }),
    getTaskTrends: (days?: number) =>
        api.get('/tasks/analytics/trends', { params: days ? { days } : {} }),
    generateReport: (options: {
        startDate?: string;
        endDate?: string;
        categoryId?: string;
        assigneeId?: string;
        includeMetrics?: boolean;
        includeTeam?: boolean;
        includeTime?: boolean;
        includeTrends?: boolean;
    }) => api.post('/tasks/analytics/report', options),

    // Automations
    createAutomation: (data: {
        name: string;
        description?: string;
        trigger: string;
        triggerConfig?: any;
        action: string;
        actionConfig?: any;
        categoryId?: string;
        priority?: string;
    }) => api.post('/tasks/automations', data),
    getAutomations: () => api.get('/tasks/automations'),
    updateAutomation: (id: string, data: any) =>
        api.patch(`/tasks/automations/${id}`, data),
    deleteAutomation: (id: string) =>
        api.delete(`/tasks/automations/${id}`),
    toggleAutomation: (id: string) =>
        api.patch(`/tasks/automations/${id}/toggle`),
    getAutomationLogs: (id: string, limit?: number) =>
        api.get(`/tasks/automations/${id}/logs`, { params: limit ? { limit } : {} }),
};

// ============ CATEGORIES API ============

export const taskCategoriesApi = {
    getAll: () => api.get<TaskCategory[]>('/task-categories'),
    create: (data: { name: string; nameEn?: string; color?: string; icon?: string }) =>
        api.post<TaskCategory>('/task-categories', data),
    update: (id: string, data: Partial<TaskCategory>) =>
        api.patch<TaskCategory>(`/task-categories/${id}`, data),
    delete: (id: string) => api.delete(`/task-categories/${id}`),
};

// ============ TEMPLATES API ============

export const taskTemplatesApi = {
    getAll: () => api.get<TaskTemplate[]>('/task-templates'),
    create: (data: Partial<TaskTemplate>) => api.post<TaskTemplate>('/task-templates', data),
    update: (id: string, data: Partial<TaskTemplate>) =>
        api.patch<TaskTemplate>(`/task-templates/${id}`, data),
    delete: (id: string) => api.delete(`/task-templates/${id}`),
};

// ============ ENTERPRISE FEATURES API ============

export interface SprintStats {
    totalTasks: number;
    completedTasks: number;
    totalPoints: number;
    completedPoints: number;
    progressPercent: number;
}

export interface Sprint {
    id: string;
    name: string;
    goal?: string;
    description?: string;
    status: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    startDate?: string;
    endDate?: string;
    startedAt?: string;
    completedAt?: string;
    plannedPoints?: number;
    completedPoints?: number;
    velocity?: number;
    createdBy?: UserBrief;
    tasks?: Task[];
    stats?: SprintStats;
    _count?: { tasks: number };
    createdAt?: string;
}

export interface TeamWorkload {
    userId: string;
    user: UserBrief;
    totalTasks: number;
    inProgressTasks: number;
    completedTasks: number;
    overdueTasks: number;
    totalStoryPoints: number;
    averageCompletionTime: number;
    workloadScore: number;
}

export interface AiSuggestion {
    type: 'category' | 'assignee' | 'dueDate' | 'priority';
    suggestion: any;
    confidence: number;
    reason: string;
}

export interface ActiveTimer {
    id: string;
    taskId: string;
    task: Task;
    startTime: string;
    elapsed: number;
}

export const enterpriseTasksApi = {
    // ============ SPRINTS ============
    getSprints: (status?: string) => api.get<Sprint[]>('/sprints', { params: status ? { status } : {} }),
    getSprint: (sprintId: string) => api.get<Sprint>(`/sprints/${sprintId}`),
    getActiveSprint: () => api.get<Sprint | null>('/sprints/active'),
    createSprint: (data: { name: string; goal?: string; description?: string; startDate?: string; endDate?: string }) =>
        api.post<Sprint>('/sprints', data),
    updateSprint: (sprintId: string, data: { name?: string; goal?: string; description?: string; startDate?: string; endDate?: string }) =>
        api.put<Sprint>(`/sprints/${sprintId}`, data),
    deleteSprint: (sprintId: string) => api.delete(`/sprints/${sprintId}`),
    startSprint: (sprintId: string) => api.post<Sprint>(`/sprints/${sprintId}/start`),
    completeSprint: (sprintId: string, moveIncompleteTo?: string) =>
        api.post<Sprint>(`/sprints/${sprintId}/complete`, { moveIncompleteTo }),
    cancelSprint: (sprintId: string) => api.post(`/sprints/${sprintId}/cancel`),
    addTasksToSprint: (sprintId: string, taskIds: string[]) =>
        api.post<Sprint>(`/sprints/${sprintId}/tasks`, { taskIds }),
    removeTasksFromSprint: (sprintId: string, taskIds: string[]) =>
        api.delete(`/sprints/${sprintId}/tasks`, { data: { taskIds } }),
    getSprintBurndown: (sprintId: string) => api.get(`/sprints/${sprintId}/burndown`),
    getVelocityHistory: (limit?: number) => api.get('/sprints/velocity', { params: limit ? { limit } : {} }),
    updateStoryPoints: (taskId: string, storyPoints: number) =>
        api.patch(`/tasks/${taskId}`, { storyPoints }),

    // ============ TIME TRACKING ============
    startTimer: (taskId: string) => api.post<ActiveTimer>(`/tasks/${taskId}/timer/start`),
    stopTimer: (timeLogId: string, description?: string) =>
        api.post(`/tasks/timer/${timeLogId}/stop`, { description }),
    getActiveTimers: () => api.get<ActiveTimer[]>('/tasks/timer/active'),
    getMyTimeLogs: (startDate?: string, endDate?: string) =>
        api.get('/tasks/time-logs/my', { params: { startDate, endDate } }),

    // ============ TEAM WORKLOAD ============
    getTeamWorkload: () => api.get<TeamWorkload[]>('/tasks/workload/team'),
    getWorkloadCalendar: (startDate?: string, endDate?: string) =>
        api.get('/tasks/workload/calendar', { params: { startDate, endDate } }),
    getResourceCapacity: () => api.get('/tasks/capacity/resources'),
    getSuggestedReassignment: (taskId: string) =>
        api.get(`/tasks/${taskId}/suggest-reassignment`),

    // ============ AI FEATURES ============
    autoCategorize: (taskId: string) =>
        api.post<{ categoryId: string; confidence: number }>(`/tasks/ai/auto-categorize`, { taskId }),
    getWorkloadBalance: () => api.get('/tasks/ai/workload'),
    predictDueDate: (taskId: string) =>
        api.get(`/tasks/ai/predict-due-date`, { params: { taskId } }),
    getSimilarTasks: (taskId: string) =>
        api.get(`/tasks/ai/similar`, { params: { taskId } }),
    getAssignmentRecommendation: (taskId: string) =>
        api.post('/tasks/ai/assignment-recommendation', { taskId }),
    getSmartSchedule: () => api.get('/tasks/ai/smart-schedule'),
    getSmartSuggestions: () => api.get<AiSuggestion[]>('/tasks/suggestions/smart'),

    // ============ BULK OPERATIONS ============
    bulkUpdate: (taskIds: string[], updates: Partial<Task>) =>
        api.post('/tasks/bulk/update', { taskIds, updates }),
    bulkDelete: (taskIds: string[]) =>
        api.post('/tasks/bulk/delete', { taskIds }),
    cloneTask: (taskId: string, options?: { includeChecklists?: boolean; includeAttachments?: boolean }) =>
        api.post(`/tasks/${taskId}/clone`, options),

    // ============ RECURRING TASKS ============
    createRecurringTask: (data: {
        title: string;
        description?: string;
        priority?: string;
        categoryId?: string;
        assigneeId?: string;
        recurrenceType: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
        recurrenceConfig?: any;
    }) => api.post('/tasks/recurring', data),
    getRecurringTasks: () => api.get('/tasks/recurring'),

    // ============ ADVANCED VIEWS ============
    getEnhancedGantt: (categoryId?: string, assigneeId?: string) =>
        api.get('/tasks/gantt/enhanced', { params: { categoryId, assigneeId } }),
    getPrioritizedBacklog: () => api.get('/tasks/backlog/prioritized'),
    getActivityFeed: (limit?: number) =>
        api.get('/tasks/activity-feed', { params: { limit } }),

    // ============ FAVORITES & SHARING ============
    addToFavorites: (taskId: string) => api.post(`/tasks/${taskId}/favorites`),
    getMyFavorites: () => api.get('/tasks/favorites/my'),
    shareTask: (taskId: string, expiresInDays?: number) =>
        api.post(`/tasks/${taskId}/share`, { expiresInDays }),
    getSharedTask: (token: string) => api.get(`/tasks/shared/${token}`),

    // ============ POLLS ============
    createPoll: (taskId: string, data: { question: string; options: string[]; allowMultiple?: boolean; endsAt?: string }) =>
        api.post(`/tasks/${taskId}/polls`, data),
    votePoll: (pollId: string, optionIds: string[]) =>
        api.post(`/tasks/polls/${pollId}/vote`, { optionIds }),

    // ============ OKR INTEGRATION ============
    linkToOkr: (taskId: string, okrId: string, keyResultId?: string) =>
        api.post(`/tasks/${taskId}/okr`, { okrId, keyResultId }),
    getOkrTasks: (okrId?: string) =>
        api.get('/tasks/okr/tasks', { params: { okrId } }),

    // ============ COMPLIANCE & AUDIT ============
    getAuditTrail: (taskId: string) => api.get(`/tasks/${taskId}/audit-trail`),
    exportUserData: (userId: string) => api.get(`/tasks/gdpr/export/${userId}`),
    deleteUserData: (userId: string) => api.delete(`/tasks/gdpr/delete/${userId}`),
    getComplianceReport: () => api.get('/tasks/compliance/report'),
    getSlaStatus: (taskId: string) => api.get(`/tasks/${taskId}/sla`),

    // ============ ARCHIVING ============
    archiveTasks: (taskIds: string[]) => api.post('/tasks/archive', { taskIds }),
    restoreTasks: (taskIds: string[]) => api.post('/tasks/restore', { taskIds }),
    setLegalHold: (taskId: string, isOnHold: boolean, reason?: string) =>
        api.put(`/tasks/${taskId}/legal-hold`, { isOnHold, reason }),

    // ============ BATCH 1: ADVANCED TASK MANAGEMENT (NEW) ============

    // 1. Smart Task Prioritization
    getSmartPriority: (myTasks?: boolean) =>
        api.get<{
            tasks: (Task & { smartScore: number })[];
            summary: { total: number; urgent: number; high: number; normal: number };
        }>('/tasks/smart-priority', { params: { myTasks } }),

    // 2. Dependency Graph Visualization
    getDependencyGraph: (categoryId?: string) =>
        api.get<{
            nodes: { id: string; label: string; status: string; priority: string; assignee: string | null; dueDate: string; progress: number }[];
            edges: { source: string; target: string; type: string }[];
            stats: { totalTasks: number; totalDependencies: number };
        }>('/tasks/dependency-graph', { params: categoryId ? { categoryId } : {} }),

    // 3. Auto-assign Task
    autoAssignTask: (taskId: string) =>
        api.post<{
            success: boolean;
            assignedTo?: { id: string; name: string };
            reason: string;
        }>(`/tasks/${taskId}/auto-assign`),

    // 4. Workload Analysis
    getWorkloadAnalysis: () =>
        api.get<{
            employees: {
                employee: { id: string; name: string; avatar: string | null };
                taskCount: number;
                totalPoints: number;
                totalHours: number;
                overdueTasks: number;
                urgentTasks: number;
                loadLevel: 'OVERLOADED' | 'HIGH' | 'NORMAL' | 'LOW';
            }[];
            summary: { totalEmployees: number; averageLoad: number; overloaded: number; balanced: number; underutilized: number };
        }>('/tasks/workload-analysis'),

    // 5. Burndown Chart V2
    getBurndownV2: (sprintId?: string, startDate?: string, endDate?: string) =>
        api.get<{
            data: { date: string; remaining: number; ideal: number; completed: number }[];
            summary: { totalPoints: number; completedPoints: number; remainingPoints: number };
        }>('/tasks/burndown', { params: { sprintId, startDate, endDate } }),

    // 6. Velocity Tracking V2
    getVelocityV2: (weeks?: number) =>
        api.get<{
            data: { week: string; completed: number; points: number }[];
            summary: { averageVelocity: number; trend: 'UP' | 'DOWN'; totalCompleted: number };
        }>('/tasks/velocity', { params: weeks ? { weeks } : {} }),

    // 7. AI Task Estimation
    estimateTaskDuration: (title: string, description?: string, categoryId?: string) =>
        api.post<{
            estimatedHours: number;
            estimatedPoints: number;
            confidence: 'HIGH' | 'MEDIUM' | 'LOW';
            basedOn: string;
        }>('/tasks/ai-estimate', { title, description, categoryId }),

    // 8. Template Categories
    getTemplateCategories: () =>
        api.get<{
            categories: { name: string; count: number; templates: TaskTemplate[] }[];
            total: number;
        }>('/tasks/template-categories'),

    // ============ VELOCITY HELPER ============
    getVelocity: () => api.get<{ average: number; trend: number[] }>('/tasks/velocity'),

    // ============ BATCH 4: ADVANCED PLANNING FEATURES ============

    // 1. Timeline View
    getTimelineView: (params?: { startDate?: string; endDate?: string; groupBy?: 'assignee' | 'category' | 'priority' | 'status'; zoom?: 'day' | 'week' | 'month' }) =>
        api.get<{
            timeline: { startDate: string; endDate: string; zoom: string; groupBy: string };
            groups: { name: string; taskCount: number; tasks: any[] }[];
            summary: { totalTasks: number; completedTasks: number; overdueTasks: number };
        }>('/tasks/timeline', { params }),

    // 2. Buffer Time Calculation
    getBufferTime: (taskId?: string) =>
        api.get<{
            tasks?: { taskId: string; title: string; estimatedHours: number; recommendedBufferHours: number; recommendedBufferDays: number; daysUntilDeadline: number | null; riskLevel: 'HIGH' | 'MEDIUM' | 'LOW'; suggestions: string[] }[];
            summary?: { highRisk: number; mediumRisk: number; lowRisk: number; averageBuffer: number };
        } | { taskId: string; title: string; estimatedHours: number; recommendedBufferHours: number; recommendedBufferDays: number; daysUntilDeadline: number | null; riskLevel: 'HIGH' | 'MEDIUM' | 'LOW'; suggestions: string[] }>('/tasks/buffer-time', { params: taskId ? { taskId } : {} }),

    // 3. Critical Path Analysis
    getCriticalPath: (projectId?: string) =>
        api.get<{
            projectDuration: number;
            criticalPath: { tasks: { id: string; title: string; duration: number; earlyStart: number; earlyFinish: number; lateStart: number; lateFinish: number; slack: number; status: string; isCritical: boolean }[]; totalDuration: number; count: number };
            nonCriticalTasks: { tasks: any[]; count: number; averageSlack: number };
            recommendations: string[];
        }>('/tasks/critical-path', { params: projectId ? { projectId } : {} }),

    // 4. What-If Scenarios
    runWhatIfScenario: (scenario: {
        type: 'delay_task' | 'add_resource' | 'change_priority' | 'remove_dependency' | 'extend_deadline';
        taskId?: string;
        parameters: { delayDays?: number; resourceMultiplier?: number; newPriority?: string; dependencyToRemove?: string; newDeadline?: string };
    }) =>
        api.post<{
            scenario: string;
            parameters: any;
            currentState: { projectDuration: number; criticalPathLength: number };
            simulatedImpact: any;
            timestamp: string;
        }>('/tasks/what-if', scenario),

    // ============ BATCH 5: SLA, ESCALATION, RELEASES, ROADMAP ============

    // SLA Tracking
    getSLAConfig: () => api.get<Record<string, { responseHours: number; resolutionHours: number }>>('/tasks/sla/config'),
    updateSLAConfig: (config: Record<string, { responseHours: number; resolutionHours: number }>) =>
        api.put<{ success: boolean; slaConfig: any }>('/tasks/sla/config', config),
    checkSLAViolations: () =>
        api.get<{
            totalActiveTasks: number;
            violations: { count: number; items: any[] };
            warnings: { count: number; items: any[] };
            slaConfig: any;
            checkedAt: string;
        }>('/tasks/sla/violations'),

    // Escalation Rules
    getEscalationRules: () =>
        api.get<{ id: string; name: string; trigger: string; condition: any; action: string; delayHours: number }[]>('/tasks/escalation/rules'),
    updateEscalationRules: (rules: any[]) =>
        api.put<{ success: boolean; rules: any[] }>('/tasks/escalation/rules', rules),
    triggerEscalation: (taskId: string, ruleId: string) =>
        api.post<{ taskId: string; ruleId: string; actionTaken: string; escalatedAt: string }>('/tasks/escalation/trigger', { taskId, ruleId }),
    runEscalationCheck: () =>
        api.post<{ rulesChecked: number; escalationsTriggered: number; escalations: any[]; checkedAt: string }>('/tasks/escalation/check'),

    // Release Planning
    getReleases: (params?: { status?: string; limit?: number }) =>
        api.get<{
            id: string;
            name: string;
            description?: string;
            status: string;
            startDate: string;
            endDate: string;
            progress: { taskCompletion: number; pointCompletion: number; totalTasks: number; completedTasks: number };
            tasks: any[];
        }[]>('/tasks/releases', { params }),
    createRelease: (data: { name: string; description?: string; startDate: string; endDate: string; taskIds?: string[] }) =>
        api.post<any>('/tasks/releases', data),
    getReleaseProgress: (releaseId: string) =>
        api.get<{
            release: any;
            progress: { taskCompletion: number; pointCompletion: number; timeProgress: number; remainingDays: number };
            tasksByStatus: Record<string, any[]>;
            summary: { total: number; completed: number; inProgress: number; todo: number; blocked: number };
        }>(`/tasks/releases/${releaseId}/progress`),
    addTasksToRelease: (releaseId: string, taskIds: string[]) =>
        api.post<{ success: boolean; addedCount: number }>(`/tasks/releases/${releaseId}/tasks`, { taskIds }),
    removeTasksFromRelease: (releaseId: string, taskIds: string[]) =>
        api.delete<{ success: boolean; removedCount: number }>(`/tasks/releases/${releaseId}/tasks`, { data: { taskIds } }),

    // Roadmap View
    getRoadmap: (params?: { startDate?: string; endDate?: string; groupBy?: 'quarter' | 'month' }) =>
        api.get<{
            period: { startDate: string; endDate: string };
            groupBy: string;
            data: Record<string, { releases: any[]; milestones: any[] }>;
            summary: { totalReleases: number; completedReleases: number; plannedReleases: number; activeReleases: number; totalMilestones: number; completedMilestones: number };
        }>('/tasks/roadmap', { params }),
    createMilestone: (data: { title: string; description?: string; dueDate: string; releaseId?: string }) =>
        api.post<any>('/tasks/milestones', data),
    updateMilestone: (id: string, data: Partial<{ title: string; description: string; dueDate: string; status: string }>) =>
        api.patch<any>(`/tasks/milestones/${id}`, data),

};

