export interface PromptTemplate {
    name: string;
    systemInstruction: string;
    fewShotExamples?: {
        input: string;
        output: string;
    }[];
    maxTokens?: number;
    temperature?: number;
}
export interface CachedResponse {
    response: string;
    timestamp: number;
    hitCount: number;
}
export declare class AIPromptManagerService {
    private readonly logger;
    private readonly cache;
    private readonly CACHE_TTL_MS;
    private readonly MAX_CACHE_SIZE;
    private totalInputTokens;
    private totalOutputTokens;
    private totalCalls;
    private readonly templates;
    getTemplate(name: string): PromptTemplate | undefined;
    buildPrompt(templateName: string, userMessage: string, context?: string): {
        systemInstruction: string;
        prompt: string;
        config: {
            maxTokens: number;
            temperature: number;
        };
    };
    getCached(key: string): string | null;
    setCache(key: string, response: string): void;
    private hashKey;
    trackUsage(inputTokens: number, outputTokens: number): void;
    getUsageStats(): {
        totalCalls: number;
        totalInputTokens: number;
        totalOutputTokens: number;
        cacheHitRate: number;
        cacheSize: number;
    };
    clearCache(): void;
    listTemplates(): string[];
}
