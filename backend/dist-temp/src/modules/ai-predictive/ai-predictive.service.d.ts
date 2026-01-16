import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
export declare class AiPredictiveService {
    private readonly prisma;
    private readonly aiService;
    private readonly logger;
    constructor(prisma: PrismaService, aiService: AiService);
    forecastAttendance(companyId: string, days?: number): Promise<{
        period: string;
        expectedAttendanceRate: number;
        expectedAbsences: number;
        riskDays: string[];
        insights: string[];
    }>;
    predictTurnover(companyId: string): Promise<{
        riskLevel: 'low' | 'medium' | 'high';
        atRiskEmployees: {
            name: string;
            riskFactors: string[];
        }[];
        recommendations: string[];
    }>;
    forecastCosts(companyId: string): Promise<{
        currentMonthlyPayroll: number;
        projectedNextMonth: number;
        potentialSavings: string[];
        budgetAlerts: string[];
    }>;
    getAiPredictions(companyId: string): Promise<string>;
}
