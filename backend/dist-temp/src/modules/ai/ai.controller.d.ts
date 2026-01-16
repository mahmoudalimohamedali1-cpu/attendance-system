import { AiService } from './ai.service';
import { PolicyParserService, ParsedPolicyRule } from './services/policy-parser.service';
declare class ParsePolicyDto {
    text: string;
}
export declare class AiController {
    private readonly aiService;
    private readonly policyParserService;
    constructor(aiService: AiService, policyParserService: PolicyParserService);
    getStatus(): {
        available: boolean;
        provider: string;
        model: string;
    };
    parsePolicy(dto: ParsePolicyDto): Promise<{
        success: boolean;
        rule?: ParsedPolicyRule;
        validation?: {
            valid: boolean;
            errors: string[];
        };
        error?: string;
    }>;
    testAi(dto: {
        prompt: string;
    }): Promise<{
        response: string;
    }>;
}
export {};
