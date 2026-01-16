import { PrismaService } from '../../common/prisma/prisma.service';
import { PolicyPayrollLine } from '../payroll-calculation/dto/calculation.types';
export declare class PayslipLinesService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    normalizeMoney(amount: number): number;
    mergeLinesByComponent(lines: PolicyPayrollLine[]): PolicyPayrollLine[];
    isRunLocked(runId: string): Promise<boolean>;
    guardNotLocked(runId: string | null | undefined): Promise<void>;
    deletePolicyLines(payslipId: string): Promise<number>;
    savePolicyLines(payslipId: string, policyLines: PolicyPayrollLine[], companyId: string): Promise<{
        inserted: number;
        deleted: number;
    }>;
    ensurePayslip(runId: string, employeeId: string, companyId: string, periodId: string, calculationResult: {
        baseSalary: number;
        grossSalary: number;
        totalDeductions: number;
        netSalary: number;
        calculationTrace: any[];
    }): Promise<string>;
}
