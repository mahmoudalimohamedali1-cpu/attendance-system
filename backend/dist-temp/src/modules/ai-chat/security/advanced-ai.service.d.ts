export interface SentimentResult {
    text: string;
    sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
    sentimentAr: string;
    confidence: number;
    emotions: {
        emotion: string;
        emotionAr: string;
        score: number;
    }[];
    keywords: string[];
}
export interface Summary {
    originalLength: number;
    summaryLength: number;
    compression: number;
    summary: string;
    keyPoints: string[];
    entities: {
        type: string;
        value: string;
    }[];
}
export interface SmartSuggestion {
    id: string;
    type: 'action' | 'response' | 'followup' | 'correction';
    typeAr: string;
    text: string;
    confidence: number;
    context?: string;
}
export interface ConversationMemory {
    userId: string;
    topics: {
        topic: string;
        frequency: number;
        lastMentioned: Date;
    }[];
    preferences: Record<string, any>;
    context: {
        key: string;
        value: any;
        expiresAt?: Date;
    }[];
}
export interface AIInsight {
    category: string;
    categoryAr: string;
    insight: string;
    confidence: number;
    actionable: boolean;
    suggestedAction?: string;
}
export declare class AdvancedAIService {
    private readonly logger;
    private memories;
    private readonly positivePatterns;
    private readonly negativePatterns;
    private readonly emotionKeywords;
    analyzeSentiment(text: string): SentimentResult;
    summarizeText(text: string, maxLength?: number): Summary;
    private extractEntities;
    getSuggestions(context: string, lastMessage: string): SmartSuggestion[];
    storeMemory(userId: string, topic: string, value: any): void;
    getMemory(userId: string): ConversationMemory | null;
    generateInsights(data: any): AIInsight[];
    formatSentiment(result: SentimentResult): string;
    formatSuggestions(suggestions: SmartSuggestion[]): string;
}
