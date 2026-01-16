"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AIResponseValidatorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIResponseValidatorService = exports.QueryResultSchema = exports.EmployeeActionSchema = exports.EnhancementAnalysisSchema = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
exports.EnhancementAnalysisSchema = zod_1.z.object({
    operation: zod_1.z.enum(['add_enum', 'update_value', 'create_field', 'modify_logic', 'add_feature', 'unknown']),
    targetSystem: zod_1.z.enum(['leaves', 'attendance', 'employees', 'payroll', 'settings', 'unknown']),
    description: zod_1.z.string().min(1).max(500),
    confidence: zod_1.z.number().min(0).max(1).optional().default(0.5),
    details: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.EmployeeActionSchema = zod_1.z.object({
    action: zod_1.z.enum(['create', 'update', 'delete', 'query']),
    employeeName: zod_1.z.string().optional(),
    field: zod_1.z.string().optional(),
    value: zod_1.z.unknown().optional(),
});
exports.QueryResultSchema = zod_1.z.object({
    type: zod_1.z.enum(['count', 'list', 'aggregate', 'detail']),
    data: zod_1.z.unknown(),
    summary: zod_1.z.string().optional(),
});
let AIResponseValidatorService = AIResponseValidatorService_1 = class AIResponseValidatorService {
    constructor() {
        this.logger = new common_1.Logger(AIResponseValidatorService_1.name);
        this.MAX_RESPONSE_LENGTH = 50000;
        this.MAX_JSON_DEPTH = 10;
    }
    validate(response, schema, fallback) {
        if (!response) {
            this.logger.warn('AI returned empty response');
            return {
                success: false,
                error: 'Empty AI response',
                fallback,
            };
        }
        if (response.length > this.MAX_RESPONSE_LENGTH) {
            this.logger.warn(`AI response too long: ${response.length} chars`);
            response = response.substring(0, this.MAX_RESPONSE_LENGTH);
        }
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
        let parsed;
        try {
            parsed = JSON.parse(json);
        }
        catch (e) {
            this.logger.warn(`JSON parse error: ${e.message}`);
            const repaired = this.repairJson(json);
            if (repaired) {
                try {
                    parsed = JSON.parse(repaired);
                }
                catch {
                    return {
                        success: false,
                        error: 'Invalid JSON in response',
                        rawResponse: json.substring(0, 500),
                        fallback,
                    };
                }
            }
            else {
                return {
                    success: false,
                    error: 'Invalid JSON in response',
                    rawResponse: json.substring(0, 500),
                    fallback,
                };
            }
        }
        try {
            const validated = schema.parse(parsed);
            return {
                success: true,
                data: validated,
            };
        }
        catch (e) {
            if (e instanceof zod_1.ZodError) {
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
    extractJson(response) {
        const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
            return codeBlockMatch[1].trim();
        }
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return jsonMatch[0];
        }
        const arrayMatch = response.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
            return arrayMatch[0];
        }
        return null;
    }
    repairJson(json) {
        let repaired = json;
        repaired = repaired.replace(/,\s*([\]}])/g, '$1');
        const quoteCount = (repaired.match(/"/g) || []).length;
        if (quoteCount % 2 !== 0) {
            repaired += '"';
        }
        let braceCount = 0;
        let bracketCount = 0;
        let inString = false;
        for (const char of repaired) {
            if (char === '"' && repaired[repaired.indexOf(char) - 1] !== '\\') {
                inString = !inString;
            }
            if (!inString) {
                if (char === '{')
                    braceCount++;
                if (char === '}')
                    braceCount--;
                if (char === '[')
                    bracketCount++;
                if (char === ']')
                    bracketCount--;
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
    validateEnhancementAnalysis(response) {
        const fallback = {
            operation: 'unknown',
            targetSystem: 'unknown',
            description: 'Could not parse request',
            confidence: 0,
        };
        return this.validate(response, exports.EnhancementAnalysisSchema, fallback);
    }
    validateEmployeeAction(response) {
        return this.validate(response, exports.EmployeeActionSchema);
    }
    sanitizeTextResponse(response) {
        if (!response) {
            return 'لم أتمكن من معالجة الطلب. يرجى المحاولة مرة أخرى.';
        }
        let sanitized = response;
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
        if (sanitized.length > 5000) {
            sanitized = sanitized.substring(0, 5000) + '...';
        }
        return sanitized.trim();
    }
    detectHallucination(response, context) {
        if (context.employeeNames) {
            const mentionedNames = response.match(/[\u0600-\u06FF]+\s+[\u0600-\u06FF]+/g) || [];
            for (const name of mentionedNames) {
                const isKnown = context.employeeNames.some(known => name.includes(known) || known.includes(name));
                if (!isKnown && name.length > 5) {
                    this.logger.warn(`Possible hallucinated name: ${name}`);
                    return true;
                }
            }
        }
        const fabricationPatterns = [
            /\b\d{4}-\d{2}-\d{2}\b.*?confirmed/i,
            /ID:\s*[A-Z0-9]{20,}/i,
        ];
        for (const pattern of fabricationPatterns) {
            if (pattern.test(response)) {
                this.logger.warn('Possible fabricated data detected');
                return true;
            }
        }
        return false;
    }
};
exports.AIResponseValidatorService = AIResponseValidatorService;
exports.AIResponseValidatorService = AIResponseValidatorService = AIResponseValidatorService_1 = __decorate([
    (0, common_1.Injectable)()
], AIResponseValidatorService);
//# sourceMappingURL=ai-response-validator.service.js.map