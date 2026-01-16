export interface ReportRequest {
    id: string;
    userId: string;
    query: string;
    type: 'attendance' | 'leave' | 'payroll' | 'performance' | 'custom';
    typeAr: string;
    dateRange: {
        start: Date;
        end: Date;
    };
    filters: Record<string, any>;
    status: 'pending' | 'generating' | 'ready' | 'failed';
    format: 'pdf' | 'excel' | 'csv' | 'json';
    createdAt: Date;
    completedAt?: Date;
}
export interface ReportTemplate {
    id: string;
    name: string;
    nameAr: string;
    type: ReportRequest['type'];
    description: string;
    columns: string[];
    defaultFilters: Record<string, any>;
    popular: boolean;
}
export interface ScheduledReport {
    id: string;
    templateId: string;
    templateName: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    frequencyAr: string;
    recipients: string[];
    format: ReportRequest['format'];
    lastRun?: Date;
    nextRun: Date;
    active: boolean;
}
export interface ReportData {
    title: string;
    generatedAt: Date;
    dateRange: {
        start: Date;
        end: Date;
    };
    summary: Record<string, any>;
    columns: string[];
    rows: any[][];
    charts?: {
        type: string;
        data: any;
    }[];
}
export declare class ReportsBuilderService {
    private readonly logger;
    private requests;
    private readonly templates;
    parseReportRequest(query: string, userId: string): ReportRequest;
    generateReport(request: ReportRequest): ReportData;
    getTemplates(type?: ReportRequest['type']): ReportTemplate[];
    formatReportRequest(request: ReportRequest): string;
    formatReportData(data: ReportData): string;
    formatTemplates(): string;
}
