export interface Document {
    id: string;
    name: string;
    nameAr: string;
    category: 'policy' | 'form' | 'template' | 'guide' | 'contract' | 'legal';
    categoryAr: string;
    description: string;
    keywords: string[];
    url?: string;
    lastUpdated: Date;
    department?: string;
}
export interface DocumentTemplate {
    id: string;
    name: string;
    nameAr: string;
    type: 'letter' | 'form' | 'report' | 'contract' | 'certificate';
    typeAr: string;
    fields: TemplateField[];
    content: string;
}
export interface TemplateField {
    name: string;
    nameAr: string;
    type: 'text' | 'date' | 'number' | 'select';
    required: boolean;
    options?: string[];
}
export declare class DocumentFinderService {
    private readonly logger;
    private readonly documents;
    private readonly templates;
    searchDocuments(query: string): Document[];
    private normalizeArabic;
    getByCategory(category: Document['category']): Document[];
    getTemplates(): DocumentTemplate[];
    generateFromTemplate(templateId: string, data: Record<string, string>): {
        success: boolean;
        content?: string;
        message: string;
    };
    formatSearchResults(query: string): string;
    formatTemplates(): string;
    getCategorySummary(): string;
}
