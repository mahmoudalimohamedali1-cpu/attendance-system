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
};
