import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * 🔌 Integration Hub Service
 * مركز التكامل مع الأنظمة الخارجية
 * 
 * ✨ الميزات:
 * - Webhooks للإشعارات الخارجية
 * - APIs للتكامل مع أنظمة ERP
 * - تكامل مع أنظمة الرواتب
 * - تصدير/استيراد البيانات
 * - Event streaming
 * - OAuth2 support
 */

// ============== Types ==============

export interface Integration {
    id: string;
    companyId: string;
    name: string;
    type: IntegrationType;
    provider: IntegrationProvider;
    config: IntegrationConfig;
    status: IntegrationStatus;
    lastSync: Date | null;
    lastError: string | null;
    metrics: IntegrationMetrics;
    createdAt: Date;
    updatedAt: Date;
}

export type IntegrationType =
    | 'WEBHOOK'
    | 'API'
    | 'ERP'
    | 'PAYROLL'
    | 'HRIS'
    | 'ACCOUNTING'
    | 'NOTIFICATION'
    | 'ANALYTICS';

export type IntegrationProvider =
    | 'CUSTOM'
    | 'SAP'
    | 'ORACLE'
    | 'MICROSOFT_DYNAMICS'
    | 'WORKDAY'
    | 'BAMBOO_HR'
    | 'SLACK'
    | 'TEAMS'
    | 'ZAPIER'
    | 'POWER_AUTOMATE';

export type IntegrationStatus =
    | 'ACTIVE'
    | 'INACTIVE'
    | 'ERROR'
    | 'PENDING'
    | 'SYNCING';

export interface IntegrationConfig {
    // Webhook
    webhookUrl?: string;
    webhookSecret?: string;
    webhookEvents?: string[];
    
    // API
    apiEndpoint?: string;
    apiKey?: string;
    apiSecret?: string;
    
    // OAuth2
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiry?: Date;
    scopes?: string[];
    
    // Sync
    syncFrequency?: 'REALTIME' | 'HOURLY' | 'DAILY' | 'WEEKLY';
    syncDirection?: 'INBOUND' | 'OUTBOUND' | 'BIDIRECTIONAL';
    fieldMapping?: FieldMapping[];
    
    // Retry
    retryAttempts?: number;
    retryDelay?: number;
    
    // Custom
    customConfig?: Record<string, any>;
}

export interface FieldMapping {
    sourceField: string;
    targetField: string;
    transform?: string;
    defaultValue?: any;
}

export interface IntegrationMetrics {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgResponseTime: number;
    lastResponseTime: number;
    dataSyncedCount: number;
}

export interface WebhookEvent {
    id: string;
    integrationId: string;
    event: string;
    payload: any;
    status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
    attempts: number;
    lastAttempt: Date | null;
    error: string | null;
    createdAt: Date;
}

export interface SyncResult {
    success: boolean;
    recordsProcessed: number;
    recordsCreated: number;
    recordsUpdated: number;
    recordsFailed: number;
    errors: SyncError[];
    duration: number;
}

export interface SyncError {
    record: any;
    error: string;
    field?: string;
}

export interface IntegrationLog {
    id: string;
    integrationId: string;
    type: 'REQUEST' | 'RESPONSE' | 'ERROR' | 'SYNC';
    direction: 'INBOUND' | 'OUTBOUND';
    status: number;
    payload: any;
    response: any;
    duration: number;
    timestamp: Date;
}

// ============== Implementation ==============

@Injectable()
export class IntegrationHubService {
    private readonly logger = new Logger(IntegrationHubService.name);
    
    // Cache للتكاملات النشطة
    private activeIntegrations: Map<string, Integration> = new Map();
    
    // Queue للـ webhooks
    private webhookQueue: WebhookEvent[] = [];

    constructor(
        private readonly prisma: PrismaService,
        private readonly eventEmitter: EventEmitter2,
    ) {
        this.setupEventListeners();
    }

    // ============== Integration Management ==============

    /**
     * ➕ إضافة تكامل جديد
     */
    async createIntegration(
        companyId: string,
        data: Omit<Integration, 'id' | 'companyId' | 'status' | 'lastSync' | 'lastError' | 'metrics' | 'createdAt' | 'updatedAt'>,
    ): Promise<Integration> {
        const integration: Integration = {
            id: this.generateId(),
            companyId,
            ...data,
            status: 'PENDING',
            lastSync: null,
            lastError: null,
            metrics: {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                avgResponseTime: 0,
                lastResponseTime: 0,
                dataSyncedCount: 0,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // التحقق من صحة الإعدادات
        await this.validateIntegrationConfig(integration);

        // اختبار الاتصال
        const testResult = await this.testConnection(integration);
        
        if (testResult.success) {
            integration.status = 'ACTIVE';
        } else {
            integration.status = 'ERROR';
            integration.lastError = testResult.error || 'فشل اختبار الاتصال';
        }

        // حفظ في الـ cache
        this.activeIntegrations.set(integration.id, integration);

        this.logger.log(`Created integration: ${integration.id} (${integration.type})`);

        return integration;
    }

    /**
     * 📝 تحديث تكامل
     */
    async updateIntegration(
        integrationId: string,
        data: Partial<IntegrationConfig>,
    ): Promise<Integration> {
        const integration = this.activeIntegrations.get(integrationId);
        
        if (!integration) {
            throw new Error('التكامل غير موجود');
        }

        integration.config = { ...integration.config, ...data };
        integration.updatedAt = new Date();

        // إعادة اختبار الاتصال
        const testResult = await this.testConnection(integration);
        integration.status = testResult.success ? 'ACTIVE' : 'ERROR';
        
        if (!testResult.success) {
            integration.lastError = testResult.error || 'فشل اختبار الاتصال';
        }

        return integration;
    }

    /**
     * ❌ حذف تكامل
     */
    async deleteIntegration(integrationId: string): Promise<void> {
        this.activeIntegrations.delete(integrationId);
        this.logger.log(`Deleted integration: ${integrationId}`);
    }

    /**
     * 📋 جلب التكاملات
     */
    async getIntegrations(companyId: string): Promise<Integration[]> {
        return Array.from(this.activeIntegrations.values()).filter(
            (i) => i.companyId === companyId,
        );
    }

    /**
     * 🔌 جلب تكامل
     */
    async getIntegration(integrationId: string): Promise<Integration | undefined> {
        return this.activeIntegrations.get(integrationId);
    }

    // ============== Webhooks ==============

    /**
     * 📤 إرسال webhook
     */
    async sendWebhook(
        integrationId: string,
        event: string,
        payload: any,
    ): Promise<WebhookEvent> {
        const integration = this.activeIntegrations.get(integrationId);
        
        if (!integration || integration.type !== 'WEBHOOK') {
            throw new Error('تكامل Webhook غير موجود');
        }

        if (!integration.config.webhookUrl) {
            throw new Error('Webhook URL غير محدد');
        }

        const webhookEvent: WebhookEvent = {
            id: this.generateId(),
            integrationId,
            event,
            payload,
            status: 'PENDING',
            attempts: 0,
            lastAttempt: null,
            error: null,
            createdAt: new Date(),
        };

        // إضافة للـ queue
        this.webhookQueue.push(webhookEvent);

        // محاولة الإرسال
        await this.deliverWebhook(webhookEvent, integration);

        return webhookEvent;
    }

    /**
     * 📬 تسليم webhook
     */
    private async deliverWebhook(
        webhookEvent: WebhookEvent,
        integration: Integration,
    ): Promise<void> {
        const maxAttempts = integration.config.retryAttempts || 3;
        const retryDelay = integration.config.retryDelay || 5000;

        while (webhookEvent.attempts < maxAttempts) {
            webhookEvent.attempts++;
            webhookEvent.lastAttempt = new Date();

            try {
                const startTime = Date.now();

                const response = await fetch(integration.config.webhookUrl!, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Webhook-Event': webhookEvent.event,
                        'X-Webhook-Signature': this.signPayload(
                            webhookEvent.payload,
                            integration.config.webhookSecret,
                        ),
                        'X-Webhook-Timestamp': Date.now().toString(),
                    },
                    body: JSON.stringify(webhookEvent.payload),
                });

                const duration = Date.now() - startTime;

                // تحديث المقاييس
                this.updateMetrics(integration, {
                    success: response.ok,
                    duration,
                });

                if (response.ok) {
                    webhookEvent.status = 'DELIVERED';
                    this.logger.log(`Webhook delivered: ${webhookEvent.id}`);
                    return;
                }

                webhookEvent.error = `HTTP ${response.status}: ${response.statusText}`;
            } catch (error) {
                webhookEvent.error = error.message;
                this.logger.error(`Webhook delivery failed: ${error.message}`);
            }

            // انتظار قبل إعادة المحاولة
            if (webhookEvent.attempts < maxAttempts) {
                await this.sleep(retryDelay * webhookEvent.attempts);
            }
        }

        webhookEvent.status = 'FAILED';
    }

    /**
     * 📥 استقبال webhook
     */
    async receiveWebhook(
        integrationId: string,
        event: string,
        payload: any,
        signature: string,
    ): Promise<void> {
        const integration = this.activeIntegrations.get(integrationId);
        
        if (!integration) {
            throw new Error('التكامل غير موجود');
        }

        // التحقق من التوقيع
        if (integration.config.webhookSecret) {
            const expectedSignature = this.signPayload(payload, integration.config.webhookSecret);
            if (signature !== expectedSignature) {
                throw new Error('توقيع غير صالح');
            }
        }

        // معالجة الحدث
        await this.processInboundWebhook(integration, event, payload);
    }

    // ============== Data Sync ==============

    /**
     * 🔄 مزامنة البيانات
     */
    async syncData(integrationId: string): Promise<SyncResult> {
        const integration = this.activeIntegrations.get(integrationId);
        
        if (!integration) {
            throw new Error('التكامل غير موجود');
        }

        integration.status = 'SYNCING';
        const startTime = Date.now();

        const result: SyncResult = {
            success: true,
            recordsProcessed: 0,
            recordsCreated: 0,
            recordsUpdated: 0,
            recordsFailed: 0,
            errors: [],
            duration: 0,
        };

        try {
            switch (integration.config.syncDirection) {
                case 'INBOUND':
                    await this.syncInbound(integration, result);
                    break;
                case 'OUTBOUND':
                    await this.syncOutbound(integration, result);
                    break;
                case 'BIDIRECTIONAL':
                    await this.syncInbound(integration, result);
                    await this.syncOutbound(integration, result);
                    break;
            }

            integration.status = 'ACTIVE';
            integration.lastSync = new Date();
            integration.lastError = null;
        } catch (error) {
            integration.status = 'ERROR';
            integration.lastError = error.message;
            result.success = false;
            result.errors.push({ record: null, error: error.message });
        }

        result.duration = Date.now() - startTime;
        integration.metrics.dataSyncedCount += result.recordsProcessed;

        this.logger.log(
            `Sync completed for ${integrationId}: ${result.recordsProcessed} records in ${result.duration}ms`,
        );

        return result;
    }

    /**
     * ⬇️ مزامنة واردة
     */
    private async syncInbound(integration: Integration, result: SyncResult): Promise<void> {
        // جلب البيانات من النظام الخارجي
        const externalData = await this.fetchExternalData(integration);

        for (const record of externalData) {
            result.recordsProcessed++;

            try {
                const mapped = this.mapRecord(record, integration.config.fieldMapping || [], 'inbound');
                
                // البحث عن سجل موجود
                const existing = await this.findExistingRecord(integration, mapped);

                if (existing) {
                    await this.updateRecord(integration, existing.id, mapped);
                    result.recordsUpdated++;
                } else {
                    await this.createRecord(integration, mapped);
                    result.recordsCreated++;
                }
            } catch (error) {
                result.recordsFailed++;
                result.errors.push({ record, error: error.message });
            }
        }
    }

    /**
     * ⬆️ مزامنة صادرة
     */
    private async syncOutbound(integration: Integration, result: SyncResult): Promise<void> {
        // جلب البيانات المحلية
        const localData = await this.fetchLocalData(integration);

        for (const record of localData) {
            result.recordsProcessed++;

            try {
                const mapped = this.mapRecord(record, integration.config.fieldMapping || [], 'outbound');
                await this.sendToExternal(integration, mapped);
                result.recordsUpdated++;
            } catch (error) {
                result.recordsFailed++;
                result.errors.push({ record, error: error.message });
            }
        }
    }

    // ============== API Integration ==============

    /**
     * 📡 طلب API
     */
    async makeApiRequest(
        integrationId: string,
        endpoint: string,
        method: string = 'GET',
        data?: any,
    ): Promise<any> {
        const integration = this.activeIntegrations.get(integrationId);
        
        if (!integration) {
            throw new Error('التكامل غير موجود');
        }

        const url = `${integration.config.apiEndpoint}${endpoint}`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // إضافة المصادقة
        if (integration.config.apiKey) {
            headers['Authorization'] = `Bearer ${integration.config.apiKey}`;
        } else if (integration.config.accessToken) {
            // تجديد الـ token إذا لزم الأمر
            if (this.isTokenExpired(integration)) {
                await this.refreshAccessToken(integration);
            }
            headers['Authorization'] = `Bearer ${integration.config.accessToken}`;
        }

        const startTime = Date.now();

        try {
            const response = await fetch(url, {
                method,
                headers,
                body: data ? JSON.stringify(data) : undefined,
            });

            const duration = Date.now() - startTime;
            this.updateMetrics(integration, { success: response.ok, duration });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            this.updateMetrics(integration, { success: false, duration: Date.now() - startTime });
            throw error;
        }
    }

    // ============== OAuth2 ==============

    /**
     * 🔐 الحصول على رابط المصادقة
     */
    getAuthorizationUrl(integration: Integration, redirectUri: string): string {
        const params = new URLSearchParams({
            client_id: integration.config.clientId!,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: (integration.config.scopes || []).join(' '),
        });

        return `${this.getAuthEndpoint(integration.provider)}?${params}`;
    }

    /**
     * 🔄 تبادل الرمز بـ access token
     */
    async exchangeCodeForToken(
        integration: Integration,
        code: string,
        redirectUri: string,
    ): Promise<void> {
        const tokenEndpoint = this.getTokenEndpoint(integration.provider);

        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: integration.config.clientId!,
                client_secret: integration.config.clientSecret!,
                code,
                redirect_uri: redirectUri,
            }),
        });

        if (!response.ok) {
            throw new Error('فشل الحصول على token');
        }

        const data = await response.json();

        integration.config.accessToken = data.access_token;
        integration.config.refreshToken = data.refresh_token;
        integration.config.tokenExpiry = new Date(Date.now() + data.expires_in * 1000);
        integration.status = 'ACTIVE';
    }

    /**
     * 🔄 تجديد access token
     */
    private async refreshAccessToken(integration: Integration): Promise<void> {
        if (!integration.config.refreshToken) {
            throw new Error('لا يوجد refresh token');
        }

        const tokenEndpoint = this.getTokenEndpoint(integration.provider);

        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: integration.config.clientId!,
                client_secret: integration.config.clientSecret!,
                refresh_token: integration.config.refreshToken,
            }),
        });

        if (!response.ok) {
            integration.status = 'ERROR';
            integration.lastError = 'فشل تجديد token';
            throw new Error('فشل تجديد token');
        }

        const data = await response.json();

        integration.config.accessToken = data.access_token;
        if (data.refresh_token) {
            integration.config.refreshToken = data.refresh_token;
        }
        integration.config.tokenExpiry = new Date(Date.now() + data.expires_in * 1000);
    }

    // ============== Event Streaming ==============

    /**
     * 📡 بث حدث
     */
    async streamEvent(companyId: string, event: string, data: any): Promise<void> {
        const integrations = await this.getIntegrations(companyId);
        
        for (const integration of integrations) {
            if (integration.status !== 'ACTIVE') continue;

            // التحقق من أن التكامل مهتم بهذا الحدث
            if (
                integration.type === 'WEBHOOK' &&
                integration.config.webhookEvents?.includes(event)
            ) {
                await this.sendWebhook(integration.id, event, data);
            }
        }
    }

    // ============== Provider Templates ==============

    /**
     * 📋 جلب قوالب مقدمي الخدمات
     */
    getProviderTemplates(): Record<IntegrationProvider, Partial<IntegrationConfig>> {
        return {
            CUSTOM: {},
            SAP: {
                apiEndpoint: 'https://api.sap.com/v1',
                syncFrequency: 'DAILY',
                fieldMapping: [
                    { sourceField: 'employee_id', targetField: 'employeeId' },
                    { sourceField: 'department_code', targetField: 'departmentId' },
                ],
            },
            ORACLE: {
                apiEndpoint: 'https://api.oracle.com/hcm/v1',
                syncFrequency: 'DAILY',
            },
            MICROSOFT_DYNAMICS: {
                apiEndpoint: 'https://api.dynamics.com/v1',
                scopes: ['Dynamics.Common.Read', 'Dynamics.Common.Write'],
            },
            WORKDAY: {
                apiEndpoint: 'https://api.workday.com/v1',
                syncFrequency: 'HOURLY',
            },
            BAMBOO_HR: {
                apiEndpoint: 'https://api.bamboohr.com/v1',
                syncFrequency: 'DAILY',
            },
            SLACK: {
                apiEndpoint: 'https://slack.com/api',
                scopes: ['chat:write', 'users:read'],
            },
            TEAMS: {
                apiEndpoint: 'https://graph.microsoft.com/v1.0',
                scopes: ['TeamSettings.ReadWrite.All', 'ChannelMessage.Send'],
            },
            ZAPIER: {
                webhookUrl: 'https://hooks.zapier.com/hooks/catch/',
            },
            POWER_AUTOMATE: {
                webhookUrl: 'https://prod-xx.westus.logic.azure.com:443/workflows/',
            },
        };
    }

    // ============== Helper Methods ==============

    private setupEventListeners(): void {
        // الاستماع للأحداث وبثها للتكاملات
        this.eventEmitter.on('policy.*', async (event) => {
            const eventName = `policy.${event.type}`;
            await this.streamEvent(event.companyId, eventName, event.data);
        });
    }

    private async validateIntegrationConfig(integration: Integration): Promise<void> {
        switch (integration.type) {
            case 'WEBHOOK':
                if (!integration.config.webhookUrl) {
                    throw new Error('Webhook URL مطلوب');
                }
                break;
            case 'API':
                if (!integration.config.apiEndpoint) {
                    throw new Error('API Endpoint مطلوب');
                }
                break;
        }
    }

    private async testConnection(
        integration: Integration,
    ): Promise<{ success: boolean; error?: string }> {
        try {
            switch (integration.type) {
                case 'WEBHOOK':
                    // اختبار webhook بإرسال ping
                    await fetch(integration.config.webhookUrl!, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'ping', timestamp: new Date() }),
                    });
                    break;
                case 'API':
                    // اختبار API
                    await this.makeApiRequest(integration.id, '/health', 'GET');
                    break;
            }
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    private signPayload(payload: any, secret?: string): string {
        if (!secret) return '';
        
        // في الإنتاج، استخدم HMAC-SHA256
        const crypto = require('crypto');
        return crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify(payload))
            .digest('hex');
    }

    private updateMetrics(
        integration: Integration,
        result: { success: boolean; duration: number },
    ): void {
        const metrics = integration.metrics;
        metrics.totalRequests++;
        
        if (result.success) {
            metrics.successfulRequests++;
        } else {
            metrics.failedRequests++;
        }
        
        metrics.lastResponseTime = result.duration;
        metrics.avgResponseTime = (
            (metrics.avgResponseTime * (metrics.totalRequests - 1) + result.duration) /
            metrics.totalRequests
        );
    }

    private isTokenExpired(integration: Integration): boolean {
        if (!integration.config.tokenExpiry) return true;
        return new Date() >= integration.config.tokenExpiry;
    }

    private getAuthEndpoint(provider: IntegrationProvider): string {
        const endpoints: Partial<Record<IntegrationProvider, string>> = {
            MICROSOFT_DYNAMICS: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
            SLACK: 'https://slack.com/oauth/v2/authorize',
        };
        return endpoints[provider] || '';
    }

    private getTokenEndpoint(provider: IntegrationProvider): string {
        const endpoints: Partial<Record<IntegrationProvider, string>> = {
            MICROSOFT_DYNAMICS: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
            SLACK: 'https://slack.com/api/oauth.v2.access',
        };
        return endpoints[provider] || '';
    }

    private async processInboundWebhook(
        integration: Integration,
        event: string,
        payload: any,
    ): Promise<void> {
        // معالجة الحدث الوارد
        this.eventEmitter.emit(`integration.${event}`, {
            integrationId: integration.id,
            companyId: integration.companyId,
            payload,
        });
    }

    private async fetchExternalData(integration: Integration): Promise<any[]> {
        // جلب البيانات من النظام الخارجي
        return [];
    }

    private async fetchLocalData(integration: Integration): Promise<any[]> {
        // جلب البيانات المحلية
        return [];
    }

    private mapRecord(
        record: any,
        mapping: FieldMapping[],
        direction: 'inbound' | 'outbound',
    ): any {
        const mapped: any = {};
        
        for (const { sourceField, targetField, transform, defaultValue } of mapping) {
            const source = direction === 'inbound' ? sourceField : targetField;
            const target = direction === 'inbound' ? targetField : sourceField;
            
            let value = record[source];
            
            if (value === undefined && defaultValue !== undefined) {
                value = defaultValue;
            }
            
            if (transform && value !== undefined) {
                value = this.applyTransform(value, transform);
            }
            
            mapped[target] = value;
        }
        
        return mapped;
    }

    private applyTransform(value: any, transform: string): any {
        switch (transform) {
            case 'uppercase':
                return String(value).toUpperCase();
            case 'lowercase':
                return String(value).toLowerCase();
            case 'trim':
                return String(value).trim();
            case 'number':
                return Number(value);
            case 'date':
                return new Date(value);
            default:
                return value;
        }
    }

    private async findExistingRecord(
        integration: Integration,
        data: any,
    ): Promise<any | null> {
        // البحث عن سجل موجود
        return null;
    }

    private async createRecord(integration: Integration, data: any): Promise<void> {
        // إنشاء سجل جديد
    }

    private async updateRecord(
        integration: Integration,
        id: string,
        data: any,
    ): Promise<void> {
        // تحديث سجل
    }

    private async sendToExternal(integration: Integration, data: any): Promise<void> {
        await this.makeApiRequest(integration.id, '/data', 'POST', data);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private generateId(): string {
        return `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
