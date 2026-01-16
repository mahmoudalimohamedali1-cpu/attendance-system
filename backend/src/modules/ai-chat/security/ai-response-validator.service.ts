import { Injectable, Logger } from '@nestjs/common';
import { z, ZodSchema, ZodError } from 'zod';

/**
 * 🤖 AI Response Validation Service
 * Fixes: #76, #77, #78, #79, #80 - AI response handling issues
 * 
 * Validates AI responses against schemas.
 * Detects and handles malformed responses.
 * Provides fallback mechanisms.
 */

// Common response schemas
export const EnhancementAnalysisSchema = z.object({
    operation: z.enum(['add_enum', 'update_value', 'create_field', 'modify_logic', 'add_feature', 'unknown']),
    targetSystem: z.enum(['leaves', 'attendance', 'employees', 'payroll', 'settings', 'unknown']),
    description: z.string().min(1).max(500),
    confidence: z.number().min(0).max(1).optional().default(0.5),
    details: z.record(z.string(), z.unknown()).optional(),
});

export const EmployeeActionSchema = z.object({
    action: z.enum(['create', 'update', 'delete', 'query']),
    employeeName: z.string().optional(),
    field: z.string().optional(),
    value: z.unknown().optional(),
});

export const QueryResultSchema = z.object({
    type: z.enum(['count', 'list', 'aggregate', 'detail']),
    data: z.unknown(),
    summary: z.string().optional(),
});

export type EnhancementAnalysis = z.infer<typeof EnhancementAnalysisSchema>;
export type EmployeeAction = z.infer<typeof EmployeeActionSchema>;
export type QueryResult = z.infer<typeof QueryResultSchema>;

export interface ValidationResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    rawResponse?: string;
    fallback?: T;
}

@Injectable()
export class AIResponseValidatorService {
    private readonly logger = new Logger(AIResponseValidatorService.name);

    // Response size limits
    private readonly MAX_RESPONSE_LENGTH = 50000;
    private readonly MAX_JSON_DEPTH = 10;

    /**
     * 🔍 Validate AI response against a schema
     */
    validate<T>(
        response: string | null | undefined,
        schema: ZodSchema<T>,
        fallback?: T
    ): ValidationResult<T> {
        // Handle null/undefined
        if (!response) {
            this.logger.warn('AI returned empty response');
            return {
                success: false,
                error: 'Empty AI response',
                fallback,
            };
        }

        // Check size
        if (response.length > this.MAX_RESPONSE_LENGTH) {
            this.logger.warn(`AI response too long: ${response.length} chars`);
            response = response.substring(0, this.MAX_RESPONSE_LENGTH);
        }

        // Extract JSON from response
        const json = this.extractJson(response);

        if (!json) {
            this.logger.warn('Could not extract JSON from AI response');
            return {
                success: false,
                error: 'No JSON found in response',
                rawResponse: response.substring(0, 500),
                fallback,
            };
        }

        // Parse JSON
        let parsed: unknown;
        try {
            parsed = JSON.parse(json);
        } catch (e: any) {
            this.logger.warn(`JSON parse error: ${e.message}`);

            // Try to repair JSON
            const repaired = this.repairJson(json);
            if (repaired) {
                try {
                    parsed = JSON.parse(repaired);
                } catch {
                    return {
                        success: false,
                        error: 'Invalid JSON in response',
                        rawResponse: json.substring(0, 500),
                        fallback,
                    };
                }
            } else {
                return {
                    success: false,
                    error: 'Invalid JSON in response',
                    rawResponse: json.substring(0, 500),
                    fallback,
                };
            }
        }

        // Validate against schema
        try {
            const validated = schema.parse(parsed);
            return {
                success: true,
                data: validated,
            };
        } catch (e) {
            if (e instanceof ZodError) {
                const issues = e.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
                this.logger.warn(`Schema validation failed: ${issues}`);
                return {
                    success: false,
                    error: `Validation failed: ${issues}`,
                    rawResponse: JSON.stringify(parsed).substring(0, 500),
                    fallback,
                };
            }
            throw e;
        }
    }

    /**
     * 📝 Extract JSON from AI response (handles markdown code blocks)
     */
    private extractJson(response: string): string | null {
        // Try to find JSON in code blocks
        const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
            return codeBlockMatch[1].trim();
        }

        // Try to find raw JSON
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return jsonMatch[0];
        }

        // Try array
        const arrayMatch = response.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
            return arrayMatch[0];
        }

        return null;
    }

    /**
     * 🔧 Attempt to repair broken JSON
     */
    private repairJson(json: string): string | null {
        let repaired = json;

        // Remove trailing commas
        repaired = repaired.replace(/,\s*([\]}])/g, '$1');

        // Close unclosed strings
        const quoteCount = (repaired.match(/"/g) || []).length;
        if (quoteCount % 2 !== 0) {
            repaired += '"';
        }

        // Close unclosed brackets
        let braceCount = 0;
        let bracketCount = 0;
        let inString = false;

        for (const char of repaired) {
            if (char === '"' && repaired[repaired.indexOf(char) - 1] !== '\\') {
                inString = !inString;
            }
            if (!inString) {
                if (char === '{') braceCount++;
                if (char === '}') braceCount--;
                if (char === '[') bracketCount++;
                if (char === ']') bracketCount--;
            }
        }

        while (bracketCount > 0) {
            repaired += ']';
            bracketCount--;
        }
        while (braceCount > 0) {
            repaired += '}';
            braceCount--;
        }

        return repaired;
    }

    /**
     * 🎯 Validate enhancement analysis response
     */
    validateEnhancementAnalysis(response: string): ValidationResult<EnhancementAnalysis> {
        const fallback: EnhancementAnalysis = {
            operation: 'unknown',
            targetSystem: 'unknown',
            description: 'Could not parse request',
            confidence: 0,
        };

        return this.validate(response, EnhancementAnalysisSchema, fallback);
    }

    /**
     * 👤 Validate employee action response
     */
    validateEmployeeAction(response: string): ValidationResult<EmployeeAction> {
        return this.validate(response, EmployeeActionSchema);
    }

    /**
     * 📊 Safe text response (non-JSON)
     */
    sanitizeTextResponse(response: string | null | undefined): string {
        if (!response) {
            return 'لم أتمكن من معالجة الطلب. يرجى المحاولة مرة أخرى.';
        }

        let sanitized = response;

        // Remove any potential prompt leak
        const leakPatterns = [
            /system\s*instruction/gi,
            /you\s+are\s+an?\s+ai/gi,
            /as\s+an?\s+ai/gi,
            /\[INST\]/gi,
            /\[\[SYSTEM\]\]/gi,
        ];

        for (const pattern of leakPatterns) {
            sanitized = sanitized.replace(pattern, '');
        }

        // Limit length
        if (sanitized.length > 5000) {
            sanitized = sanitized.substring(0, 5000) + '...';
        }

        return sanitized.trim();
    }

    /**
     * 🔒 Detect hallucination indicators
     */
    detectHallucination(response: string, context: { employeeNames?: string[]; validOptions?: string[] }): boolean {
        // Check for invented employee names
        if (context.employeeNames) {
            const mentionedNames = response.match(/[\u0600-\u06FF]+\s+[\u0600-\u06FF]+/g) || [];
            for (const name of mentionedNames) {
                const isKnown = context.employeeNames.some(known =>
                    name.includes(known) || known.includes(name)
                );
                if (!isKnown && name.length > 5) {
                    this.logger.warn(`Possible hallucinated name: ${name}`);
                    return true;
                }
            }
        }

        // Check for fabricated data patterns
        const fabricationPatterns = [
            /\b\d{4}-\d{2}-\d{2}\b.*?confirmed/i, // Fake date confirmations
            /ID:\s*[A-Z0-9]{20,}/i, // Fake long IDs
        ];

        for (const pattern of fabricationPatterns) {
            if (pattern.test(response)) {
                this.logger.warn('Possible fabricated data detected');
                return true;
            }
        }

        return false;
    }
}
