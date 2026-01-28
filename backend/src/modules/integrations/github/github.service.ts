import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class GitHubService {
    private readonly logger = new Logger(GitHubService.name);
    private readonly apiUrl = 'https://api.github.com';

    constructor(private readonly prisma: PrismaService) { }

    // ربط GitHub Issue بمهمة (نضيف الرابط في الوصف)
    async linkIssueToTask(companyId: string, taskId: string, issueUrl: string) {
        const match = issueUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/);
        if (!match) throw new Error('رابط GitHub Issue غير صحيح');

        const [, owner, repo, issueNumber] = match;

        // Update task description to include GitHub link
        const task = await this.prisma.task.findUnique({ where: { id: taskId } });
        if (!task) throw new Error('المهمة غير موجودة');

        await this.prisma.task.update({
            where: { id: taskId },
            data: {
                description: `${task.description || ''}\n\n🔗 GitHub Issue: ${issueUrl}`,
            },
        });
        return { success: true, issue: { owner, repo, issueNumber, url: issueUrl } };
    }

    // إنشاء Issue من مهمة
    async createIssueFromTask(companyId: string, task: any, repoInfo: { owner: string; name: string }) {
        const integration = await this.getGitHubIntegration(companyId);
        if (!integration) throw new Error('GitHub غير متصل');

        const token = (integration.config as any).accessToken;
        const response = await fetch(`${this.apiUrl}/repos/${repoInfo.owner}/${repoInfo.name}/issues`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: task.title, body: task.description || '' }),
        });

        if (!response.ok) throw new Error(`GitHub: ${response.status}`);
        const issue = await response.json() as any;

        // Update task description with GitHub link
        await this.prisma.task.update({
            where: { id: task.id },
            data: {
                description: `${task.description || ''}\n\n🔗 GitHub Issue: ${issue.html_url}`,
            },
        });
        return { success: true, issueNumber: issue.number, issueUrl: issue.html_url };
    }

    private async getGitHubIntegration(companyId: string) {
        return this.prisma.integration.findFirst({ where: { companyId, type: 'github', isActive: true } });
    }

    // ربط GitHub باستخدام Personal Access Token
    async connect(companyId: string, userId: string, config: { accessToken: string; username?: string }) {
        // Test connection by fetching user info
        const response = await fetch(`${this.apiUrl}/user`, {
            headers: { 'Authorization': `Bearer ${config.accessToken}`, 'Accept': 'application/vnd.github.v3+json' },
        });

        if (!response.ok) throw new Error('فشل الاتصال بـ GitHub - تحقق من الـ Token');

        const user = await response.json() as any;

        await this.prisma.integration.upsert({
            where: { companyId_type: { companyId, type: 'github' } },
            create: {
                type: 'github',
                name: `GitHub - ${user.login}`,
                companyId,
                createdById: userId,
                config: { accessToken: config.accessToken, username: user.login, avatarUrl: user.avatar_url },
            },
            update: {
                config: { accessToken: config.accessToken, username: user.login, avatarUrl: user.avatar_url },
                lastSyncAt: new Date(),
            },
        });

        return { success: true, user: user.login, avatarUrl: user.avatar_url };
    }

    // جلب المستودعات
    async getRepositories(companyId: string) {
        const integration = await this.getGitHubIntegration(companyId);
        if (!integration) throw new Error('GitHub غير متصل');

        const token = (integration.config as any).accessToken;
        const response = await fetch(`${this.apiUrl}/user/repos?per_page=100&sort=updated`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' },
        });

        if (!response.ok) throw new Error(`GitHub: ${response.status}`);
        const repos = await response.json() as any[];

        return repos.map((r: any) => ({
            id: r.id,
            name: r.name,
            fullName: r.full_name,
            url: r.html_url,
            description: r.description,
            private: r.private,
            updatedAt: r.updated_at,
        }));
    }

    getOAuthUrl(clientId: string, redirectUri: string, state: string) {
        return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,read:user&state=${state}`;
    }
}
