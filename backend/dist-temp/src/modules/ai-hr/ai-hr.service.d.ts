import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
export declare class AiHrService {
    private readonly prisma;
    private readonly aiService;
    private readonly logger;
    constructor(prisma: PrismaService, aiService: AiService);
    generateSmartLetter(userId: string, letterType: 'experience' | 'salary' | 'employment' | 'recommendation', customDetails?: string): Promise<string>;
    explainPolicy(policyQuestion: string, userRole: string): Promise<string>;
    checkGosiCompliance(companyId: string): Promise<{
        compliant: boolean;
        issues: string[];
        recommendations: string[];
        checkDate: Date;
    }>;
    analyzeHiringNeeds(companyId: string): Promise<{
        currentHeadcount: number;
        departmentBreakdown: {
            department: string;
            count: number;
        }[];
        recommendations: string[];
    }>;
}
