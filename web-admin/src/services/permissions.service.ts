/**
 * Permissions Service - API calls for managing user permissions
 */

import { api } from './api.service';

// Types
export interface Permission {
    id: string;
    code: string;
    name: string;
    nameEn: string | null;
    category: string;
    description: string | null;
    requiresPermission: string | null;
    isActive: boolean;
    sortOrder: number;
}

export interface UserPermission {
    id: string;
    userId: string;
    permissionId: string;
    scope: 'SELF' | 'TEAM' | 'BRANCH' | 'DEPARTMENT' | 'ALL' | 'CUSTOM';
    branchId: string | null;
    departmentId: string | null;
    permission: Permission;
    assignedEmployees?: { employeeId: string }[];
}

export interface AddPermissionDto {
    permissionCode: string;
    scope: 'SELF' | 'TEAM' | 'BRANCH' | 'DEPARTMENT' | 'ALL' | 'CUSTOM';
    branchId?: string;
    departmentId?: string;
    employeeIds?: string[];
}

export interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    employeeCode?: string;
    jobTitle?: string;
    department?: { name: string };
    branch?: { name: string };
}

class PermissionsService {
    // Get all available permissions
    async getAllPermissions(): Promise<Permission[]> {
        return api.get<Permission[]>('/permissions');
    }

    // Get permissions grouped by category
    async getPermissionsByCategory(): Promise<Record<string, Permission[]>> {
        return api.get<Record<string, Permission[]>>('/permissions/categories');
    }

    // Get user's permissions
    async getUserPermissions(userId: string): Promise<UserPermission[]> {
        return api.get<UserPermission[]>(`/permissions/users/${userId}`);
    }

    // Add permission to user
    async addUserPermission(userId: string, data: AddPermissionDto): Promise<UserPermission> {
        return api.post<UserPermission>(`/permissions/users/${userId}`, data);
    }

    // Remove permission from user
    async removeUserPermission(userId: string, userPermissionId: string): Promise<void> {
        return api.delete(`/permissions/users/${userId}/${userPermissionId}`);
    }

    // Update employees for a CUSTOM scope permission
    async updatePermissionEmployees(
        userId: string,
        userPermissionId: string,
        employeeIds: string[]
    ): Promise<void> {
        return api.put(`/permissions/users/${userId}/permissions/${userPermissionId}/employees`, {
            employeeIds,
        });
    }

    // Update user's manager
    async updateUserManager(userId: string, managerId: string | null): Promise<Employee> {
        return api.put<Employee>(`/permissions/users/${userId}/manager`, { managerId });
    }

    // Get user's subordinates
    async getUserSubordinates(userId: string): Promise<Employee[]> {
        return api.get<Employee[]>(`/permissions/users/${userId}/subordinates`);
    }

    // Get all employees (for selection)
    async getAllEmployees(): Promise<Employee[]> {
        return api.get<Employee[]>('/users');
    }

    // Get all branches
    async getAllBranches(): Promise<{ id: string; name: string }[]> {
        return api.get('/branches');
    }

    // Get all departments
    async getAllDepartments(): Promise<{ id: string; name: string }[]> {
        return api.get('/branches/departments');
    }
}

export const permissionsService = new PermissionsService();
