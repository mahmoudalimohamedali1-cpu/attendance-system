import { PrismaService } from '../../common/prisma/prisma.service';
import { PayslipLinesService } from '../payslips/payslip-lines.service';
export interface GosiResult {
    applies: boolean;
    reason?: string;
    base: number;
    employeeShare: number;
    employerShare: number;
    breakdown: {
        employeeRate: number;
        employerRate: number;
        sanedRate: number;
        hazardRate: number;
    };
}
export interface GosiTraceStep {
    step: string;
    description: string;
    formula: string;
    result: number;
}
export declare class GosiCalculationService {
    private readonly prisma;
    private readonly payslipLinesService;
    private readonly logger;
    constructor(prisma: PrismaService, payslipLinesService: PayslipLinesService);
    private normalizeMoney;
    getActiveConfig(companyId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        version: number;
        effectiveDate: Date;
        endDate: Date | null;
        isActive: boolean;
        employeeRate: import("@prisma/client/runtime/library").Decimal;
        employerRate: import("@prisma/client/runtime/library").Decimal;
        sanedRate: import("@prisma/client/runtime/library").Decimal;
        hazardRate: import("@prisma/client/runtime/library").Decimal;
        maxCapAmount: import("@prisma/client/runtime/library").Decimal;
        minBaseSalary: import("@prisma/client/runtime/library").Decimal;
        isSaudiOnly: boolean;
        includeAllowances: boolean;
        notes: string | null;
    } | null>;
    isEmployeeEligible(employee: {
        isSaudi?: boolean | null;
    }, config: {
        isSaudiOnly: boolean;
    }): boolean;
    calculateGosiBase(payslipId: string, baseSalary: number, companyId: string, config: {
        minBaseSalary: number;
        maxCapAmount: number;
        includeAllowances: boolean;
    }): Promise<{
        base: number;
        components: string[];
    }>;
    calculateShares(base: number, config: {
        employeeRate: number;
        employerRate: number;
        sanedRate: number;
        hazardRate: number;
    }): {
        employeeShare: number;
        employerShare: number;
    };
    calculateForEmployee(employeeId: string, payslipId: string, baseSalary: number, companyId: string): Promise<{
        result: GosiResult;
        trace: GosiTraceStep[];
    }>;
    saveGosiLines(payslipId: string, employeeShare: number, employerShare: number, companyId: string): Promise<{
        saved: boolean;
        error?: string;
    }>;
    generateReport(runId: string, companyId: string): Promise<{
        report: {
            employeeId: string;
            employeeCode: string;
            employeeName: string;
            isSaudi: boolean;
            nationality: string | null;
            baseSalary: number;
            employeeShare: number;
            employerShare: number;
            totalContribution: number;
        }[];
        totals: {
            totalEmployees: number;
            totalEmployeeShare: number;
            totalEmployerShare: number;
            grandTotal: number;
        };
    }>;
}
