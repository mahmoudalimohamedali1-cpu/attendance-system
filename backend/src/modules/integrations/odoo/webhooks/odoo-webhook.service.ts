import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';

export interface WebhookPayload {
    eventType: string;
    timestamp: string;
    data: any;
}

@Injectable()
export class OdooWebhookService {
    private readonly logger = new Logger(OdooWebhookService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Send webhook to Odoo
     */
    async sendWebhook(
        companyId: string,
        eventType: string,
        data: any,
    ): Promise<boolean> {
        // Get company Odoo config
        const config = await this.prisma.odooCompanyConfig.findUnique({
            where: { companyId },
        });

        if (!config?.webhookUrl) {
            this.logger.debug(`No webhook URL configured for company ${companyId}`);
            return false;
        }

        const payload: WebhookPayload = {
            eventType,
            timestamp: new Date().toISOString(),
            data,
        };

        // Create webhook event record
        const event = await this.prisma.odooWebhookEvent.create({
            data: {
                companyId,
                direction: 'OUTBOUND',
                eventType,
                payload: payload as any,
                status: 'PENDING',
            },
        });

        try {
            // Generate signature
            const signature = this.generateSignature(payload, config.webhookSecret || '');

            // Send webhook
            await this.httpPost(config.webhookUrl, payload, {
                'Content-Type': 'application/json',
                'X-Webhook-Signature': signature,
                'X-Event-Type': eventType,
                'X-Timestamp': payload.timestamp,
            });

            // Mark as delivered
            await this.prisma.odooWebhookEvent.update({
                where: { id: event.id },
                data: {
                    status: 'DELIVERED',
                    processedAt: new Date(),
                    attempts: 1,
                },
            });

            this.logger.log(`Webhook ${eventType} sent to ${config.webhookUrl}`);
            return true;
        } catch (error: any) {
            // Mark as failed
            await this.prisma.odooWebhookEvent.update({
                where: { id: event.id },
                data: {
                    status: 'FAILED',
                    lastError: error.message,
                    attempts: 1,
                },
            });

            this.logger.error(`Failed to send webhook ${eventType}: ${error.message}`);
            return false;
        }
    }

    /**
     * Process incoming webhook from Odoo
     */
    async processIncoming(
        companyId: string,
        eventType: string,
        payload: any,
        signature: string,
    ): Promise<{ success: boolean; message: string }> {
        // Get company config
        const config = await this.prisma.odooCompanyConfig.findUnique({
            where: { companyId },
        });

        if (!config) {
            return { success: false, message: 'Company not configured for Odoo' };
        }

        // Verify signature
        if (config.webhookSecret) {
            const expectedSignature = this.generateSignature(payload, config.webhookSecret);
            if (signature !== expectedSignature) {
                return { success: false, message: 'Invalid webhook signature' };
            }
        }

        // Save incoming event
        const event = await this.prisma.odooWebhookEvent.create({
            data: {
                companyId,
                direction: 'INBOUND',
                eventType,
                payload,
                status: 'PENDING',
            },
        });

        try {
            // Process based on event type
            await this.handleIncomingEvent(companyId, eventType, payload);

            await this.prisma.odooWebhookEvent.update({
                where: { id: event.id },
                data: { status: 'DELIVERED', processedAt: new Date() },
            });

            return { success: true, message: 'Webhook processed successfully' };
        } catch (error: any) {
            await this.prisma.odooWebhookEvent.update({
                where: { id: event.id },
                data: { status: 'FAILED', lastError: error.message },
            });

            return { success: false, message: error.message };
        }
    }

    /**
     * Handle different incoming event types
     */
    private async handleIncomingEvent(
        companyId: string,
        eventType: string,
        payload: any,
    ): Promise<void> {
        switch (eventType) {
            case 'employee.created':
            case 'employee.updated':
                this.logger.log(`Received employee event: ${eventType}`);
                // TODO: Trigger employee sync
                break;

            case 'leave.approved':
            case 'leave.created':
                this.logger.log(`Received leave event: ${eventType}`);
                // TODO: Trigger leave sync
                break;

            case 'department.updated':
                this.logger.log(`Received department event: ${eventType}`);
                // TODO: Trigger department sync
                break;

            default:
                this.logger.warn(`Unknown event type: ${eventType}`);
        }
    }

    /**
     * Get webhook events for a company
     */
    async getEvents(
        companyId: string,
        options?: { direction?: string; status?: string; limit?: number },
    ) {
        const where: any = { companyId };
        if (options?.direction) where.direction = options.direction;
        if (options?.status) where.status = options.status;

        return this.prisma.odooWebhookEvent.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: options?.limit || 50,
        });
    }

    /**
     * Retry failed outbound webhooks
     */
    async retryFailed(companyId: string): Promise<number> {
        const failed = await this.prisma.odooWebhookEvent.findMany({
            where: {
                companyId,
                direction: 'OUTBOUND',
                status: 'FAILED',
                attempts: { lt: 3 },
            },
        });

        let retried = 0;
        for (const event of failed) {
            const success = await this.sendWebhook(
                companyId,
                event.eventType,
                (event.payload as any).data,
            );
            if (success) retried++;
        }

        return retried;
    }

    /**
     * Generate HMAC signature for webhook
     */
    private generateSignature(payload: any, secret: string): string {
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(JSON.stringify(payload));
        return hmac.digest('hex');
    }

    /**
     * HTTP POST helper
     */
    private httpPost(
        url: string,
        data: any,
        headers: Record<string, string>,
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const isHttps = urlObj.protocol === 'https:';
            const lib = isHttps ? https : http;

            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (isHttps ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Length': Buffer.byteLength(JSON.stringify(data)),
                },
                timeout: 10000,
            };

            const req = lib.request(options, (res) => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    resolve();
                } else {
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });

            req.on('error', reject);
            req.on('timeout', () => reject(new Error('Request timeout')));
            req.write(JSON.stringify(data));
            req.end();
        });
    }
}
