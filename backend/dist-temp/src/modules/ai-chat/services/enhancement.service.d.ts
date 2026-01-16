import { PrismaService } from '../../../common/prisma/prisma.service';
import { AiService } from '../../ai/ai.service';
export interface EnhancementResult {
    success: boolean;
    message: string;
    changes?: string[];
    requiresRebuild?: boolean;
}
export interface EnhancementAnalysis {
    operation: string;
    targetSystem: string;
    description: string;
    details: Record<string, any>;
}
export declare class EnhancementService {
    private readonly prisma;
    private readonly aiService;
    private readonly logger;
    private readonly systemKnowledge;
    constructor(prisma: PrismaService, aiService: AiService);
    executeEnhancement(message: string, subIntent: string, context: {
        companyId: string;
        userId: string;
        userRole: string;
    }): Promise<EnhancementResult>;
    private analyzeRequest;
    private planModifications;
    private executeModifications;
    private executeDatabaseStep;
    private formatSuccessMessage;
    getSystemKnowledge(): typeof this.systemKnowledge;
}
