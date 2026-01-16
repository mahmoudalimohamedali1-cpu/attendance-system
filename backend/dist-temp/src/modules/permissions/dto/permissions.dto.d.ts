import { PermissionScope } from '@prisma/client';
export declare class AddUserPermissionDto {
    permissionCode: string;
    scope: PermissionScope;
    branchId?: string;
    departmentId?: string;
    employeeIds?: string[];
}
export declare class UpdatePermissionEmployeesDto {
    employeeIds: string[];
}
export declare class BulkUpdatePermissionsDto {
    permissions: Array<{
        permissionCode: string;
        scopes: Array<{
            scope: PermissionScope;
            branchId?: string;
            departmentId?: string;
            employeeIds?: string[];
        }>;
    }>;
}
export declare class UpdateManagerDto {
    managerId?: string | null;
}
