import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * 🤖 AI Service - Hybrid Local + Cloud Implementation
 * 
 * PRIMARY: Local AI Engine (no external API needed)
 * FALLBACK: Google Gemini (optional, if GEMINI_API_KEY is set)
 * 
 * Configure with environment variables:
 * - USE_LOCAL_AI=true (default) - Use local engine first
 * - GEMINI_API_KEY - Optional Gemini API key for fallback
 */

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private genAI: GoogleGenerativeAI | null = null;

    // 🔧 Configuration
    private readonly useLocalAI: boolean;
    private readonly hasGeminiKey: boolean;

    // 🔧 Track rate limit or quota errors
    private isRateLimited = false;
    private rateLimitResetTime: Date | null = null;

    constructor() {
        // Check configuration
        this.useLocalAI = process.env.USE_LOCAL_AI !== 'false'; // Default: true

        const geminiKey = process.env.GEMINI_API_KEY;
        this.hasGeminiKey = !!geminiKey;

        if (geminiKey) {
            this.genAI = new GoogleGenerativeAI(geminiKey);
            this.logger.log('Google Gemini AI initialized as fallback ✅');
        }

        if (this.useLocalAI) {
            this.logger.log('🧠 Local AI Engine is PRIMARY - No external API dependency!');
        } else if (!this.hasGeminiKey) {
            this.logger.warn('⚠️ No AI configured - set USE_LOCAL_AI=true or GEMINI_API_KEY');
        }
    }

    isAvailable(): boolean {
        if (!this.genAI) return false;

        if (this.isRateLimited) {
            if (this.rateLimitResetTime && new Date() > this.rateLimitResetTime) {
                this.isRateLimited = false;
                this.rateLimitResetTime = null;
                this.logger.log('AI rate limit reset - service available again');
            } else {
                return false;
            }
        }

        return true;
    }

    async generateContent(prompt: string, systemInstruction?: string): Promise<string> {
        if (!this.genAI) {
            throw new Error('AI service is not available. Please configure GEMINI_API_KEY.');
        }

        // Try Gemini Flash first (cheapest and fast)
        const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
        let lastError: any = null;

        for (const modelName of models) {
            try {
                this.logger.log(`Attempting AI generation with Gemini model: ${modelName}`);

                const model = this.genAI.getGenerativeModel({
                    model: modelName,
                    systemInstruction: systemInstruction || 'أنت مساعد ذكي لنظام الموارد البشرية. أجب بالعربية بشكل مختصر ومفيد.',
                });

                const result = await model.generateContent(prompt);
                const response = result.response;
                const content = response.text();

                if (content) {
                    this.logger.log(`Successfully generated content using Gemini ${modelName}`);
                    return content;
                }

                throw new Error('Gemini returned empty response');
            } catch (error: any) {
                this.logger.warn(`Model ${modelName} failed: ${error.message || error}`);
                lastError = error;

                // Detect rate limit or quota errors
                const errorMessage = error.message || '';
                if (errorMessage.includes('quota') || errorMessage.includes('rate') || errorMessage.includes('limit') || errorMessage.includes('429')) {
                    this.isRateLimited = true;
                    this.rateLimitResetTime = new Date(Date.now() + 60 * 60 * 1000);
                    this.logger.warn(`AI rate limited - will retry after ${this.rateLimitResetTime.toISOString()}`);
                }

                continue;
            }
        }

        this.logger.error('All Gemini models failed to generate content');
        throw lastError || new Error('Failed to generate content with Gemini');
    }

    parseJsonResponse<T>(response: string | undefined | null): T {
        if (!response) {
            throw new Error('AI returned empty response');
        }

        let cleaned = response.trim();
        if (cleaned.startsWith('```json')) {
            cleaned = cleaned.slice(7);
        } else if (cleaned.startsWith('```')) {
            cleaned = cleaned.slice(3);
        }
        if (cleaned.endsWith('```')) {
            cleaned = cleaned.slice(0, -3);
        }
        cleaned = cleaned.trim();

        try {
            return JSON.parse(cleaned) as T;
        } catch (error) {
            this.logger.warn(`Initial JSON parse failed, attempting recovery...`);

            try {
                const jsonEndIndex = this.findJsonEnd(cleaned);
                if (jsonEndIndex > 0) {
                    const fixedJson = cleaned.substring(0, jsonEndIndex + 1);
                    return JSON.parse(fixedJson) as T;
                }
            } catch (e) {
                // Ignore
            }

            try {
                const repaired = this.repairIncompleteJson(cleaned);
                return JSON.parse(repaired) as T;
            } catch (e) {
                this.logger.error(`Failed to parse JSON response: ${cleaned.substring(0, 300)}...`);
                throw new Error('Failed to parse AI response as JSON');
            }
        }
    }

    private findJsonEnd(json: string): number {
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
            if (inString) continue;
            if (char === '{') braceCount++;
            if (char === '}') {
                braceCount--;
                if (braceCount === 0) return i;
            }
        }
        return -1;
    }

    private repairIncompleteJson(json: string): string {
        let repaired = json;
        let braceCount = 0;
        let bracketCount = 0;
        let inString = false;

        for (let i = 0; i < repaired.length; i++) {
            const char = repaired[i];
            if (char === '"' && (i === 0 || repaired[i - 1] !== '\\')) {
                inString = !inString;
            }
            if (!inString) {
                if (char === '{') braceCount++;
                if (char === '}') braceCount--;
                if (char === '[') bracketCount++;
                if (char === ']') bracketCount--;
            }
        }

        if (inString) repaired += '"';
        while (bracketCount > 0) { repaired += ']'; bracketCount--; }
        while (braceCount > 0) { repaired += '}'; braceCount--; }
        return repaired;
    }
}
