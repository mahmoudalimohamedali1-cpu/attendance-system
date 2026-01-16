import { PrismaService } from '../../common/prisma/prisma.service';
export declare class ExcelService {
    private prisma;
    constructor(prisma: PrismaService);
    generatePayrollRunExcel(runId: string): Promise<Buffer>;
    generateGosiReportExcel(month: number, year: number): Promise<Buffer>;
    generateSalaryComparisonExcel(month1: number, year1: number, month2: number, year2: number): Promise<Buffer>;
    generateDepartmentCostExcel(month: number, year: number): Promise<Buffer>;
    generateLoansReportExcel(): Promise<Buffer>;
}
