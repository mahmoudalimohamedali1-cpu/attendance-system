export interface ExportJob {
    id: string;
    userId: string;
    dataTypes: string[];
    format: 'json' | 'csv' | 'pdf' | 'excel';
    dateRange?: {
        start: Date;
        end: Date;
    };
    status: 'queued' | 'processing' | 'ready' | 'failed' | 'expired';
    progress: number;
    fileSize?: number;
    downloadUrl?: string;
    createdAt: Date;
    expiresAt: Date;
}
export interface DataRequest {
    id: string;
    userId: string;
    type: 'access' | 'portability' | 'deletion';
    typeAr: string;
    status: 'pending' | 'processing' | 'completed';
    requestedAt: Date;
    completedAt?: Date;
}
export interface BackupSchedule {
    id: string;
    name: string;
    nameAr: string;
    dataTypes: string[];
    frequency: 'daily' | 'weekly' | 'monthly';
    format: ExportJob['format'];
    lastRun?: Date;
    nextRun: Date;
    active: boolean;
}
export declare class DataExportService {
    private readonly logger;
    private jobs;
    private dataRequests;
    private readonly dataTypes;
    createExport(userId: string, dataTypes: string[], format: ExportJob['format'], dateRange?: {
        start: Date;
        end: Date;
    }): ExportJob;
    private processExport;
    getExportStatus(jobId: string): ExportJob | null;
    requestData(userId: string, type: DataRequest['type']): DataRequest;
    getUserExports(userId: string): ExportJob[];
    formatExportJob(job: ExportJob): string;
    formatDataTypes(): string;
    formatDataRequest(request: DataRequest): string;
}
