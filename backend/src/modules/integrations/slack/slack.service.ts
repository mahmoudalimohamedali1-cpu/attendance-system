import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class SlackService {
    private readonly logger = new Logger(SlackService.name);

    constructor(private readonly prisma: PrismaService) { }

    async sendMessage(companyId: string, channel: string, message: string, options?: { attachments?: any[]; blocks?: any[] }) {
        const integration = await this.getSlackIntegration(companyId);
        if (!integration) throw new Error('Slack غير متصل');

        const config = integration.config as any;
        const response = await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${config.botToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel, text: message, attachments: options?.attachments, blocks: options?.blocks }),
        });

        const result = await response.json() as any;
        if (!result.ok) throw new Error(`Slack: ${result.error}`);
        return result;
    }

    async sendTaskNotification(companyId: string, task: any, event: 'created' | 'updated' | 'completed' | 'assigned') {
        const integration = await this.getSlackIntegration(companyId);
        if (!integration) return null;

        const config = integration.config as any;
        const channel = config.defaultChannel || '#tasks';
        const eventMessages = { created: '📝 مهمة جديدة', updated: '✏️ تم تحديث المهمة', completed: '✅ تم إكمال المهمة', assigned: '👤 تم تعيين المهمة' };

        return this.sendMessage(companyId, channel, `${eventMessages[event]}: ${task.title}`);
    }

    private async getSlackIntegration(companyId: string) {
        return this.prisma.integration.findFirst({ where: { companyId, type: 'slack', isActive: true } });
    }

    getOAuthUrl(companyId: string, clientId: string, redirectUri: string) {
        const state = Buffer.from(JSON.stringify({ companyId })).toString('base64');
        return `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=chat:write,channels:read&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    }
}
