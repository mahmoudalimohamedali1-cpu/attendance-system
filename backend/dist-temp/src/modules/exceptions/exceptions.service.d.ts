import { PrismaService } from '../../common/prisma/prisma.service';
export interface PayrollException {
    type: 'MISSING_BANK' | 'INVALID_IBAN' | 'MISSING_SALARY' | 'NEGATIVE_NET' | 'MISSING_CONTRACT' | 'EXPIRED_CONTRACT';
    severity: 'ERROR' | 'WARNING';
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    message: string;
    details?: any;
}
export interface ExceptionsSummary {
    totalEmployees: number;
    employeesWithIssues: number;
    errorCount: number;
    warningCount: number;
    exceptions: PayrollException[];
    byType: {
        type: string;
        count: number;
    }[];
}
export declare class ExceptionsService {
    private prisma;
    constructor(prisma: PrismaService);
    validateEmployeesForPayroll(companyId: string): Promise<ExceptionsSummary>;
    validatePayrollRun(payrollRunId: string, companyId: string): Promise<ExceptionsSummary>;
    getQuickStats(companyId: string): Promise<{
        missingBank: number;
        missingSalary: number;
        expiringContracts: number;
        totalIssues: number;
    }>;
}
