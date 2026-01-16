export interface IntentMatch {
    intent: string;
    confidence: number;
    entities: Record<string, {
        value: string;
        confidence: number;
    }>;
    alternativeIntents?: {
        intent: string;
        confidence: number;
    }[];
    needsDisambiguation: boolean;
    disambiguationPrompt?: string;
}
export declare class EnhancedIntentClassifierService {
    private readonly logger;
    private readonly arabicNormalization;
    private readonly diacritics;
    private readonly intentPatterns;
    normalizeArabic(text: string): string;
    classify(message: string): IntentMatch;
    private calculateSimilarity;
    private levenshteinDistance;
    private createDisambiguationPrompt;
    getSupportedIntents(): string[];
}
