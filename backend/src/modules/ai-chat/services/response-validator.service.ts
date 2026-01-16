import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../../ai/ai.service';
import { z } from 'zod';

/**
 * 📝 AI Response Validator Service
 * Validates and parses AI responses with proper error handling
 */

// Schema definitions for different response types
const EnhancementAnalysisSchema = z.object({
    operation: z.enum(['add_enum', 'add_field', 'update_value', 'add_calculation']),
    targetSystem: z.enum(['employees', 'leaves', 'attendance', 'payroll']),
    description: z.string(),
    details: z.record(z.string(), z.any()),
});

const CreationPlanSchema = z.object({
    moduleName: z.string(),
    description: z.string(),
    entities: z.array(z.object({
        name: z.string(),
        fields: z.array(z.object({
            name: z.string(),
            type: z.string(),
            required: z.boolean().optional(),
        })),
    })),
    relations: z.array(z.string()).optional(),
});

const ActionResponseSchema = z.object({
    action: z.string(),
    parameters: z.record(z.string(), z.any()),
    confirmation: z.string().optional(),
});

// Exported types use local names to avoid conflicts with enhancement.service.ts
export type ValidatorEnhancementAnalysis = z.infer<typeof EnhancementAnalysisSchema>;
export type CreationPlan = z.infer<typeof CreationPlanSchema>;
export type ActionResponse = z.infer<typeof ActionResponseSchema>;

type ResponseSchema = typeof EnhancementAnalysisSchema | typeof CreationPlanSchema | typeof ActionResponseSchema;

@Injectable()
export class ResponseValidatorService {
    private readonly logger = new Logger(ResponseValidatorService.name);

    constructor(private readonly aiService: AiService) { }

    /**
     * 🔍 Extract JSON from AI response
     */
    private extractJson(response: string): string | null {
        if (!response) return null;

        // Try to find JSON block
        const jsonBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonBlockMatch) {
            return jsonBlockMatch[1].trim();
        }

        // Try to find raw JSON object
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return jsonMatch[0];
        }

        // Try to find JSON array
        const arrayMatch = response.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
            return arrayMatch[0];
        }

        return null;
    }

    /**
     * ✅ Parse and validate AI response
     */
    async parseAndValidate<T>(
        response: string,
        schema: z.ZodSchema<T>,
        schemaName: string
    ): Promise<{ success: true; data: T } | { success: false; error: string }> {
        try {
            const jsonStr = this.extractJson(response);

            if (!jsonStr) {
                this.logger.warn(`No JSON found in response for ${schemaName}`);
                return {
                    success: false,
                    error: 'لم يتم العثور على بيانات JSON في الرد',
                };
            }

            const parsed = JSON.parse(jsonStr);
            const validated = schema.parse(parsed);

            this.logger.debug(`Successfully validated ${schemaName} response`);
            return { success: true, data: validated };
        } catch (error) {
            if (error instanceof z.ZodError) {
                const issues = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
                this.logger.warn(`Validation failed for ${schemaName}: ${issues}`);
                return {
                    success: false,
                    error: `خطأ في تنسيق البيانات: ${issues}`,
                };
            }

            if (error instanceof SyntaxError) {
                this.logger.warn(`JSON parse error for ${schemaName}: ${error.message}`);
                return {
                    success: false,
                    error: 'خطأ في تحليل JSON',
                };
            }

            this.logger.error(`Unknown error parsing ${schemaName}: ${error.message}`);
            return {
                success: false,
                error: 'خطأ غير متوقع في التحليل',
            };
        }
    }

    /**
     * 🔧 Parse enhancement analysis response
     */
    async parseEnhancementAnalysis(response: string): Promise<{
        success: true;
        data: ValidatorEnhancementAnalysis;
    } | {
        success: false;
        error: string;
    }> {
        return this.parseAndValidate(response, EnhancementAnalysisSchema, 'EnhancementAnalysis');
    }

    /**
     * 🏗️ Parse creation plan response
     */
    async parseCreationPlan(response: string): Promise<{
        success: true;
        data: CreationPlan;
    } | {
        success: false;
        error: string;
    }> {
        return this.parseAndValidate(response, CreationPlanSchema, 'CreationPlan');
    }

    /**
     * ⚡ Parse action response
     */
    async parseActionResponse(response: string): Promise<{
        success: true;
        data: ActionResponse;
    } | {
        success: false;
        error: string;
    }> {
        return this.parseAndValidate(response, ActionResponseSchema, 'ActionResponse');
    }

    /**
     * 🔄 Try to fix and re-validate a failed response
     */
    async attemptRecovery(
        originalResponse: string,
        schemaName: string,
        context: string
    ): Promise<string | null> {
        const fixPrompt = `الرد التالي لم يكن بتنسيق JSON صحيح. أعد صياغته كـ JSON فقط:
        
الرد الأصلي:
${originalResponse}

السياق المطلوب: ${schemaName}
${context}

أعد الرد بتنسيق JSON صالح فقط، بدون أي نص إضافي.`;

        try {
            const fixedResponse = await this.aiService.generateContent(fixPrompt);
            const jsonStr = this.extractJson(fixedResponse);

            if (jsonStr) {
                JSON.parse(jsonStr); // Validate it parses
                return jsonStr;
            }
            return null;
        } catch {
            return null;
        }
    }

    /**
     * 📊 Get available schemas
     */
    getAvailableSchemas(): string[] {
        return ['EnhancementAnalysis', 'CreationPlan', 'ActionResponse'];
    }
}
