import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
export interface EmployeeScore {
    userId: string;
    userName: string;
    overallScore: number;
    attendanceScore: number;
    punctualityScore: number;
    taskScore: number;
    leaveScore: number;
    trend: 'improving' | 'stable' | 'declining';
    insights: string[];
}
export interface TeamAnalytics {
    totalEmployees: number;
    averageScore: number;
    topPerformers: {
        name: string;
        score: number;
    }[];
    needsAttention: {
        name: string;
        issue: string;
    }[];
    attendanceRate: number;
    punctualityRate: number;
}
export declare class AiAnalyticsService {
    private readonly prisma;
    private readonly aiService;
    private readonly logger;
    constructor(prisma: PrismaService, aiService: AiService);
    calculateEmployeeScore(userId: string): Promise<EmployeeScore>;
    getTeamAnalytics(companyId: string): Promise<TeamAnalytics>;
    getProductivityInsights(userId: string): Promise<string>;
    predictAbsence(userId: string): Promise<{
        probability: number;
        factors: string[];
        recommendation: string;
    }>;
    detectLatePatterns(companyId: string): Promise<{
        pattern: string;
        affectedEmployees: number;
        insights: string[];
    }>;
}
