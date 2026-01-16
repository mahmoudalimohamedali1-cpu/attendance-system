import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class TrelloService {
    private readonly logger = new Logger(TrelloService.name);
    private readonly apiUrl = 'https://api.trello.com/1';

    constructor(private readonly prisma: PrismaService) { }

    async importBoard(companyId: string, userId: string, boardId: string) {
        const integration = await this.getTrelloIntegration(companyId);
        if (!integration) throw new Error('Trello غير متصل');

        const config = integration.config as any;
        const response = await fetch(`${this.apiUrl}/boards/${boardId}?key=${config.apiKey}&token=${config.token}&cards=all&lists=all`);
        if (!response.ok) throw new Error('فشل جلب بيانات اللوحة');

        const board = await response.json() as any;
        let imported = 0;

        for (const card of board.cards || []) {
            try {
                await this.prisma.task.create({
                    data: {
                        title: card.name,
                        description: card.desc || `Imported from Trello: ${card.shortUrl || ''}`,
                        status: 'TODO',
                        priority: 'MEDIUM',
                        companyId,
                        createdById: userId,
                        dueDate: card.due ? new Date(card.due) : null,
                    },
                });
                imported++;
            } catch (e) { /* skip duplicates */ }
        }
        return { success: true, boardName: board.name, imported, total: board.cards?.length || 0 };
    }

    async getBoards(companyId: string) {
        const integration = await this.getTrelloIntegration(companyId);
        if (!integration) throw new Error('Trello غير متصل');

        const config = integration.config as any;
        const response = await fetch(`${this.apiUrl}/members/me/boards?key=${config.apiKey}&token=${config.token}&fields=name,url`);
        if (!response.ok) throw new Error('فشل جلب اللوحات');
        return response.json();
    }

    private async getTrelloIntegration(companyId: string) {
        return this.prisma.integration.findFirst({ where: { companyId, type: 'trello', isActive: true } });
    }

    async connect(companyId: string, userId: string, config: { apiKey: string; token: string }) {
        const response = await fetch(`${this.apiUrl}/members/me?key=${config.apiKey}&token=${config.token}`);
        if (!response.ok) throw new Error('فشل الاتصال بـ Trello');

        const user = await response.json() as any;
        await this.prisma.integration.upsert({
            where: { companyId_type: { companyId, type: 'trello' } },
            create: { type: 'trello', name: `Trello - ${user.fullName}`, companyId, createdById: userId, config },
            update: { config, lastSyncAt: new Date() },
        });
        return { success: true, user: user.fullName };
    }
}
