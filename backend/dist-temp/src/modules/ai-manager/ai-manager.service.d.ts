import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
export interface TeamHealthScore {
    overallHealth: number;
    attendanceHealth: number;
    productivityHealth: number;
    moraleIndicator: 'excellent' | 'good' | 'fair' | 'poor';
    alerts: string[];
    recommendations: string[];
}
export interface WorkloadDistribution {
    balanced: boolean;
    overloadedEmployees: {
        name: string;
        taskCount: number;
    }[];
    underutilizedEmployees: {
        name: string;
        taskCount: number;
    }[];
    recommendation: string;
}
export interface BurnoutRisk {
    userId: string;
    userName: string;
    riskLevel: 'low' | 'medium' | 'high';
    indicators: string[];
    suggestedActions: string[];
}
export declare class AiManagerService {
    private readonly prisma;
    private readonly aiService;
    private readonly logger;
    constructor(prisma: PrismaService, aiService: AiService);
    getTeamHealthScore(companyId: string): Promise<TeamHealthScore>;
    analyzeWorkloadDistribution(companyId: string): Promise<WorkloadDistribution>;
    detectBurnoutRisks(companyId: string): Promise<BurnoutRisk[]>;
    getManagerInsights(companyId: string): Promise<string>;
}
