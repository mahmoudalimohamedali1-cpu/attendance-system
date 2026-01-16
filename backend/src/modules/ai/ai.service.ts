import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

/**
 * 🤖 AI Service - OpenAI (ChatGPT) Implementation
 * 
 * Switched from Claude to OpenAI for better quota management
 * and reliability during Anthropic usage limits.
 * 
 * Models available:
 * - gpt-4o (recommended - fast & smart)
 * - gpt-4o-mini (fastest & cheapest)
 * - gpt-4-turbo (stable)
 */

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private openai: OpenAI | null = null;

    // 🔧 Track rate limit or quota errors
    private isRateLimited = false;
    private rateLimitResetTime: Date | null = null;

    // OpenAI models
    private readonly models = [
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
    ];

    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
            this.openai = new OpenAI({ apiKey });
            this.logger.log('OpenAI (ChatGPT) initialized successfully ✅');
        } else {
            this.logger.warn('OPENAI_API_KEY not found - AI features will be disabled');
        }
    }

    isAvailable(): boolean {
        // Check if client exists
        if (!this.openai) return false;

        // Return false if we're rate limited
        if (this.isRateLimited) {
            // Check if rate limit has reset
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
        if (!this.openai) {
            throw new Error('AI service is not available. Please configure OPENAI_API_KEY.');
        }

        let lastError: any = null;

        for (const modelName of this.models) {
            try {
                this.logger.log(`Attempting AI generation with OpenAI model: ${modelName}`);

                const response = await this.openai.chat.completions.create({
                    model: modelName,
                    messages: [
                        {
                            role: 'system',
                            content: systemInstruction || 'أنت مساعد ذكي لنظام الموارد البشرية. أجب بالعربية بشكل مختصر ومفيد.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.1, // Keep it deterministic for policies
                    max_tokens: 4096,
                });

                const content = response.choices[0]?.message?.content;
                if (content) {
                    this.logger.log(`Successfully generated content using OpenAI ${modelName}`);
                    return content;
                }

                throw new Error('OpenAI returned empty response');
            } catch (error: any) {
                this.logger.warn(`Model ${modelName} failed: ${error.message || error}`);
                lastError = error;

                // Detect rate limit or quota errors
                const errorMessage = error.message || '';
                if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('limit')) {
                    this.isRateLimited = true;
                    // Set reset time to 1 hour
                    this.rateLimitResetTime = new Date(Date.now() + 60 * 60 * 1000);
                    this.logger.warn(`AI rate limited/quota exceeded - will retry after ${this.rateLimitResetTime.toISOString()}`);
                }

                // Try next model if applicable
                continue;
            }
        }

        this.logger.error('All OpenAI models failed to generate content');
        throw lastError || new Error('Failed to generate content with OpenAI');
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

