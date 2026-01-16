import { PrismaService } from '../../common/prisma/prisma.service';
export interface LockCheckResult {
    isLocked: boolean;
    lockedPeriod?: string;
    lockedAt?: Date;
    lockedBy?: string;
    message?: string;
}
export declare const SAUDI_LABOR_LAW_LIMITS: {
    MAX_MONTHLY_DEDUCTION_PERCENTAGE: number;
    MAX_SINGLE_PENALTY_DAYS: number;
    MAX_SUSPENSION_WITHOUT_PAY_DAYS: number;
    TERMINATION_REQUIRES_INVESTIGATION: boolean;
};
export declare class PayrollProtectionService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    isPayrollPeriodLocked(companyId: string, year?: number, month?: number): Promise<LockCheckResult>;
    validatePolicyModification(companyId: string, policyId: string): Promise<void>;
    validateLaborLawLimits(baseSalary: number, totalDeductions: number, penaltyDays?: number): {
        isValid: boolean;
        violations: string[];
        adjustedDeductions?: number;
    };
    applyLaborLawCaps(employeeId: string, companyId: string, year: number, month: number, proposedDeductions: {
        code: string;
        amount: number;
    }[]): Promise<{
        original: number;
        capped: number;
        wasCapped: boolean;
        details: {
            code: string;
            originalAmount: number;
            cappedAmount: number;
        }[];
    }>;
    getRecentPeriodsLockStatus(companyId: string, monthsBack?: number): Promise<{
        period: string;
        exists: boolean;
        status: string;
        isLocked: boolean;
        lockedAt: Date | null | undefined;
    }[]>;
    canApplyRetroactively(companyId: string, startPeriod: string, endPeriod: string): Promise<{
        canApply: boolean;
        blockedPeriods: string[];
        message?: string;
    }>;
}
