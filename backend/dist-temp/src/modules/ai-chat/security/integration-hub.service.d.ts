export interface ExternalSystem {
    id: string;
    name: string;
    nameAr: string;
    type: 'hr' | 'finance' | 'crm' | 'calendar' | 'messaging' | 'storage';
    typeAr: string;
    status: 'connected' | 'disconnected' | 'error' | 'syncing';
    lastSync?: Date;
    config: Record<string, any>;
}
export interface Webhook {
    id: string;
    name: string;
    url: string;
    events: string[];
    active: boolean;
    lastTriggered?: Date;
    successCount: number;
    failureCount: number;
}
export interface SyncJob {
    id: string;
    systemId: string;
    systemName: string;
    direction: 'import' | 'export' | 'bidirectional';
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    recordsProcessed: number;
    totalRecords: number;
    startedAt: Date;
    completedAt?: Date;
    errors?: string[];
}
export interface APIHealth {
    service: string;
    serviceAr: string;
    status: 'healthy' | 'degraded' | 'down';
    responseTime: number;
    uptime: number;
    lastCheck: Date;
}
export declare class IntegrationHubService {
    private readonly logger;
    private readonly systems;
    private webhooks;
    private syncJobs;
    getSystems(type?: ExternalSystem['type']): ExternalSystem[];
    getSystemStatus(systemId: string): ExternalSystem | null;
    triggerSync(systemId: string, direction?: SyncJob['direction']): SyncJob;
    private simulateSync;
    getAPIHealth(): APIHealth[];
    createWebhook(name: string, url: string, events: string[]): Webhook;
    formatSystemsStatus(): string;
    private formatTimeAgo;
    formatAPIHealth(): string;
    formatSyncJob(job: SyncJob): string;
}
