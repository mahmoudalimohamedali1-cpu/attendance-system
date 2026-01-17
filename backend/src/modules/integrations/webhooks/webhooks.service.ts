// @ts-nocheck
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import * as crypto from 'crypto';

// Webhook Event Types
export const WEBHOOK_EVENTS = {
    // Task Events
    'task.created': 'عند إنشاء مهمة جديدة',
    'task.updated': 'عند تحديث مهمة',
    'task.completed': 'عند إكمال مهمة',
    'task.deleted': 'عند حذف مهمة',
    'task.assigned': 'عند تعيين مهمة لموظف',
    'task.comment': 'عند إضافة تعليق على مهمة',

    // Project Events
    'project.created': 'عند إنشاء مشروع',
    'project.updated': 'عند تحديث مشروع',
    'project.completed': 'عند إكمال مشروع',

    // Team Events
    'team.member_added': 'عند إضافة عضو للفريق',
    'team.member_removed': 'عند إزالة عضو من الفريق',

    // Release Events
    'release.created': 'عند إنشاء إصدار',
    'release.published': 'عند نشر إصدار',

    // Employee Events  
    'employee.created': 'عند إضافة موظف',
    'employee.updated': 'عند تحديث بيانات موظف',
    'attendance.checkin': 'عند تسجيل حضور',
    'attendance.checkout': 'عند تسجيل انصراف',
    'leave.requested': 'عند طلب إجازة',
    'leave.approved': 'عند الموافقة على إجازة',
} as const;

export type WebhookEventType = keyof typeof WEBHOOK_EVENTS;

@Injectable()
export class WebhooksService {
    private readonly logger = new Logger(WebhooksService.name);

    constructor(private readonly prisma: PrismaService) { }

    // ============ CRUD Operations ============

    // إنشاء webhook جديد
    async createWebhook(companyId: string, userId: string, data: {
        name: string;
        url: string;
        events: string[];
        secret?: string;
    }) {
        // Generate secret if not provided
        const secret = data.secret || crypto.randomBytes(32).toString('hex');

        const webhook = await this.prisma.webhook.create({
            data: {
                name: data.name,
                url: data.url,
                events: data.events,
                secret,
                companyId,
                createdById: userId,
            },
        });

        return {
            ...webhook,
            secret, // Return secret only on creation
            message: 'تم إنشاء الـ Webhook بنجاح',
        };
    }

    // جلب جميع الـ webhooks
    async getWebhooks(companyId: string) {
        const webhooks = await this.prisma.webhook.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { logs: true },
                },
            },
        });

        return webhooks.map(w => ({
            id: w.id,
            name: w.name,
            url: w.url,
            events: w.events,
            isActive: w.isActive,
            failureCount: w.failureCount,
            lastTriggeredAt: w.lastTriggeredAt,
            lastError: w.lastError,
            logsCount: w._count.logs,
            createdAt: w.createdAt,
        }));
    }

    // جلب webhook واحد
    async getWebhook(webhookId: string, companyId: string) {
        const webhook = await this.prisma.webhook.findFirst({
            where: { id: webhookId, companyId },
            include: {
                logs: {
                    take: 20,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!webhook) {
            throw new NotFoundException('الـ Webhook غير موجود');
        }

        return webhook;
    }

    // تحديث webhook
    async updateWebhook(webhookId: string, companyId: string, data: Partial<{
        name: string;
        url: string;
        events: string[];
        isActive: boolean;
    }>) {
        const webhook = await this.prisma.webhook.findFirst({
            where: { id: webhookId, companyId },
        });

        if (!webhook) {
            throw new NotFoundException('الـ Webhook غير موجود');
        }

        const updated = await this.prisma.webhook.update({
            where: { id: webhookId },
            data: {
                name: data.name,
                url: data.url,
                events: data.events,
                isActive: data.isActive,
                failureCount: data.isActive === true ? 0 : undefined, // Reset on reactivation
                lastError: data.isActive === true ? null : undefined,
            },
        });

        return { ...updated, message: 'تم تحديث الـ Webhook بنجاح' };
    }

    // حذف webhook
    async deleteWebhook(webhookId: string, companyId: string) {
        const webhook = await this.prisma.webhook.findFirst({
            where: { id: webhookId, companyId },
        });

        if (!webhook) {
            throw new NotFoundException('الـ Webhook غير موجود');
        }

        await this.prisma.webhook.delete({
            where: { id: webhookId },
        });

        return { message: 'تم حذف الـ Webhook بنجاح' };
    }

    // ============ Webhook Triggering ============

    // إطلاق webhook لحدث معين
    async triggerWebhook(companyId: string, event: WebhookEventType, payload: any) {
        const webhooks = await this.prisma.webhook.findMany({
            where: {
                companyId,
                isActive: true,
                events: { has: event },
                failureCount: { lt: 10 }, // Skip webhooks with too many failures
            },
        });

        if (webhooks.length === 0) {
            return { triggered: 0 };
        }

        const results = await Promise.allSettled(
            webhooks.map(webhook => this.sendWebhook(webhook, event, payload))
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        return { triggered: webhooks.length, successful, failed };
    }

    // إرسال webhook
    private async sendWebhook(webhook: any, event: string, payload: any) {
        const startTime = Date.now();
        const webhookPayload = {
            event,
            timestamp: new Date().toISOString(),
            data: payload,
        };

        // Generate signature
        const signature = this.generateSignature(JSON.stringify(webhookPayload), webhook.secret);

        try {
            const response = await fetch(webhook.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Event': event,
                    'X-Webhook-Signature': signature,
                    'X-Webhook-ID': webhook.id,
                },
                body: JSON.stringify(webhookPayload),
                signal: AbortSignal.timeout(10000), // 10 second timeout
            });

            const duration = Date.now() - startTime;
            const responseText = await response.text().catch(() => '');

            // Log the webhook call
            await this.prisma.webhookLog.create({
                data: {
                    webhookId: webhook.id,
                    event,
                    payload: webhookPayload,
                    statusCode: response.status,
                    response: responseText.substring(0, 1000),
                    duration,
                    isSuccess: response.ok,
                    errorMessage: response.ok ? null : `HTTP ${response.status}`,
                },
            });

            // Update webhook status
            if (response.ok) {
                await this.prisma.webhook.update({
                    where: { id: webhook.id },
                    data: {
                        lastTriggeredAt: new Date(),
                        failureCount: 0,
                        lastError: null,
                    },
                });
            } else {
                await this.incrementFailureCount(webhook.id, `HTTP ${response.status}`);
            }

            return { success: response.ok, statusCode: response.status };
        } catch (error: any) {
            const duration = Date.now() - startTime;

            // Log the failure
            await this.prisma.webhookLog.create({
                data: {
                    webhookId: webhook.id,
                    event,
                    payload: webhookPayload,
                    duration,
                    isSuccess: false,
                    errorMessage: error.message,
                },
            });

            await this.incrementFailureCount(webhook.id, error.message);
            throw error;
        }
    }

    // زيادة عداد الفشل
    private async incrementFailureCount(webhookId: string, error: string) {
        await this.prisma.webhook.update({
            where: { id: webhookId },
            data: {
                failureCount: { increment: 1 },
                lastError: error,
                lastTriggeredAt: new Date(),
            },
        });
    }

    // توليد التوقيع
    private generateSignature(payload: string, secret: string): string {
        return crypto.createHmac('sha256', secret).update(payload).digest('hex');
    }

    // ============ Test Webhook ============

    // اختبار webhook
    async testWebhook(webhookId: string, companyId: string) {
        const webhook = await this.prisma.webhook.findFirst({
            where: { id: webhookId, companyId },
        });

        if (!webhook) {
            throw new NotFoundException('الـ Webhook غير موجود');
        }

        const testPayload = {
            test: true,
            message: 'هذا اختبار للـ Webhook',
            timestamp: new Date().toISOString(),
        };

        try {
            const result = await this.sendWebhook(webhook, 'test', testPayload);
            return {
                message: 'تم إرسال الاختبار بنجاح',
                ...result,
            };
        } catch (error: any) {
            return {
                success: false,
                message: 'فشل الاختبار',
                error: error.message,
            };
        }
    }

    // ============ Get Available Events ============

    getAvailableEvents() {
        return Object.entries(WEBHOOK_EVENTS).map(([key, description]) => ({
            event: key,
            description,
            category: key.split('.')[0],
        }));
    }

    // ============ Webhook Logs ============

    async getWebhookLogs(webhookId: string, companyId: string, options?: {
        limit?: number;
        offset?: number;
    }) {
        // Verify ownership
        const webhook = await this.prisma.webhook.findFirst({
            where: { id: webhookId, companyId },
        });

        if (!webhook) {
            throw new NotFoundException('الـ Webhook غير موجود');
        }

        const [logs, total] = await Promise.all([
            this.prisma.webhookLog.findMany({
                where: { webhookId },
                orderBy: { createdAt: 'desc' },
                take: options?.limit || 50,
                skip: options?.offset || 0,
            }),
            this.prisma.webhookLog.count({
                where: { webhookId },
            }),
        ]);

        return { logs, total };
    }
}
