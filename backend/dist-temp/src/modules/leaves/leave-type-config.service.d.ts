import { PrismaService } from '../../common/prisma/prisma.service';
export declare class LeaveTypeConfigService {
    private prisma;
    constructor(prisma: PrismaService);
    getActiveLeaveTypes(companyId: string): Promise<({
        entitlementTiers: {
            id: string;
            createdAt: Date;
            minServiceYears: number;
            leaveTypeId: string;
            maxServiceYears: number;
            entitlementDays: number;
        }[];
        sickPayTiers: {
            id: string;
            createdAt: Date;
            fromDay: number;
            leaveTypeId: string;
            toDay: number;
            paymentPercent: number;
        }[];
    } & {
        id: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        code: string;
        nameAr: string;
        description: string | null;
        isActive: boolean;
        category: import(".prisma/client").$Enums.LeaveCategory;
        sortOrder: number;
        allowNegativeBalance: boolean;
        minNoticeDays: number;
        isOneTimeOnly: boolean;
        requiresAttachment: boolean;
        isEntitlementBased: boolean;
        defaultEntitlement: number;
        maxBalanceCap: number | null;
        allowCarryForward: boolean;
        maxCarryForwardDays: number | null;
        isPaid: boolean;
        paymentPercentage: number;
        attachmentRequiredAfterDays: number | null;
        carryForwardExpiryMonths: number | null;
        minRequestDays: number;
        maxRequestDays: number | null;
        deductFromAnnual: boolean;
    })[]>;
    getLeaveTypeByCode(companyId: string, code: string): Promise<{
        entitlementTiers: {
            id: string;
            createdAt: Date;
            minServiceYears: number;
            leaveTypeId: string;
            maxServiceYears: number;
            entitlementDays: number;
        }[];
        sickPayTiers: {
            id: string;
            createdAt: Date;
            fromDay: number;
            leaveTypeId: string;
            toDay: number;
            paymentPercent: number;
        }[];
    } & {
        id: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        code: string;
        nameAr: string;
        description: string | null;
        isActive: boolean;
        category: import(".prisma/client").$Enums.LeaveCategory;
        sortOrder: number;
        allowNegativeBalance: boolean;
        minNoticeDays: number;
        isOneTimeOnly: boolean;
        requiresAttachment: boolean;
        isEntitlementBased: boolean;
        defaultEntitlement: number;
        maxBalanceCap: number | null;
        allowCarryForward: boolean;
        maxCarryForwardDays: number | null;
        isPaid: boolean;
        paymentPercentage: number;
        attachmentRequiredAfterDays: number | null;
        carryForwardExpiryMonths: number | null;
        minRequestDays: number;
        maxRequestDays: number | null;
        deductFromAnnual: boolean;
    }>;
    calculateEntitlement(leaveTypeId: string, hireDate: Date): Promise<number>;
    calculateSickLeavePayment(leaveTypeId: string, totalSickDaysThisYear: number, requestedDays: number, dailySalary: number): Promise<{
        fullPayDays: number;
        partialPayDays: number;
        unpaidDays: number;
        totalPayment: number;
        totalDeduction: number;
    }>;
    seedDefaultLeaveTypes(companyId: string): Promise<{
        message: string;
        count: number;
    }>;
    private calculateServiceYears;
}
