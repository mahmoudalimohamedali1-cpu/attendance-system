import { PrismaService } from '../../common/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
export declare class PayrollLedgerService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    generateLedger(runId: string, companyId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        companyId: string;
        runId: string;
        totalDeduction: Decimal;
        totalGross: Decimal;
        totalNet: Decimal;
        totalEmployerContribution: Decimal;
    } | undefined>;
}
