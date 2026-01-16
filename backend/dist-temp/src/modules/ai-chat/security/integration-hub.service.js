"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var IntegrationHubService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationHubService = void 0;
const common_1 = require("@nestjs/common");
let IntegrationHubService = IntegrationHubService_1 = class IntegrationHubService {
    constructor() {
        this.logger = new common_1.Logger(IntegrationHubService_1.name);
        this.systems = [
            { id: '1', name: 'GOSI', nameAr: 'التأمينات الاجتماعية', type: 'hr', typeAr: 'موارد بشرية', status: 'connected', lastSync: new Date(), config: {} },
            { id: '2', name: 'Muqeem', nameAr: 'مقيم', type: 'hr', typeAr: 'موارد بشرية', status: 'connected', lastSync: new Date(), config: {} },
            { id: '3', name: 'SAP', nameAr: 'ساب المالي', type: 'finance', typeAr: 'مالية', status: 'connected', lastSync: new Date(), config: {} },
            { id: '4', name: 'Microsoft 365', nameAr: 'مايكروسوفت 365', type: 'calendar', typeAr: 'تقويم', status: 'connected', lastSync: new Date(), config: {} },
            { id: '5', name: 'Slack', nameAr: 'سلاك', type: 'messaging', typeAr: 'رسائل', status: 'disconnected', config: {} },
            { id: '6', name: 'Google Drive', nameAr: 'جوجل درايف', type: 'storage', typeAr: 'تخزين', status: 'error', config: {} },
        ];
        this.webhooks = new Map();
        this.syncJobs = new Map();
    }
    getSystems(type) {
        if (type) {
            return this.systems.filter(s => s.type === type);
        }
        return this.systems;
    }
    getSystemStatus(systemId) {
        return this.systems.find(s => s.id === systemId) || null;
    }
    triggerSync(systemId, direction = 'bidirectional') {
        const system = this.systems.find(s => s.id === systemId);
        if (!system) {
            throw new Error('System not found');
        }
        const jobId = `SYNC-${Date.now().toString(36).toUpperCase()}`;
        const totalRecords = 100 + Math.floor(Math.random() * 500);
        const job = {
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
        this.simulateSync(job);
        return job;
    }
    simulateSync(job) {
        const interval = setInterval(() => {
            job.recordsProcessed += Math.floor(Math.random() * 20);
            job.progress = Math.min(100, Math.round((job.recordsProcessed / job.totalRecords) * 100));
            if (job.progress >= 100) {
                job.status = 'completed';
                job.completedAt = new Date();
                clearInterval(interval);
            }
        }, 500);
        setTimeout(() => {
            if (job.status === 'running') {
                job.status = 'completed';
                job.progress = 100;
                job.completedAt = new Date();
                clearInterval(interval);
            }
        }, 10000);
    }
    getAPIHealth() {
        return [
            { service: 'Core API', serviceAr: 'الخدمة الأساسية', status: 'healthy', responseTime: 45, uptime: 99.9, lastCheck: new Date() },
            { service: 'AI Service', serviceAr: 'خدمة الذكاء الاصطناعي', status: 'healthy', responseTime: 120, uptime: 99.5, lastCheck: new Date() },
            { service: 'Database', serviceAr: 'قاعدة البيانات', status: 'healthy', responseTime: 15, uptime: 99.99, lastCheck: new Date() },
            { service: 'File Storage', serviceAr: 'التخزين', status: 'degraded', responseTime: 250, uptime: 98.5, lastCheck: new Date() },
            { service: 'Email Service', serviceAr: 'البريد الإلكتروني', status: 'healthy', responseTime: 80, uptime: 99.8, lastCheck: new Date() },
        ];
    }
    createWebhook(name, url, events) {
        const id = `WH-${Date.now().toString(36).toUpperCase()}`;
        const webhook = {
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
    formatSystemsStatus() {
        let message = '🔗 **حالة الأنظمة المتصلة:**\n\n';
        const statusEmojis = {
            connected: '🟢',
            disconnected: '⚫',
            error: '🔴',
            syncing: '🔵',
        };
        const statusNames = {
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
    formatTimeAgo(date) {
        const diff = Date.now() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        if (hours > 0)
            return `منذ ${hours} ساعة`;
        if (minutes > 0)
            return `منذ ${minutes} دقيقة`;
        return 'الآن';
    }
    formatAPIHealth() {
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
    formatSyncJob(job) {
        const statusEmojis = {
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
};
exports.IntegrationHubService = IntegrationHubService;
exports.IntegrationHubService = IntegrationHubService = IntegrationHubService_1 = __decorate([
    (0, common_1.Injectable)()
], IntegrationHubService);
//# sourceMappingURL=integration-hub.service.js.map