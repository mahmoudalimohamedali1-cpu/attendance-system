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
var AiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const sdk_1 = require("@anthropic-ai/sdk");
let AiService = AiService_1 = class AiService {
    constructor() {
        this.logger = new common_1.Logger(AiService_1.name);
        this.anthropic = null;
        this.models = [
            'claude-sonnet-4-20250514',
            'claude-3-5-sonnet-20241022',
        ];
        const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
        if (apiKey) {
            this.anthropic = new sdk_1.default({ apiKey });
            this.logger.log('Claude AI (Anthropic) initialized successfully ✅');
        }
        else {
            this.logger.warn('CLAUDE_API_KEY not found - AI features will be disabled');
        }
    }
    isAvailable() {
        return this.anthropic !== null;
    }
    async generateContent(prompt, systemInstruction) {
        if (!this.anthropic) {
            throw new Error('AI service is not available. Please configure CLAUDE_API_KEY.');
        }
        let lastError = null;
        for (const modelName of this.models) {
            try {
                this.logger.log(`Attempting AI generation with Claude model: ${modelName}`);
                const response = await this.anthropic.messages.create({
                    model: modelName,
                    max_tokens: 4096,
                    system: systemInstruction || 'أنت مساعد ذكي لنظام الموارد البشرية. أجب بالعربية بشكل مختصر ومفيد.',
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                });
                const textContent = response.content.find(c => c.type === 'text');
                if (textContent && textContent.type === 'text') {
                    this.logger.log(`Successfully generated content using Claude ${modelName}`);
                    return textContent.text;
                }
                throw new Error('Claude returned empty response');
            }
            catch (error) {
                this.logger.warn(`Model ${modelName} failed: ${error.message || error}`);
                lastError = error;
                continue;
            }
        }
        this.logger.error('All Claude models failed to generate content');
        throw lastError || new Error('Failed to generate content with Claude');
    }
    parseJsonResponse(response) {
        if (!response) {
            throw new Error('AI returned empty response');
        }
        let cleaned = response.trim();
        if (cleaned.startsWith('```json')) {
            cleaned = cleaned.slice(7);
        }
        else if (cleaned.startsWith('```')) {
            cleaned = cleaned.slice(3);
        }
        if (cleaned.endsWith('```')) {
            cleaned = cleaned.slice(0, -3);
        }
        cleaned = cleaned.trim();
        try {
            return JSON.parse(cleaned);
        }
        catch (error) {
            this.logger.warn(`Initial JSON parse failed, attempting recovery...`);
            try {
                const jsonEndIndex = this.findJsonEnd(cleaned);
                if (jsonEndIndex > 0) {
                    const fixedJson = cleaned.substring(0, jsonEndIndex + 1);
                    return JSON.parse(fixedJson);
                }
            }
            catch (e) {
            }
            try {
                const repaired = this.repairIncompleteJson(cleaned);
                return JSON.parse(repaired);
            }
            catch (e) {
                this.logger.error(`Failed to parse JSON response: ${cleaned.substring(0, 300)}...`);
                throw new Error('Failed to parse AI response as JSON');
            }
        }
    }
    findJsonEnd(json) {
        let braceCount = 0;
        let inString = false;
        let escapeNext = false;
        for (let i = 0; i < json.length; i++) {
            const char = json[i];
            if (escapeNext) {
                escapeNext = false;
                continue;
            }
            if (char === '\\') {
                escapeNext = true;
                continue;
            }
            if (char === '"') {
                inString = !inString;
                continue;
            }
            if (inString)
                continue;
            if (char === '{')
                braceCount++;
            if (char === '}') {
                braceCount--;
                if (braceCount === 0)
                    return i;
            }
        }
        return -1;
    }
    repairIncompleteJson(json) {
        let repaired = json;
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
        if (inString) {
            repaired += '"';
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
};
exports.AiService = AiService;
exports.AiService = AiService = AiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], AiService);
//# sourceMappingURL=ai.service.js.map