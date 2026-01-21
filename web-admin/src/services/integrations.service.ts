import { api } from './api.service';

// ============ Webhooks ============

export interface Webhook {
    id: string;
    name: string;
    url: string;
    events: string[];
    isActive: boolean;
    failureCount: number;
    lastTriggeredAt?: string;
    lastError?: string;
    logsCount: number;
    createdAt: string;
}

export interface WebhookEvent {
    event: string;
    description: string;
    category: string;
}

export interface WebhookLog {
    id: string;
    event: string;
    payload: any;
    statusCode?: number;
    response?: string;
    duration?: number;
    isSuccess: boolean;
    errorMessage?: string;
    createdAt: string;
}

// ============ Integrations ============

export interface Integration {
    id: string;
    type: string;
    name: string;
    isActive: boolean;
    connectedAt: string;
    lastSyncAt?: string;
}

export interface AvailableIntegration {
    type: string;
    name: string;
    icon: string;
    description: string;
    isConnected: boolean;
}

// ============ API Service ============

export const integrationsApi = {
    // Webhooks
    getWebhooks: () => api.get<Webhook[]>('/webhooks'),

    createWebhook: (data: { name: string; url: string; events: string[] }) =>
        api.post<Webhook & { secret: string }>('/webhooks', data),

    updateWebhook: (id: string, data: Partial<{ name: string; url: string; events: string[]; isActive: boolean }>) =>
        api.patch<Webhook>(`/webhooks/${id}`, data),

    deleteWebhook: (id: string) => api.delete(`/webhooks/${id}`),

    testWebhook: (id: string) => api.post<{ success: boolean; message: string }>(`/webhooks/${id}/test`),

    getWebhookEvents: () => api.get<WebhookEvent[]>('/webhooks/events'),

    getWebhookLogs: (id: string, params?: { limit?: number; offset?: number }) =>
        api.get<{ logs: WebhookLog[]; total: number }>(`/webhooks/${id}/logs`, { params }),

    // Integrations
    getIntegrations: () => api.get<{ connected: Integration[]; available: AvailableIntegration[] }>('/integrations'),

    disconnectIntegration: (type: string) => api.delete(`/integrations/${type}`),

    // Teams
    connectTeams: (data: { webhookUrl: string; channelName?: string }) =>
        api.post('/integrations/teams/connect', data),

    // Jira
    connectJira: (data: { jiraUrl: string; email: string; apiToken: string }) =>
        api.post('/integrations/jira/connect', data),

    importFromJira: (data: { projectKey: string; jiraUrl: string }) =>
        api.post<{ success: boolean; imported: number; total: number }>('/integrations/jira/import', data),

    // Trello
    connectTrello: (data: { apiKey: string; token: string }) =>
        api.post('/integrations/trello/connect', data),

    getTrelloBoards: () => api.get<{ id: string; name: string; url: string }[]>('/integrations/trello/boards'),

    importFromTrello: (data: { boardId: string }) =>
        api.post<{ success: boolean; boardName: string; imported: number; total: number }>('/integrations/trello/import', data),

    // GitHub
    linkGitHubIssue: (data: { taskId: string; issueUrl: string }) =>
        api.post('/integrations/github/link-issue', data),

    // ============ ODOO ERP ============

    // Connection
    getOdooStatus: () => api.get<{
        isConnected: boolean;
        lastSyncAt?: string;
        config?: { odooUrl: string; database: string; syncInterval: number };
    }>('/integrations/odoo/status'),

    testOdooConnection: (data: { odooUrl: string; database: string; username: string; apiKey: string }) =>
        api.post<{ success: boolean; message: string; uid?: number }>('/integrations/odoo/test', data),

    connectOdoo: (data: {
        odooUrl: string;
        database: string;
        username: string;
        apiKey: string;
        syncInterval?: number;
        autoSync?: boolean;
    }) => api.post<{ success: boolean; message: string }>('/integrations/odoo/connect', data),

    disconnectOdoo: () => api.delete<{ success: boolean; message: string }>('/integrations/odoo/disconnect'),

    // Employees
    getOdooEmployees: (params?: { activeOnly?: boolean; departmentId?: number }) =>
        api.get<{
            id: number;
            name: string;
            workEmail?: string;
            mobilePhone?: string;
            departmentName?: string;
            jobTitle?: string;
            active: boolean;
        }[]>('/integrations/odoo/employees', { params }),

    syncOdooEmployees: (data: { activeOnly?: boolean; createNewUsers?: boolean }) =>
        api.post<{
            total: number;
            imported: number;
            updated: number;
            skipped: number;
            errors: { odooId: number; error: string }[];
        }>('/integrations/odoo/employees/sync', data),

    mapOdooEmployee: (data: { userId: string; odooEmployeeId: number }) =>
        api.post<{ success: boolean }>('/integrations/odoo/employees/map', data),

    // Attendance
    syncOdooAttendance: (data?: { startDate?: string; endDate?: string; userIds?: string[] }) =>
        api.post<{
            total: number;
            pushed: number;
            failed: number;
            errors: { attendanceId: string; error: string }[];
        }>('/integrations/odoo/attendance/sync', data),

    // Leaves
    getOdooLeaveTypes: () =>
        api.get<{ id: number; name: string; code?: string }[]>('/integrations/odoo/leaves/types'),

    getOdooLeaves: (params?: { startDate?: string; endDate?: string; state?: string }) =>
        api.get<{
            id: number;
            employeeId: number;
            employeeName: string;
            leaveTypeName: string;
            dateFrom: string;
            dateTo: string;
            numberOfDays: number;
            state: string;
        }[]>('/integrations/odoo/leaves', { params }),

    pushOdooLeave: (data: {
        odooEmployeeId: number;
        leaveTypeId: number;
        dateFrom: string;
        dateTo: string;
        notes?: string;
    }) => api.post<{ success: boolean; odooId?: number }>('/integrations/odoo/leaves/push', data),

    // Payroll
    exportOdooPayroll: (data: { periodStart: string; periodEnd: string; userIds?: string[] }) =>
        api.post<{
            periodStart: string;
            periodEnd: string;
            totalEmployees: number;
            data: {
                odooEmployeeId: number;
                employeeName: string;
                workedDays: number;
                workedHours: number;
                overtimeHours: number;
                lateMinutes: number;
                absentDays: number;
            }[];
            errors: { userId: string; error: string }[];
        }>('/integrations/odoo/payroll/export', data),

    pushOdooPayroll: (data: { data: any[] }) =>
        api.post<{ success: number; failed: number; errors: any[] }>('/integrations/odoo/payroll/push', data),
};

