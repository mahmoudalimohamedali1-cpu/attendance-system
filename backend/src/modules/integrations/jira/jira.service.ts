import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class JiraService {
    private readonly logger = new Logger(JiraService.name);

    constructor(private readonly prisma: PrismaService) { }

    async importProject(companyId: string, userId: string, options: { projectKey: string; jiraUrl: string }) {
        const integration = await this.getJiraIntegration(companyId);
        if (!integration) throw new Error('Jira غير متصل');

        const config = integration.config as any;
        const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');

        const response = await fetch(`${options.jiraUrl}/rest/api/3/search?jql=project=${options.projectKey}&maxResults=50`, {
            headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' },
        });

        if (!response.ok) throw new Error(`Jira API error: ${response.status}`);
        const data = await response.json() as any;
        const issues = data.issues || [];

        let imported = 0;
        for (const issue of issues) {
            try {
                await this.prisma.task.create({
                    data: {
                        title: `[${issue.key}] ${issue.fields.summary}`,
                        description: issue.fields.description || `Imported from Jira: ${options.jiraUrl}/browse/${issue.key}`,
                        status: 'TODO',
                        priority: 'MEDIUM',
                        companyId,
                        createdById: userId,
                    },
                });
                imported++;
            } catch (e) { /* skip duplicates */ }
        }
        return { success: true, imported, total: issues.length };
    }

    private async getJiraIntegration(companyId: string) {
        return this.prisma.integration.findFirst({ where: { companyId, type: 'jira', isActive: true } });
    }

    async connect(companyId: string, userId: string, config: { jiraUrl: string; email: string; apiToken: string }) {
        const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
        const response = await fetch(`${config.jiraUrl}/rest/api/3/myself`, {
            headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' },
        });
        if (!response.ok) throw new Error('فشل الاتصال بـ Jira');

        const user = await response.json() as any;
        await this.prisma.integration.upsert({
            where: { companyId_type: { companyId, type: 'jira' } },
            create: { type: 'jira', name: `Jira - ${user.displayName}`, companyId, createdById: userId, config },
            update: { config, lastSyncAt: new Date() },
        });
        return { success: true, user: user.displayName };
    }
}
