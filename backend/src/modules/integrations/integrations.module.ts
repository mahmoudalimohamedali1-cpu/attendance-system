import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { SlackService } from './slack/slack.service';
import { TeamsService } from './teams/teams.service';
import { GitHubService } from './github/github.service';
import { JiraService } from './jira/jira.service';
import { TrelloService } from './trello/trello.service';
import { IntegrationsController } from './integrations.controller';

@Module({
    imports: [PrismaModule, WebhooksModule],
    controllers: [IntegrationsController],
    providers: [SlackService, TeamsService, GitHubService, JiraService, TrelloService],
    exports: [WebhooksModule, SlackService, TeamsService, GitHubService, JiraService, TrelloService],
})
export class IntegrationsModule { }
