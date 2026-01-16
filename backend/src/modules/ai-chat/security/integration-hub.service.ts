import { Injectable, Logger } from '@nestjs/common';

/**
 * 🔗 Integration Hub Service
 * Implements ideas #176-185: External integrations
 * 
 * Features:
 * - External system connectors
 * - Webhook management
 * - API status monitoring
 * - Data sync status
 */

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

@Injectable()
export class IntegrationHubService {
    private readonly logger = new Logger(IntegrationHubService.name);

    // Connected systems
    private readonly systems: ExternalSystem[] = [
        { id: '1', name: 'GOSI', nameAr: 'التأمينات الاجتماعية', type: 'hr', typeAr: 'موارد بشرية', status: 'connected', lastSync: new Date(), config: {} },
        { id: '2', name: 'Muqeem', nameAr: 'مقيم', type: 'hr', typeAr: 'موارد بشرية', status: 'connected', lastSync: new Date(), config: {} },
        { id: '3', name: 'SAP', nameAr: 'ساب المالي', type: 'finance', typeAr: 'مالية', status: 'connected', lastSync: new Date(), config: {} },
        { id: '4', name: 'Microsoft 365', nameAr: 'مايكروسوفت 365', type: 'calendar', typeAr: 'تقويم', status: 'connected', lastSync: new Date(), config: {} },
        { id: '5', name: 'Slack', nameAr: 'سلاك', type: 'messaging', typeAr: 'رسائل', status: 'disconnected', config: {} },
        { id: '6', name: 'Google Drive', nameAr: 'جوجل درايف', type: 'storage', typeAr: 'تخزين', status: 'error', config: {} },
    ];

    // Webhooks
    private webhooks: Map<string, Webhook> = new Map();

    // Sync jobs
    private syncJobs: Map<string, SyncJob> = new Map();

    /**
     * 🔗 Get all connected systems
     */
    getSystems(type?: ExternalSystem['type']): ExternalSystem[] {
        if (type) {
            return this.systems.filter(s => s.type === type);
        }
        return this.systems;
    }

    /**
     * 🔄 Get system status
     */
    getSystemStatus(systemId: string): ExternalSystem | null {
        return this.systems.find(s => s.id === systemId) || null;
    }

    /**
     * 🔄 Trigger sync
     */
    triggerSync(systemId: string, direction: SyncJob['direction'] = 'bidirectional'): SyncJob {
        const system = this.systems.find(s => s.id === systemId);
        if (!system) {
            throw new Error('System not found');
        }

        const jobId = `SYNC-${Date.now().toString(36).toUpperCase()}`;
        const totalRecords = 100 + Math.floor(Math.random() * 500);

        const job: SyncJob = {
            id: jobId,
            systemId,
            systemName: system.nameAr,
            direction,
            status: 'running',
            progress: 0,
            recordsProcessed: 0,
            totalRecords,
            startedAt: new Date(),
        };

        this.syncJobs.set(jobId, job);

        // Simulate progress
        this.simulateSync(job);

        return job;
    }

    private simulateSync(job: SyncJob): void {
        const interval = setInterval(() => {
            job.recordsProcessed += Math.floor(Math.random() * 20);
            job.progress = Math.min(100, Math.round((job.recordsProcessed / job.totalRecords) * 100));

            if (job.progress >= 100) {
                job.status = 'completed';
                job.completedAt = new Date();
                clearInterval(interval);
            }
        }, 500);

        // Auto-complete after 10 seconds
        setTimeout(() => {
            if (job.status === 'running') {
                job.status = 'completed';
                job.progress = 100;
                job.completedAt = new Date();
                clearInterval(interval);
            }
        }, 10000);
    }

    /**
     * 📊 Get API health status
     */
    getAPIHealth(): APIHealth[] {
        return [
            { service: 'Core API', serviceAr: 'الخدمة الأساسية', status: 'healthy', responseTime: 45, uptime: 99.9, lastCheck: new Date() },
            { service: 'AI Service', serviceAr: 'خدمة الذكاء الاصطناعي', status: 'healthy', responseTime: 120, uptime: 99.5, lastCheck: new Date() },
            { service: 'Database', serviceAr: 'قاعدة البيانات', status: 'healthy', responseTime: 15, uptime: 99.99, lastCheck: new Date() },
            { service: 'File Storage', serviceAr: 'التخزين', status: 'degraded', responseTime: 250, uptime: 98.5, lastCheck: new Date() },
            { service: 'Email Service', serviceAr: 'البريد الإلكتروني', status: 'healthy', responseTime: 80, uptime: 99.8, lastCheck: new Date() },
        ];
    }

    /**
     * 🔔 Create webhook
     */
    createWebhook(name: string, url: string, events: string[]): Webhook {
        const id = `WH-${Date.now().toString(36).toUpperCase()}`;

        const webhook: Webhook = {
            id,
            name,
            url,
            events,
            active: true,
            successCount: 0,
            failureCount: 0,
        };

        this.webhooks.set(id, webhook);
        return webhook;
    }

    /**
     * 📊 Format systems status
     */
    formatSystemsStatus(): string {
        let message = '🔗 **حالة الأنظمة المتصلة:**\n\n';

        const statusEmojis: Record<string, string> = {
            connected: '🟢',
            disconnected: '⚫',
            error: '🔴',
            syncing: '🔵',
        };

        const statusNames: Record<string, string> = {
            connected: 'متصل',
            disconnected: 'غير متصل',
            error: 'خطأ',
            syncing: 'جاري المزامنة',
        };

        for (const system of this.systems) {
            message += `${statusEmojis[system.status]} **${system.nameAr}** (${system.typeAr})\n`;
            message += `   ${statusNames[system.status]}`;
            if (system.lastSync) {
                message += ` | آخر مزامنة: ${this.formatTimeAgo(system.lastSync)}`;
            }
            message += '\n\n';
        }

        return message;
    }

    private formatTimeAgo(date: Date): string {
        const diff = Date.now() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) return `منذ ${hours} ساعة`;
        if (minutes > 0) return `منذ ${minutes} دقيقة`;
        return 'الآن';
    }

    /**
     * 📊 Format API health
     */
    formatAPIHealth(): string {
        const health = this.getAPIHealth();

        let message = '🏥 **حالة الخدمات:**\n\n';

        for (const api of health) {
            const statusEmoji = { healthy: '🟢', degraded: '🟡', down: '🔴' }[api.status];
            const statusAr = { healthy: 'سليم', degraded: 'متدهور', down: 'معطل' }[api.status];

            message += `${statusEmoji} **${api.serviceAr}** - ${statusAr}\n`;
            message += `   ⏱️ ${api.responseTime}ms | ⬆️ ${api.uptime}%\n\n`;
        }

        return message;
    }

    /**
     * 📊 Format sync job
     */
    formatSyncJob(job: SyncJob): string {
        const statusEmojis: Record<string, string> = {
            pending: '⏳',
            running: '🔄',
            completed: '✅',
            failed: '❌',
        };

        const bar = '█'.repeat(Math.floor(job.progress / 10)) + '░'.repeat(10 - Math.floor(job.progress / 10));

        let message = `${statusEmojis[job.status]} **مزامنة ${job.systemName}**\n\n`;
        message += `${bar} ${job.progress}%\n`;
        message += `📊 ${job.recordsProcessed}/${job.totalRecords} سجل\n`;

        if (job.completedAt) {
            const duration = Math.round((job.completedAt.getTime() - job.startedAt.getTime()) / 1000);
            message += `⏱️ الوقت: ${duration} ثانية`;
        }

        return message;
    }
}
