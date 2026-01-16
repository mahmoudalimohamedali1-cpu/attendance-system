import { Response } from 'express';
import { WpsExportService } from './wps-export.service';
import { WpsTrackingService } from '../wps-tracking/wps-tracking.service';
export declare class WpsExportController {
    private wpsExportService;
    private wpsTrackingService;
    constructor(wpsExportService: WpsExportService, wpsTrackingService: WpsTrackingService);
    validateExport(payrollRunId: string, companyId: string): Promise<{
        isReady: boolean;
        issues: {
            type: string;
            message: string;
            employeeId?: string;
        }[];
    }>;
    exportCsv(payrollRunId: string, companyId: string, userId: string, res: Response): Promise<void>;
    exportSarie(payrollRunId: string, companyId: string, userId: string, res: Response): Promise<void>;
    exportSummary(payrollRunId: string, companyId: string): Promise<{
        filename: string;
        recordCount: number;
        totalAmount: number;
        errors: string[];
    }>;
    getMissingBank(companyId: string): Promise<any[]>;
}
