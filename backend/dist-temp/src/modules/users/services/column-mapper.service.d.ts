export interface ColumnMapping {
    sourceColumn: string;
    targetField: string | null;
    confidence: number;
    isCustomField: boolean;
    suggestions: string[];
}
export interface SmartMappingResult {
    mappings: ColumnMapping[];
    unmappedColumns: string[];
    autoMappedCount: number;
    customFieldsCount: number;
}
export declare class ColumnMapperService {
    analyzeColumns(headers: string[]): SmartMappingResult;
    private findBestMatch;
    private createMapping;
    private normalizeText;
    private calculateSimilarity;
    private fuzzyMatch;
    private levenshteinDistance;
    private getSuggestions;
    getKnownFields(): string[];
    getFieldLabel(field: string): string;
}
