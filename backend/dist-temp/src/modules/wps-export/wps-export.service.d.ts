import { PrismaService } from '../../common/prisma/prisma.service';
interface WpsExportResult {
    filename: string;
    content: string;
    recordCount: number;
    totalAmount: number;
    errors: string[];
}
export declare class WpsExportService {
    private prisma;
    constructor(prisma: PrismaService);
    generateWpsFile(payrollRunId: string, companyId: string): Promise<WpsExportResult>;
    generateSarieFile(payrollRunId: string, companyId: string): Promise<WpsExportResult>;
    getEmployeesWithoutBank(companyId: string): Promise<any[]>;
    getEmployeesWithoutNationalId(companyId: string): Promise<any[]>;
    validateExportReadiness(payrollRunId: string, companyId: string): Promise<{
        isReady: boolean;
        issues: {
            type: string;
            message: string;
            employeeId?: string;
        }[];
    }>;
    private validateIBAN;
    private extractBankCode;
    private formatDate;
}
export {};
