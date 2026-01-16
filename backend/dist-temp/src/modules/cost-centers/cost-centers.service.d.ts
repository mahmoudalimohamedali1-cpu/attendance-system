import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCostCenterDto, UpdateCostCenterDto, CreateAllocationDto, CreateBudgetDto } from './dto/cost-center.dto';
import { Prisma, CostCenter } from '@prisma/client';
export declare class CostCentersService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateCostCenterDto, companyId: string): Promise<{
        parent: {
            id: string;
            code: string;
            nameAr: string;
        } | null;
        children: {
            id: string;
            code: string;
            nameAr: string;
        }[];
    } & {
        id: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        companyId: string | null;
        managerId: string | null;
        code: string;
        nameAr: string;
        type: string;
        description: string | null;
        version: number;
        effectiveFrom: Date;
        effectiveTo: Date | null;
        level: number;
        path: string | null;
        isAllowOverbudget: boolean;
        parentId: string | null;
    }>;
    findAll(companyId: string, filters?: {
        status?: string;
        type?: string;
        search?: string;
    }): Promise<({
        _count: {
            users: number;
            allocations: number;
            budgets: number;
        };
        parent: {
            id: string;
            code: string;
            nameAr: string;
        } | null;
        children: {
            id: string;
            code: string;
            nameAr: string;
        }[];
    } & {
        id: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        companyId: string | null;
        managerId: string | null;
        code: string;
        nameAr: string;
        type: string;
        description: string | null;
        version: number;
        effectiveFrom: Date;
        effectiveTo: Date | null;
        level: number;
        path: string | null;
        isAllowOverbudget: boolean;
        parentId: string | null;
    })[]>;
    findTree(companyId: string): Promise<({
        id: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        companyId: string | null;
        managerId: string | null;
        code: string;
        nameAr: string;
        type: string;
        description: string | null;
        version: number;
        effectiveFrom: Date;
        effectiveTo: Date | null;
        level: number;
        path: string | null;
        isAllowOverbudget: boolean;
        parentId: string | null;
    } & {
        children: CostCenter[];
    })[]>;
    findOne(id: string, companyId: string): Promise<{
        users: {
            id: string;
            firstName: string;
            lastName: string;
            employeeCode: string | null;
        }[];
        parent: {
            id: string;
            code: string;
            nameAr: string;
        } | null;
        children: {
            id: string;
            status: string;
            code: string;
            nameAr: string;
        }[];
        allocations: {
            id: string;
            effectiveFrom: Date;
            effectiveTo: Date | null;
            userId: string;
            percentage: Prisma.Decimal;
            allocationType: string;
        }[];
        budgets: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string | null;
            costCenterId: string;
            month: number | null;
            year: number;
            lockedAt: Date | null;
            lockedBy: string | null;
            notes: string | null;
            isLocked: boolean;
            quarter: number | null;
            budgetAmount: Prisma.Decimal;
            actualAmount: Prisma.Decimal;
            variance: Prisma.Decimal;
        }[];
    } & {
        id: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        companyId: string | null;
        managerId: string | null;
        code: string;
        nameAr: string;
        type: string;
        description: string | null;
        version: number;
        effectiveFrom: Date;
        effectiveTo: Date | null;
        level: number;
        path: string | null;
        isAllowOverbudget: boolean;
        parentId: string | null;
    }>;
    update(id: string, dto: UpdateCostCenterDto, companyId: string): Promise<{
        parent: {
            id: string;
            code: string;
            nameAr: string;
        } | null;
        children: {
            id: string;
            code: string;
            nameAr: string;
        }[];
    } & {
        id: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        companyId: string | null;
        managerId: string | null;
        code: string;
        nameAr: string;
        type: string;
        description: string | null;
        version: number;
        effectiveFrom: Date;
        effectiveTo: Date | null;
        level: number;
        path: string | null;
        isAllowOverbudget: boolean;
        parentId: string | null;
    }>;
    archive(id: string, companyId: string): Promise<{
        id: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        companyId: string | null;
        managerId: string | null;
        code: string;
        nameAr: string;
        type: string;
        description: string | null;
        version: number;
        effectiveFrom: Date;
        effectiveTo: Date | null;
        level: number;
        path: string | null;
        isAllowOverbudget: boolean;
        parentId: string | null;
    }>;
    createAllocation(dto: CreateAllocationDto, companyId: string): Promise<{
        costCenter: {
            id: string;
            code: string;
            nameAr: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        costCenterId: string;
        isActive: boolean;
        effectiveFrom: Date;
        effectiveTo: Date | null;
        userId: string;
        reason: string | null;
        percentage: Prisma.Decimal;
        allocationType: string;
        primaryCostCenterId: string | null;
    }>;
    findAllocations(costCenterId: string, companyId: string): Promise<({
        costCenter: {
            id: string;
            code: string;
            nameAr: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        costCenterId: string;
        isActive: boolean;
        effectiveFrom: Date;
        effectiveTo: Date | null;
        userId: string;
        reason: string | null;
        percentage: Prisma.Decimal;
        allocationType: string;
        primaryCostCenterId: string | null;
    })[]>;
    findUserAllocations(userId: string, companyId: string): Promise<({
        costCenter: {
            id: string;
            code: string;
            nameAr: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        costCenterId: string;
        isActive: boolean;
        effectiveFrom: Date;
        effectiveTo: Date | null;
        userId: string;
        reason: string | null;
        percentage: Prisma.Decimal;
        allocationType: string;
        primaryCostCenterId: string | null;
    })[]>;
    deactivateAllocation(allocationId: string, companyId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        costCenterId: string;
        isActive: boolean;
        effectiveFrom: Date;
        effectiveTo: Date | null;
        userId: string;
        reason: string | null;
        percentage: Prisma.Decimal;
        allocationType: string;
        primaryCostCenterId: string | null;
    }>;
    createBudget(dto: CreateBudgetDto, companyId: string): Promise<{
        costCenter: {
            id: string;
            code: string;
            nameAr: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        costCenterId: string;
        month: number | null;
        year: number;
        lockedAt: Date | null;
        lockedBy: string | null;
        notes: string | null;
        isLocked: boolean;
        quarter: number | null;
        budgetAmount: Prisma.Decimal;
        actualAmount: Prisma.Decimal;
        variance: Prisma.Decimal;
    }>;
    findBudgets(costCenterId: string, year?: number): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        costCenterId: string;
        month: number | null;
        year: number;
        lockedAt: Date | null;
        lockedBy: string | null;
        notes: string | null;
        isLocked: boolean;
        quarter: number | null;
        budgetAmount: Prisma.Decimal;
        actualAmount: Prisma.Decimal;
        variance: Prisma.Decimal;
    }[]>;
    updateBudgetActual(budgetId: string, actualAmount: number): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        costCenterId: string;
        month: number | null;
        year: number;
        lockedAt: Date | null;
        lockedBy: string | null;
        notes: string | null;
        isLocked: boolean;
        quarter: number | null;
        budgetAmount: Prisma.Decimal;
        actualAmount: Prisma.Decimal;
        variance: Prisma.Decimal;
    }>;
    getAnalytics(costCenterId: string, companyId: string): Promise<{
        costCenter: {
            _count: {
                users: number;
                children: number;
            };
        } & {
            id: string;
            nameEn: string | null;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            companyId: string | null;
            managerId: string | null;
            code: string;
            nameAr: string;
            type: string;
            description: string | null;
            version: number;
            effectiveFrom: Date;
            effectiveTo: Date | null;
            level: number;
            path: string | null;
            isAllowOverbudget: boolean;
            parentId: string | null;
        };
        summary: {
            directEmployees: number;
            childrenCount: number;
            allocationsCount: number;
            totalAllocationPercentage: number;
        };
        budget: {
            totalBudget: number;
            totalActual: number;
            totalVariance: number;
            utilizationRate: number;
            periods: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                companyId: string | null;
                costCenterId: string;
                month: number | null;
                year: number;
                lockedAt: Date | null;
                lockedBy: string | null;
                notes: string | null;
                isLocked: boolean;
                quarter: number | null;
                budgetAmount: Prisma.Decimal;
                actualAmount: Prisma.Decimal;
                variance: Prisma.Decimal;
            }[];
        };
    }>;
    getEmployeesByCostCenter(costCenterId: string, companyId: string): Promise<{
        direct: {
            id: string;
            firstName: string;
            lastName: string;
            employeeCode: string | null;
            jobTitle: string | null;
            salary: Prisma.Decimal | null;
        }[];
        allocated: {
            percentage: Prisma.Decimal | undefined;
            id: string;
            firstName: string;
            lastName: string;
            employeeCode: string | null;
            jobTitle: string | null;
            salary: Prisma.Decimal | null;
        }[];
    }>;
}
