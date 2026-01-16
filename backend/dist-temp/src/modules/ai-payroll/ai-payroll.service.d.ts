import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
export interface SalaryAnomaly {
    employeeId: string;
    employeeName: string;
    anomalyType: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    suggestedAction: string;
}
export interface AdvanceRiskAssessment {
    userId: string;
    userName: string;
    riskLevel: 'low' | 'medium' | 'high';
    riskScore: number;
    factors: string[];
    recommendation: string;
    maxRecommendedAmount: number;
}
export declare class AiPayrollService {
    private readonly prisma;
    private readonly aiService;
    private readonly logger;
    constructor(prisma: PrismaService, aiService: AiService);
    detectSalaryAnomalies(companyId: string): Promise<SalaryAnomaly[]>;
    assessAdvanceRisk(userId: string, requestedAmount: number): Promise<AdvanceRiskAssessment>;
    getDeductionOptimizations(userId: string): Promise<string>;
    getSalaryTrends(companyId: string): Promise<{
        averageSalary: number;
        totalPayroll: number;
        employeeCount: number;
        insights: string[];
    }>;
}
