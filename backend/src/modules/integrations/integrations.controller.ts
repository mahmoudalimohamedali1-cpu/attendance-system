import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SlackService } from './slack/slack.service';
import { TeamsService } from './teams/teams.service';
import { GitHubService } from './github/github.service';
import { JiraService } from './jira/jira.service';
import { TrelloService } from './trello/trello.service';

@ApiTags('Integrations')
@Controller('integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class IntegrationsController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly slackService: SlackService,
        private readonly teamsService: TeamsService,
        private readonly githubService: GitHubService,
        private readonly jiraService: JiraService,
        private readonly trelloService: TrelloService,
    ) { }

    @Get()
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '📋 قائمة التكاملات' })
    async getIntegrations(@Request() req: any) {
        const integrations = await this.prisma.integration.findMany({
            where: { companyId: req.user.companyId },
            select: { id: true, type: true, name: true, isActive: true, connectedAt: true, lastSyncAt: true },
        });

        const available = [
            { type: 'slack', name: 'Slack', icon: '💬', description: 'إشعارات فورية وأوامر المهام' },
            { type: 'teams', name: 'Microsoft Teams', icon: '🟦', description: 'بطاقات تكيفية وإشعارات' },
            { type: 'github', name: 'GitHub', icon: '🐙', description: 'ربط المهام بالـ Issues' },
            { type: 'gitlab', name: 'GitLab', icon: '🦊', description: 'ربط المهام بالـ Issues' },
            { type: 'jira', name: 'Jira', icon: '📊', description: 'استيراد وتصدير المهام' },
            { type: 'trello', name: 'Trello', icon: '📋', description: 'استيراد اللوحات والبطاقات' },
        ];

        return {
            connected: integrations,
            available: available.map(a => ({ ...a, isConnected: integrations.some((i: any) => i.type === a.type) })),
        };
    }

    @Delete(':type')
    @Roles('ADMIN')
    @ApiOperation({ summary: '🔌 فصل تكامل' })
    async disconnectIntegration(@Request() req: any, @Param('type') type: string) {
        await this.prisma.integration.deleteMany({ where: { companyId: req.user.companyId, type } });
        return { success: true, message: `تم فصل ${type}` };
    }

    @Post('teams/connect')
    @Roles('ADMIN')
    @ApiOperation({ summary: '🔗 ربط Teams' })
    async connectTeams(@Request() req: any, @Body() body: { webhookUrl: string; channelName?: string }) {
        return this.teamsService.connectWebhook(req.user.companyId, req.user.id, body.webhookUrl, body.channelName);
    }

    @Post('github/link-issue')
    @Roles('ADMIN', 'MANAGER')
    @ApiOperation({ summary: '🔗 ربط GitHub Issue بمهمة' })
    async linkGitHubIssue(@Request() req: any, @Body() body: { taskId: string; issueUrl: string }) {
        return this.githubService.linkIssueToTask(req.user.companyId, body.taskId, body.issueUrl);
    }

    @Post('jira/connect')
    @Roles('ADMIN')
    @ApiOperation({ summary: '🔗 ربط Jira' })
    async connectJira(@Request() req: any, @Body() body: { jiraUrl: string; email: string; apiToken: string }) {
        return this.jiraService.connect(req.user.companyId, req.user.id, body);
    }

    @Post('jira/import')
    @Roles('ADMIN')
    @ApiOperation({ summary: '📥 استيراد من Jira' })
    async importFromJira(@Request() req: any, @Body() body: { projectKey: string; jiraUrl: string }) {
        return this.jiraService.importProject(req.user.companyId, req.user.id, body);
    }

    @Post('trello/connect')
    @Roles('ADMIN')
    @ApiOperation({ summary: '🔗 ربط Trello' })
    async connectTrello(@Request() req: any, @Body() body: { apiKey: string; token: string }) {
        return this.trelloService.connect(req.user.companyId, req.user.id, body);
    }

    @Get('trello/boards')
    @Roles('ADMIN')
    @ApiOperation({ summary: '📋 لوحات Trello' })
    async getTrelloBoards(@Request() req: any) {
        return this.trelloService.getBoards(req.user.companyId);
    }

    @Post('trello/import')
    @Roles('ADMIN')
    @ApiOperation({ summary: '📥 استيراد من Trello' })
    async importFromTrello(@Request() req: any, @Body() body: { boardId: string }) {
        return this.trelloService.importBoard(req.user.companyId, req.user.id, body.boardId);
    }
}
