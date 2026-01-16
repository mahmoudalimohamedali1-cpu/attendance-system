import { ExceptionsService } from './exceptions.service';
export declare class ExceptionsController {
    private exceptionsService;
    constructor(exceptionsService: ExceptionsService);
    validateEmployees(companyId: string): Promise<import("./exceptions.service").ExceptionsSummary>;
    validatePayrollRun(payrollRunId: string, companyId: string): Promise<import("./exceptions.service").ExceptionsSummary>;
    getQuickStats(companyId: string): Promise<{
        missingBank: number;
        missingSalary: number;
        expiringContracts: number;
        totalIssues: number;
    }>;
}
