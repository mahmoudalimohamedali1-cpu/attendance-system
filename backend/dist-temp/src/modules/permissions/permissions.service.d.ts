import { PrismaService } from '../../common/prisma/prisma.service';
import { PermissionScope, UserPermission, Permission } from '@prisma/client';
export interface UserPermissionWithDetails extends UserPermission {
    permission: Permission;
    assignedEmployees?: {
        employeeId: string;
    }[];
}
export interface CanAccessResult {
    hasAccess: boolean;
    reason?: string;
}
export declare class PermissionsService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getAllPermissions(): Promise<{
        id: string;
        name: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        code: string;
        description: string | null;
        isActive: boolean;
        category: string;
        requiresPermission: string | null;
        sortOrder: number;
    }[]>;
    getPermissionsByCategory(): Promise<Record<string, {
        id: string;
        name: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        code: string;
        description: string | null;
        isActive: boolean;
        category: string;
        requiresPermission: string | null;
        sortOrder: number;
    }[]>>;
    getPermissionByCode(code: string): Promise<{
        id: string;
        name: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        code: string;
        description: string | null;
        isActive: boolean;
        category: string;
        requiresPermission: string | null;
        sortOrder: number;
    } | null>;
    getUserPermissions(userId: string, companyId: string): Promise<UserPermissionWithDetails[]>;
    getUserPermissionsByCode(userId: string, companyId: string, permissionCode: string): Promise<UserPermissionWithDetails[]>;
    addUserPermission(userId: string, companyId: string, permissionCode: string, scope: PermissionScope, options?: {
        branchId?: string;
        departmentId?: string;
        employeeIds?: string[];
    }, performedById?: string): Promise<{
        id: string;
        createdAt: Date;
        companyId: string | null;
        branchId: string | null;
        departmentId: string | null;
        scope: import(".prisma/client").$Enums.PermissionScope;
        userId: string;
        permissionId: string;
    }>;
    removeUserPermission(userPermissionId: string, performedById?: string): Promise<{
        id: string;
        createdAt: Date;
        companyId: string | null;
        branchId: string | null;
        departmentId: string | null;
        scope: import(".prisma/client").$Enums.PermissionScope;
        userId: string;
        permissionId: string;
    }>;
    updatePermissionEmployees(userPermissionId: string, employeeIds: string[]): Promise<void>;
    hasPermission(userId: string, companyId: string, permissionCode: string): Promise<boolean>;
    canAccessEmployee(userId: string, companyId: string, permissionCode: string, targetEmployeeId: string): Promise<CanAccessResult>;
    getAccessibleEmployeeIds(userId: string, companyId: string, permissionCode: string): Promise<string[]>;
    private getAllSubordinates;
    private isDirectSubordinate;
    private getDirectSubordinates;
    private isEmployeeInBranch;
    private getBranchEmployees;
    private isEmployeeInDepartment;
    private getDepartmentEmployees;
    updateUserPermissionsBulk(userId: string, companyId: string, permissions: Array<{
        permissionCode: string;
        scopes: Array<{
            scope: PermissionScope;
            branchId?: string;
            departmentId?: string;
            employeeIds?: string[];
        }>;
    }>): Promise<UserPermissionWithDetails[]>;
}
