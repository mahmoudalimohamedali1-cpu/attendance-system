import { Response } from 'express';
import { EmployeeImportService } from './services/employee-import.service';
export declare class EmployeeImportController {
    private importService;
    constructor(importService: EmployeeImportService);
    downloadTemplate(res: Response): void;
    validateImport(file: Express.Multer.File, companyId: string): Promise<{
        valid: boolean;
        warnings: {
            row: number;
            message: string;
        }[];
        errors: {
            row: number;
            field: string;
            message: string;
        }[];
        fileName: string;
        totalRows: number;
    }>;
    importEmployees(file: Express.Multer.File, companyId: string): Promise<{
        success: boolean;
        message: string;
        errors: {
            row: number;
            field: string;
            message: string;
        }[];
    } | {
        message: string;
        success: boolean;
        totalRows: number;
        created: number;
        updated: number;
        skipped: number;
        errors: {
            row: number;
            field: string;
            message: string;
        }[];
        customFieldsAdded?: number;
    }>;
    previewImport(file: Express.Multer.File): Promise<{
        fileName: string;
        totalRows: number;
        headers: string[];
        preview: import("./services/employee-import.service").ImportRow[];
    }>;
    smartAnalyze(file: Express.Multer.File): Promise<{
        headers: string[];
        mappings: import("./services/column-mapper.service").SmartMappingResult;
        preview: any[];
        fileName: string;
    }>;
    smartImport(file: Express.Multer.File, mappingsJson: string, companyId: string): Promise<{
        message: string;
        success: boolean;
        totalRows: number;
        created: number;
        updated: number;
        skipped: number;
        errors: {
            row: number;
            field: string;
            message: string;
        }[];
        customFieldsAdded: number;
    }>;
}
