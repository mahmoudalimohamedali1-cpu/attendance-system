export interface QueryResult {
    success: boolean;
    data: any[];
    count: number;
    query: string;
    naturalLanguage: string;
}
export interface QueryPattern {
    pattern: RegExp;
    description: string;
    descriptionAr: string;
    example: string;
}
export declare class NaturalLanguageQueryService {
    private readonly logger;
    private readonly queryPatterns;
    identifyQuery(naturalQuery: string): {
        matched: boolean;
        pattern?: QueryPattern;
    };
    formatResult(result: QueryResult): string;
    private normalizeArabic;
    getQueryExamples(): string[];
    getHelpMessage(): string;
}
