import { PrismaService } from '../../common/prisma/prisma.service';
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
    overallScore: number;
    metrics: {
        executionSuccessRate: number;
        averageImpact: number;
        usageFrequency: number;
        employeeCoverage: number;
    };
    recommendations: string[];
}
export declare class PolicyAnalyticsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getAnalytics(companyId: string, dateRange?: {
        startDate: Date;
        endDate: Date;
    }): Promise<PolicyAnalytics>;
    getPolicyHealthScore(policyId: string): Promise<PolicyHealthScore>;
}
