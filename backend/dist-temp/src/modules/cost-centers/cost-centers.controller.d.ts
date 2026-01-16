import { CostCentersService } from './cost-centers.service';
import { CreateCostCenterDto, UpdateCostCenterDto, CreateAllocationDto, CreateBudgetDto } from './dto/cost-center.dto';
interface AuthenticatedRequest {
    user: {
        id: string;
        companyId: string;
        role: string;
    };
}
export declare class CostCentersController {
    private readonly costCentersService;
    constructor(costCentersService: CostCentersService);
    create(dto: CreateCostCenterDto, req: AuthenticatedRequest): Promise<{
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
    findAll(req: AuthenticatedRequest, status?: string, type?: string, search?: string): Promise<({
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
    findTree(req: AuthenticatedRequest): Promise<({
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
        children: import(".prisma/client").CostCenter[];
    })[]>;
    findOne(id: string, req: AuthenticatedRequest): Promise<{
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
            percentage: import("@prisma/client/runtime/library").Decimal;
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
            budgetAmount: import("@prisma/client/runtime/library").Decimal;
            actualAmount: import("@prisma/client/runtime/library").Decimal;
            variance: import("@prisma/client/runtime/library").Decimal;
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
    update(id: string, dto: UpdateCostCenterDto, req: AuthenticatedRequest): Promise<{
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
    archive(id: string, req: AuthenticatedRequest): Promise<{
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
    createAllocation(costCenterId: string, dto: CreateAllocationDto, req: AuthenticatedRequest): Promise<{
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
        percentage: import("@prisma/client/runtime/library").Decimal;
        allocationType: string;
        primaryCostCenterId: string | null;
    }>;
    findAllocations(id: string, req: AuthenticatedRequest): Promise<({
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
        percentage: import("@prisma/client/runtime/library").Decimal;
        allocationType: string;
        primaryCostCenterId: string | null;
    })[]>;
    findUserAllocations(userId: string, req: AuthenticatedRequest): Promise<({
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
        percentage: import("@prisma/client/runtime/library").Decimal;
        allocationType: string;
        primaryCostCenterId: string | null;
    })[]>;
    deactivateAllocation(allocationId: string, req: AuthenticatedRequest): Promise<{
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
        percentage: import("@prisma/client/runtime/library").Decimal;
        allocationType: string;
        primaryCostCenterId: string | null;
    }>;
    createBudget(costCenterId: string, dto: CreateBudgetDto, req: AuthenticatedRequest): Promise<{
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
        budgetAmount: import("@prisma/client/runtime/library").Decimal;
        actualAmount: import("@prisma/client/runtime/library").Decimal;
        variance: import("@prisma/client/runtime/library").Decimal;
    }>;
    findBudgets(id: string, year?: string): Promise<{
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
        budgetAmount: import("@prisma/client/runtime/library").Decimal;
        actualAmount: import("@prisma/client/runtime/library").Decimal;
        variance: import("@prisma/client/runtime/library").Decimal;
    }[]>;
    getAnalytics(id: string, req: AuthenticatedRequest): Promise<{
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
                budgetAmount: import("@prisma/client/runtime/library").Decimal;
                actualAmount: import("@prisma/client/runtime/library").Decimal;
                variance: import("@prisma/client/runtime/library").Decimal;
            }[];
        };
    }>;
    getEmployees(id: string, req: AuthenticatedRequest): Promise<{
        direct: {
            id: string;
            firstName: string;
            lastName: string;
            employeeCode: string | null;
            jobTitle: string | null;
            salary: import("@prisma/client/runtime/library").Decimal | null;
        }[];
        allocated: {
            percentage: import("@prisma/client/runtime/library").Decimal | undefined;
            id: string;
            firstName: string;
            lastName: string;
            employeeCode: string | null;
            jobTitle: string | null;
            salary: import("@prisma/client/runtime/library").Decimal | null;
        }[];
    }>;
}
export {};
