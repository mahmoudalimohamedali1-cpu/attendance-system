import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
export declare class AiAgentService {
    private readonly prisma;
    private readonly aiService;
    private readonly logger;
    constructor(prisma: PrismaService, aiService: AiService);
    executeSmartPolicy(policyText: string, employeeId: string, startDate: Date, endDate: Date): Promise<{
        success: boolean;
        result: any;
        query: string;
    }>;
    private executeQuery;
    private getDatabaseSchema;
    addCustomField(fieldName: string, fieldType: string, description: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
