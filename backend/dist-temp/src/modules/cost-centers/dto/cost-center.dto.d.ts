export declare enum CostCenterType {
    OPERATING = "OPERATING",
    PROJECT = "PROJECT",
    OVERHEAD = "OVERHEAD",
    REVENUE = "REVENUE"
}
export declare enum CostCenterStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    ARCHIVED = "ARCHIVED"
}
export declare class CreateCostCenterDto {
    code: string;
    nameAr: string;
    nameEn?: string;
    description?: string;
    type?: CostCenterType;
    parentId?: string;
    managerId?: string;
    effectiveFrom?: string;
    effectiveTo?: string;
    isAllowOverbudget?: boolean;
}
export declare class UpdateCostCenterDto {
    code?: string;
    nameAr?: string;
    nameEn?: string;
    description?: string;
    type?: CostCenterType;
    status?: CostCenterStatus;
    parentId?: string;
    managerId?: string;
    effectiveTo?: string;
    isAllowOverbudget?: boolean;
}
export declare class CreateAllocationDto {
    userId: string;
    costCenterId?: string;
    percentage: number;
    allocationType?: string;
    effectiveFrom?: string;
    effectiveTo?: string;
    reason?: string;
}
export declare class CreateBudgetDto {
    costCenterId?: string;
    year: number;
    month?: number;
    quarter?: number;
    budgetAmount: number;
    notes?: string;
}
