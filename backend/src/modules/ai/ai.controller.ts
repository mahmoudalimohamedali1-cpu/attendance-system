import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { PolicyParserService, ParsedPolicyRule } from './services/policy-parser.service';

class ParsePolicyDto {
    text: string;
}

@ApiTags('AI')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiController {
    constructor(
        private readonly aiService: AiService,
        private readonly policyParserService: PolicyParserService,
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
    @ApiOperation({ summary: 'Parse natural language policy text into structured rule' })
    async parsePolicy(@Body() dto: ParsePolicyDto): Promise<{
        success: boolean;
        rule?: ParsedPolicyRule;
        validation?: { valid: boolean; errors: string[] };
        error?: string;
    }> {
        try {
            const rule = await this.policyParserService.parsePolicy(dto.text);
            const validation = this.policyParserService.validateParsedRule(rule);

            return {
                success: true,
                rule,
                validation,
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    @Post('test')
    @ApiOperation({ summary: 'Test AI with a simple prompt' })
    async testAi(@Body() dto: { prompt: string }): Promise<{ response: string }> {
        const response = await this.aiService.generateContent(dto.prompt);
        return { response };
    }
}
