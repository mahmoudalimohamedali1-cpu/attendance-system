import { PermissionsService } from './permissions.service';
import { AddUserPermissionDto, UpdatePermissionEmployeesDto, BulkUpdatePermissionsDto, UpdateManagerDto } from './dto/permissions.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
export declare class PermissionsController {
    private permissionsService;
    private prisma;
    constructor(permissionsService: PermissionsService, prisma: PrismaService);
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
    getMyPermissions(companyId: string, req: any): Promise<import("./permissions.service").UserPermissionWithDetails[]>;
    getUserPermissions(userId: string, companyId: string): Promise<import("./permissions.service").UserPermissionWithDetails[]>;
    addUserPermission(userId: string, companyId: string, dto: AddUserPermissionDto, req: any): Promise<{
        id: string;
        createdAt: Date;
        companyId: string | null;
        branchId: string | null;
        departmentId: string | null;
        scope: import(".prisma/client").$Enums.PermissionScope;
        userId: string;
        permissionId: string;
    }>;
    removeUserPermission(userId: string, userPermissionId: string, req: any): Promise<{
        id: string;
        createdAt: Date;
        companyId: string | null;
        branchId: string | null;
        departmentId: string | null;
        scope: import(".prisma/client").$Enums.PermissionScope;
        userId: string;
        permissionId: string;
    }>;
    getAuditLog(companyId: string): Promise<{
        id: string;
        createdAt: Date;
        companyId: string | null;
        scope: import(".prisma/client").$Enums.PermissionScope | null;
        action: import(".prisma/client").$Enums.PermissionAuditAction;
        ipAddress: string | null;
        userAgent: string | null;
        performedById: string;
        targetUserId: string;
        targetUserName: string;
        permissionCode: string;
        permissionName: string;
        scopeDetails: string | null;
    }[]>;
    updateUserPermissionsBulk(userId: string, companyId: string, dto: BulkUpdatePermissionsDto): Promise<import("./permissions.service").UserPermissionWithDetails[]>;
    updatePermissionEmployees(userId: string, userPermissionId: string, dto: UpdatePermissionEmployeesDto): Promise<void>;
    updateManager(userId: string, dto: UpdateManagerDto): Promise<{
        id: string;
        firstName: string;
        lastName: string;
        managerId: string | null;
        manager: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    }>;
    getSubordinates(userId: string, companyId: string): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        jobTitle: string | null;
        branch: {
            name: string;
        } | null;
        department: {
            name: string;
        } | null;
    }[]>;
    getOrgTree(userId: string, companyId: string): Promise<{
        id: string;
        firstName: string;
        lastName: string;
        jobTitle: string | null;
        manager: {
            id: string;
            firstName: string;
            lastName: string;
            jobTitle: string | null;
        } | null;
        employees: {
            id: string;
            firstName: string;
            lastName: string;
            jobTitle: string | null;
            employees: {
                id: string;
                firstName: string;
                lastName: string;
                jobTitle: string | null;
            }[];
        }[];
    } | null>;
    checkPermission(userId: string, companyId: string, permissionCode: string, employeeId: string): Promise<import("./permissions.service").CanAccessResult>;
    getAccessibleEmployees(userId: string, companyId: string, permissionCode: string): Promise<string[]>;
}
