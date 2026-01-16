import { PrismaService } from '../../common/prisma/prisma.service';
import { PayslipLinesService } from '../payslips/payslip-lines.service';
export declare class AdjustmentRunService {
    private readonly prisma;
    private readonly payslipLinesService;
    private readonly logger;
    constructor(prisma: PrismaService, payslipLinesService: PayslipLinesService);
    createAdjustmentRun(originalRunId: string, companyId: string, reason: string, createdById: string): Promise<{
        id: string;
        message: string;
    }>;
    addAdjustmentLine(adjustmentRunId: string, employeeId: string, companyId: string, adjustmentData: {
        componentId: string;
        sign: 'EARNING' | 'DEDUCTION';
        amount: number;
        reason: string;
    }): Promise<{
        payslipLineId: string;
    }>;
    private updateAdjustmentPayslipTotals;
    getAdjustmentRuns(originalRunId: string, companyId: string): Promise<({
        payslips: ({
            employee: {
                id: string;
                firstName: string;
                lastName: string;
                employeeCode: string | null;
            };
            lines: {
                id: string;
                createdAt: Date;
                costCenterId: string | null;
                sign: string;
                amount: import("@prisma/client/runtime/library").Decimal;
                sourceType: import(".prisma/client").$Enums.PayslipLineSource;
                sourceRef: string | null;
                descriptionAr: string | null;
                units: import("@prisma/client/runtime/library").Decimal | null;
                rate: import("@prisma/client/runtime/library").Decimal | null;
                componentId: string;
                payslipId: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.PayrollStatus;
            companyId: string | null;
            periodId: string;
            baseSalary: import("@prisma/client/runtime/library").Decimal;
            grossSalary: import("@prisma/client/runtime/library").Decimal;
            totalDeductions: import("@prisma/client/runtime/library").Decimal;
            netSalary: import("@prisma/client/runtime/library").Decimal;
            calculationTrace: import("@prisma/client/runtime/library").JsonValue | null;
            employeeId: string;
            runId: string | null;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.PayrollStatus;
        companyId: string | null;
        lockedAt: Date | null;
        lockedBy: string | null;
        periodId: string;
        runDate: Date;
        processedBy: string | null;
        isAdjustment: boolean;
        originalRunId: string | null;
        adjustmentReason: string | null;
        calculatedAt: Date | null;
        calculatedBy: string | null;
        hrApprovedAt: Date | null;
        hrApprovedBy: string | null;
        financeApprovedAt: Date | null;
        financeApprovedBy: string | null;
        paidAt: Date | null;
    })[]>;
    lockAdjustmentRun(adjustmentRunId: string, companyId: string, lockedById: string): Promise<{
        message: string;
    }>;
}
