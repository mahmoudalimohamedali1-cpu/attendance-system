import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

// Export interfaces to fix TS4053 error in controller
export interface PolicyAnalytics {
    summary: {
        totalPolicies: number;
        activePolicies: number;
        totalExecutions: number;
        totalDeductions: number;
        totalBonuses: number;
        avgExecutionsPerPolicy: number;
    };
    executionTrends: Array<{
        period: string;
        executions: number;
        deductions: number;
        bonuses: number;
    }>;
    topPolicies: Array<{
        id: string;
        name: string;
        executionCount: number;
        totalImpact: number;
    }>;
    triggerDistribution: Record<string, number>;
    recentExecutions: Array<{
        id: string;
        policyName: string;
        employeeName: string;
        actionType: string;
        amount: number;
        executedAt: Date;
    }>;
}

export interface PolicyHealthScore {
    policyId: string;
    overallScore: number; // 0-100
    metrics: {
        executionSuccessRate: number;
        averageImpact: number;
        usageFrequency: number;
        employeeCoverage: number;
    };
    recommendations: string[];
}

@Injectable()
export class PolicyAnalyticsService {
    private readonly logger = new Logger(PolicyAnalyticsService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get comprehensive analytics for a company's smart policies
     */
    async getAnalytics(
        companyId: string,
        dateRange?: { startDate: Date; endDate: Date }
    ): Promise<PolicyAnalytics> {
        const startDate = dateRange?.startDate || new Date(new Date().setMonth(new Date().getMonth() - 3));
        const endDate = dateRange?.endDate || new Date();

        this.logger.log(`[ANALYTICS] Fetching for company ${companyId} from ${startDate} to ${endDate}`);

        // Get summary counts
        const [policies, executions, executionStats] = await Promise.all([
            this.prisma.smartPolicy.findMany({
                where: { companyId },
                select: {
                    id: true,
                    originalText: true,
                    isActive: true,
                    executionCount: true,
                    totalAmountPaid: true,
                    totalAmountDeduct: true,
                    triggerEvent: true,
                },
            }),
            this.prisma.smartPolicyExecution.findMany({
                where: {
                    policy: { companyId },
                    executedAt: { gte: startDate, lte: endDate },
                },
                orderBy: { executedAt: 'desc' },
                take: 50,
                include: {
                    policy: { select: { originalText: true } },
                },
            }),
            this.prisma.smartPolicyExecution.aggregate({
                where: {
                    policy: { companyId },
                    executedAt: { gte: startDate, lte: endDate },
                },
                _count: { id: true },
            }),
        ]);

        const activePolicies = policies.filter(p => p.isActive);
        const totalDeductions = policies.reduce((sum: number, p) => sum + Number(p.totalAmountDeduct || 0), 0);
        const totalBonuses = policies.reduce((sum: number, p) => sum + Number(p.totalAmountPaid || 0), 0);

        // Calculate trigger distribution
        const triggerDistribution: Record<string, number> = {};
        policies.forEach((p: any) => {
            const trigger = p.triggerEvent || 'UNKNOWN';
            triggerDistribution[trigger] = (triggerDistribution[trigger] || 0) + 1;
        });

        // Top policies by execution count
        const topPolicies = policies
            .filter((p: any) => p.executionCount > 0)
            .sort((a: any, b: any) => b.executionCount - a.executionCount)
            .slice(0, 10)
            .map((p: any) => ({
                id: p.id,
                name: (p.originalText || '').substring(0, 50),
                executionCount: p.executionCount,
                totalImpact: Number(p.totalAmountDeduct || 0) + Number(p.totalAmountPaid || 0),
            }));

        // Recent executions
        const recentExecutions = executions.slice(0, 20).map((e: any) => ({
            id: e.id,
            policyName: (e.policy?.originalText || '').substring(0, 40),
            employeeName: e.employeeName,
            actionType: e.actionType || 'UNKNOWN',
            amount: Number(e.actionValue || 0),
            executedAt: e.executedAt,
        }));

        // Execution trends (monthly)
        const trendMap = new Map<string, { executions: number; deductions: number; bonuses: number }>();
        executions.forEach((e: any) => {
            const period = `${e.executedAt.getFullYear()}-${String(e.executedAt.getMonth() + 1).padStart(2, '0')}`;
            const current = trendMap.get(period) || { executions: 0, deductions: 0, bonuses: 0 };
            current.executions++;
            if (e.actionType === 'DEDUCT') {
                current.deductions += Number(e.actionValue || 0);
            } else {
                current.bonuses += Number(e.actionValue || 0);
            }
            trendMap.set(period, current);
        });

        const executionTrends = Array.from(trendMap.entries())
            .map(([period, data]) => ({ period, ...data }))
            .sort((a, b) => a.period.localeCompare(b.period));

        return {
            summary: {
                totalPolicies: policies.length,
                activePolicies: activePolicies.length,
                totalExecutions: executionStats._count.id,
                totalDeductions,
                totalBonuses,
                avgExecutionsPerPolicy: policies.length > 0
                    ? Math.round(executionStats._count.id / policies.length)
                    : 0,
            },
            executionTrends,
            topPolicies,
            triggerDistribution,
            recentExecutions,
        };
    }

    /**
     * Get health score for a specific policy
     */
    async getPolicyHealthScore(policyId: string): Promise<PolicyHealthScore> {
        const policy = await this.prisma.smartPolicy.findUnique({
            where: { id: policyId },
            include: {
                executions: {
                    orderBy: { executedAt: 'desc' },
                    take: 100,
                },
            },
        });

        if (!policy) {
            throw new Error('Policy not found');
        }

        const successfulExecutions = policy.executions.filter((e: any) => e.isSuccess).length;
        const totalExecutions = policy.executions.length;
        const executionSuccessRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

        const totalImpact = policy.executions.reduce((sum: number, e: any) => sum + Number(e.actionValue || 0), 0);
        const averageImpact = totalExecutions > 0 ? totalImpact / totalExecutions : 0;

        // Calculate scores
        const recommendations: string[] = [];

        if (executionSuccessRate < 80) {
            recommendations.push('معدل نجاح التنفيذ منخفض - تحقق من شروط السياسة');
        }
        if (totalExecutions === 0) {
            recommendations.push('لم يتم تنفيذ هذه السياسة - تحقق من الشروط والمشغلات');
        }
        if (!policy.isActive) {
            recommendations.push('السياسة غير نشطة حالياً');
        }

        const overallScore = Math.round(
            (executionSuccessRate * 0.4) +
            (Math.min(totalExecutions, 100) * 0.3) +
            (policy.isActive ? 30 : 0)
        );

        return {
            policyId,
            overallScore: Math.min(overallScore, 100),
            metrics: {
                executionSuccessRate,
                averageImpact,
                usageFrequency: totalExecutions,
                employeeCoverage: 0, // Would need separate query
            },
            recommendations,
        };
    }
}
