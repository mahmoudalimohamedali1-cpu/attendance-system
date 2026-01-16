import { AiService } from '../../ai/ai.service';
import { z } from 'zod';
declare const EnhancementAnalysisSchema: z.ZodObject<{
    operation: z.ZodEnum<{
        add_field: "add_field";
        add_enum: "add_enum";
        add_calculation: "add_calculation";
        update_value: "update_value";
    }>;
    targetSystem: z.ZodEnum<{
        employees: "employees";
        attendance: "attendance";
        leaves: "leaves";
        payroll: "payroll";
    }>;
    description: z.ZodString;
    details: z.ZodRecord<z.ZodString, z.ZodAny>;
}, z.core.$strip>;
declare const CreationPlanSchema: z.ZodObject<{
    moduleName: z.ZodString;
    description: z.ZodString;
    entities: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        fields: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            required: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    relations: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
declare const ActionResponseSchema: z.ZodObject<{
    action: z.ZodString;
    parameters: z.ZodRecord<z.ZodString, z.ZodAny>;
    confirmation: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ValidatorEnhancementAnalysis = z.infer<typeof EnhancementAnalysisSchema>;
export type CreationPlan = z.infer<typeof CreationPlanSchema>;
export type ActionResponse = z.infer<typeof ActionResponseSchema>;
export declare class ResponseValidatorService {
    private readonly aiService;
    private readonly logger;
    constructor(aiService: AiService);
    private extractJson;
    parseAndValidate<T>(response: string, schema: z.ZodSchema<T>, schemaName: string): Promise<{
        success: true;
        data: T;
    } | {
        success: false;
        error: string;
    }>;
    parseEnhancementAnalysis(response: string): Promise<{
        success: true;
        data: ValidatorEnhancementAnalysis;
    } | {
        success: false;
        error: string;
    }>;
    parseCreationPlan(response: string): Promise<{
        success: true;
        data: CreationPlan;
    } | {
        success: false;
        error: string;
    }>;
    parseActionResponse(response: string): Promise<{
        success: true;
        data: ActionResponse;
    } | {
        success: false;
        error: string;
    }>;
    attemptRecovery(originalResponse: string, schemaName: string, context: string): Promise<string | null>;
    getAvailableSchemas(): string[];
}
export {};
