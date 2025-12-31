import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private genAI: GoogleGenerativeAI | null = null;
    // قائمة الموديلات المتاحة للتبديل في حالة الفشل - استخدمنا gemini-flash-latest لأنه الأنجح مع هذا المفتاح
    private readonly models = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-1.5-flash-latest'];

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.logger.log('Gemini AI initialized successfully');
        } else {
            this.logger.warn('GEMINI_API_KEY not found - AI features will be disabled');
        }
    }

    isAvailable(): boolean {
        return this.genAI !== null;
    }

    async generateContent(prompt: string, systemInstruction?: string): Promise<string> {
        if (!this.genAI) {
            throw new Error('AI service is not available. Please configure GEMINI_API_KEY.');
        }

        let lastError = null;

        for (const modelName of this.models) {
            try {
                this.logger.log(`Attempting AI generation with model: ${modelName}`);
                const model = this.genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        temperature: 0.3,
                        topP: 0.8,
                        maxOutputTokens: 2048,
                    },
                    systemInstruction: systemInstruction,
                });

                const result = await model.generateContent(prompt);
                const response = result.response;
                const text = response.text();

                if (text) {
                    this.logger.log(`Successfully generated content using ${modelName}`);
                    return text;
                }
            } catch (error: any) {
                this.logger.warn(`Model ${modelName} failed: ${error.message}`);
                lastError = error;
                // جرب الموديل التالي لو فيه خطأ كوتا أو موديل غير موجود
                if (error.message?.includes('429') || error.message?.includes('Quota') || error.message?.includes('404')) {
                    continue;
                }
                throw error;
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
            this.logger.error(`Failed to parse JSON response: ${cleaned.substring(0, 200)}...`);
            throw new Error('Failed to parse AI response as JSON');
        }
    }
}
