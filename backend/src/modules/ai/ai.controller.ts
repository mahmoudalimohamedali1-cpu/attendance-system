import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { PolicyParserService, ParsedPolicyRule } from './services/policy-parser.service';
import { PolicyFeasibilityService, PolicyFeasibilityResult } from './services/policy-feasibility.service';
import { SchemaIntrospectorService } from './services/schema-introspector.service';

class ParsePolicyDto {
    text: string;
    checkFeasibility?: boolean; // تحقق من الجاهزية تلقائياً
}

class AnalyzeFeasibilityDto {
    parsedRule: ParsedPolicyRule;
}

@ApiTags('AI')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiController {
    constructor(
        private readonly aiService: AiService,
        private readonly policyParserService: PolicyParserService,
        private readonly feasibilityService: PolicyFeasibilityService,
        private readonly schemaIntrospector: SchemaIntrospectorService,
    ) { }

    @Get('status')
    @ApiOperation({ summary: 'Check AI service status' })
    getStatus() {
        return {
            available: this.aiService.isAvailable(),
            provider: 'Gemini',
            model: 'gemini-1.5-flash',
        };
    }

    @Post('parse-policy')
    @ApiOperation({ summary: 'Parse natural language policy text into structured rule with optional feasibility check' })
    async parsePolicy(
        @Body() dto: ParsePolicyDto,
        @Req() req: any,
    ): Promise<{
        success: boolean;
        rule?: ParsedPolicyRule;
        validation?: { valid: boolean; errors: string[] };
        feasibility?: PolicyFeasibilityResult;
        error?: string;
    }> {
        try {
            const rule = await this.policyParserService.parsePolicy(dto.text);
            const validation = this.policyParserService.validateParsedRule(rule);

            // تحقق من الجاهزية تلقائياً (افتراضياً مفعّل)
            let feasibility: PolicyFeasibilityResult | undefined;
            if (dto.checkFeasibility !== false) {
                const companyId = req.user?.companyId || 'default';
                feasibility = await this.feasibilityService.analyzeFeasibility(rule, companyId);
            }

            return {
                success: true,
                rule,
                validation,
                feasibility,
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    @Post('analyze-feasibility')
    @ApiOperation({ summary: 'Analyze feasibility of an already parsed policy rule' })
    async analyzeFeasibility(
        @Body() dto: AnalyzeFeasibilityDto,
        @Req() req: any,
    ): Promise<{
        success: boolean;
        feasibility?: PolicyFeasibilityResult;
        error?: string;
    }> {
        try {
            const companyId = req.user?.companyId || 'default';
            const feasibility = await this.feasibilityService.analyzeFeasibility(
                dto.parsedRule,
                companyId,
            );

            return {
                success: true,
                feasibility,
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    @Get('supported-fields')
    @ApiOperation({ summary: 'Get list of all supported fields for policy conditions' })
    getSupportedFields() {
        const supportedFields = this.feasibilityService.getSupportedFields();
        const schemaInfo = this.schemaIntrospector.getSchemaInfo();

        return {
            supportedFields: supportedFields.map(field => ({
                path: field,
                description: this.feasibilityService.getFieldDescription(field),
            })),
            totalModels: schemaInfo.models.size,
            totalEnums: schemaInfo.enums.size,
            totalAvailableFields: schemaInfo.availableFields.length,
        };
    }

    @Get('schema-info')
    @ApiOperation({ summary: 'Get schema information for debugging' })
    getSchemaInfo() {
        const info = this.schemaIntrospector.getSchemaInfo();
        return {
            models: Array.from(info.models.entries()).map(([name, model]) => ({
                name,
                tableName: model.tableName,
                fieldCount: model.fields.length,
                fields: model.fields.filter(f => !f.isRelation).map(f => f.name),
            })),
            enums: Array.from(info.enums.entries()).map(([name, e]) => ({
                name,
                values: e.values,
            })),
        };
    }

    @Post('test')
    @ApiOperation({ summary: 'Test AI with a simple prompt' })
    async testAi(@Body() dto: { prompt: string }): Promise<{ response: string }> {
        const response = await this.aiService.generateContent(dto.prompt);
        return { response };
    }
}
