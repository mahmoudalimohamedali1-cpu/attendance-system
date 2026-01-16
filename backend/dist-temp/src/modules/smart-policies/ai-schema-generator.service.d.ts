import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
export interface MissingField {
    name: string;
    type: string;
    description: string;
    suggestedModel: string;
}
export interface GeneratedModel {
    name: string;
    prismaSchema: string;
    fields: Array<{
        name: string;
        type: string;
        description: string;
    }>;
}
export declare class AiSchemaGeneratorService {
    private readonly prisma;
    private readonly aiService;
    private readonly logger;
    private readonly schemaPath;
    constructor(prisma: PrismaService, aiService: AiService);
    analyzePolicy(policyText: string): Promise<{
        missingFields: MissingField[];
        suggestedModels: GeneratedModel[];
        canExecute: boolean;
    }>;
    private generateSmartFallback;
    private extractSchemaInfo;
    private generatePrismaModelSchema;
    addModelToSchema(model: GeneratedModel): Promise<{
        success: boolean;
        message: string;
    }>;
    runMigration(migrationName: string): Promise<{
        success: boolean;
        message: string;
    }>;
    updatePolicyContext(modelName: string, fields: string[]): Promise<void>;
    private toPrismaType;
    private toSnakeCase;
    autoExtendSchema(policyText: string): Promise<{
        analyzed: boolean;
        modelsAdded: string[];
        migrationRun: boolean;
        message: string;
    }>;
}
