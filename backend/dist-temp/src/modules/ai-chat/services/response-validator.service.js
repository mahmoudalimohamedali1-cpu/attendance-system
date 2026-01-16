"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ResponseValidatorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseValidatorService = void 0;
const common_1 = require("@nestjs/common");
const ai_service_1 = require("../../ai/ai.service");
const zod_1 = require("zod");
const EnhancementAnalysisSchema = zod_1.z.object({
    operation: zod_1.z.enum(['add_enum', 'add_field', 'update_value', 'add_calculation']),
    targetSystem: zod_1.z.enum(['employees', 'leaves', 'attendance', 'payroll']),
    description: zod_1.z.string(),
    details: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
});
const CreationPlanSchema = zod_1.z.object({
    moduleName: zod_1.z.string(),
    description: zod_1.z.string(),
    entities: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        fields: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            type: zod_1.z.string(),
            required: zod_1.z.boolean().optional(),
        })),
    })),
    relations: zod_1.z.array(zod_1.z.string()).optional(),
});
const ActionResponseSchema = zod_1.z.object({
    action: zod_1.z.string(),
    parameters: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
    confirmation: zod_1.z.string().optional(),
});
let ResponseValidatorService = ResponseValidatorService_1 = class ResponseValidatorService {
    constructor(aiService) {
        this.aiService = aiService;
        this.logger = new common_1.Logger(ResponseValidatorService_1.name);
    }
    extractJson(response) {
        if (!response)
            return null;
        const jsonBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonBlockMatch) {
            return jsonBlockMatch[1].trim();
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
    async parseAndValidate(response, schema, schemaName) {
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
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
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
    async parseEnhancementAnalysis(response) {
        return this.parseAndValidate(response, EnhancementAnalysisSchema, 'EnhancementAnalysis');
    }
    async parseCreationPlan(response) {
        return this.parseAndValidate(response, CreationPlanSchema, 'CreationPlan');
    }
    async parseActionResponse(response) {
        return this.parseAndValidate(response, ActionResponseSchema, 'ActionResponse');
    }
    async attemptRecovery(originalResponse, schemaName, context) {
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
                JSON.parse(jsonStr);
                return jsonStr;
            }
            return null;
        }
        catch {
            return null;
        }
    }
    getAvailableSchemas() {
        return ['EnhancementAnalysis', 'CreationPlan', 'ActionResponse'];
    }
};
exports.ResponseValidatorService = ResponseValidatorService;
exports.ResponseValidatorService = ResponseValidatorService = ResponseValidatorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [ai_service_1.AiService])
], ResponseValidatorService);
//# sourceMappingURL=response-validator.service.js.map