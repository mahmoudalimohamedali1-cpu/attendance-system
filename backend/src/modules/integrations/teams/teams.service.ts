import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class TeamsService {
    private readonly logger = new Logger(TeamsService.name);

    constructor(private readonly prisma: PrismaService) { }

    async sendAdaptiveCard(webhookUrl: string, card: any) {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'message', attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', content: card }] }),
        });
        if (!response.ok) throw new Error(`Teams error: ${response.status}`);
        return { success: true };
    }

    async sendTaskNotification(companyId: string, task: any, event: 'created' | 'updated' | 'completed' | 'assigned') {
        const integration = await this.getTeamsIntegration(companyId);
        if (!integration) return null;

        const config = integration.config as any;
        if (!config.webhookUrl) return null;

        const eventMessages = { created: '📝 مهمة جديدة', updated: '✏️ تم تحديث المهمة', completed: '✅ تم إكمال المهمة', assigned: '👤 تم تعيين المهمة' };
        const card = {
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json', type: 'AdaptiveCard', version: '1.4',
            body: [{ type: 'TextBlock', text: `${eventMessages[event]}: ${task.title}`, weight: 'bolder', size: 'large' }],
        };
        return this.sendAdaptiveCard(config.webhookUrl, card);
    }

    private async getTeamsIntegration(companyId: string) {
        return this.prisma.integration.findFirst({ where: { companyId, type: 'teams', isActive: true } });
    }

    async connectWebhook(companyId: string, userId: string, webhookUrl: string, channelName?: string) {
        await this.prisma.integration.upsert({
            where: { companyId_type: { companyId, type: 'teams' } },
            create: { type: 'teams', name: channelName || 'Microsoft Teams', companyId, createdById: userId, config: { webhookUrl, channelName } },
            update: { config: { webhookUrl, channelName }, lastSyncAt: new Date() },
        });
        return { success: true, message: 'تم ربط Microsoft Teams بنجاح' };
    }
}
