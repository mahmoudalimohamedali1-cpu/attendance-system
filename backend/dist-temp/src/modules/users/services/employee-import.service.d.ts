import { PrismaService } from '../../../common/prisma/prisma.service';
import { ColumnMapperService, SmartMappingResult } from './column-mapper.service';
export interface ImportRow {
    employee_code?: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    national_id?: string;
    iqama_number?: string;
    gosi_number?: string;
    date_of_birth?: string;
    gender?: string;
    nationality?: string;
    is_saudi?: string;
    passport_number?: string;
    passport_expiry?: string;
    iqama_expiry?: string;
    hire_date?: string;
    salary?: string;
    branch_code?: string;
    department_code?: string;
    job_title?: string;
    role?: string;
    marital_status?: string;
    password?: string;
    [key: string]: string | undefined;
}
interface ImportResult {
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
}
export declare class EmployeeImportService {
    private prisma;
    private columnMapper;
    constructor(prisma: PrismaService, columnMapper: ColumnMapperService);
    getTemplateHeaders(): string[];
    generateTemplate(): string;
    parseCSV(content: string): ImportRow[];
    private parseCSVLine;
    importEmployees(rows: ImportRow[], companyId: string): Promise<ImportResult>;
    private parseRole;
    validateImport(rows: ImportRow[], companyId: string): Promise<{
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
    }>;
    smartAnalyzeCSV(content: string): {
        headers: string[];
        mappings: SmartMappingResult;
        preview: any[];
    };
    smartImportEmployees(content: string, companyId: string, customMappings: Record<string, string | null>): Promise<ImportResult & {
        customFieldsAdded: number;
    }>;
    private saveCustomFields;
    getUserCustomFields(userId: string): Promise<{
        fieldName: string;
        fieldValue: string;
        fieldType: string;
    }[]>;
}
export {};
