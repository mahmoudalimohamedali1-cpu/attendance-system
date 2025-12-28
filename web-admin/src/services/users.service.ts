/**
 * Users Service - خدمة إدارة المستخدمين
 */

import { api } from './api.service';

export interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeCode?: string;
    role: string;
    departmentId?: string;
    branchId?: string;
    isActive: boolean;
}

export interface GetUsersParams {
    role?: string;
    limit?: number;
    page?: number;
    search?: string;
    departmentId?: string;
    branchId?: string;
    isActive?: boolean;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}

class UsersService {
    /**
     * جلب قائمة المستخدمين
     */
    async getUsers(params?: GetUsersParams): Promise<PaginatedResponse<User>> {
        const queryParams = new URLSearchParams();

        if (params?.role) queryParams.append('role', params.role);
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.search) queryParams.append('search', params.search);
        if (params?.departmentId) queryParams.append('departmentId', params.departmentId);
        if (params?.branchId) queryParams.append('branchId', params.branchId);
        if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());

        const queryString = queryParams.toString();
        const url = queryString ? `/users?${queryString}` : '/users';

        return api.get<PaginatedResponse<User>>(url);
    }

    /**
     * جلب مستخدم بالـ ID
     */
    async getUserById(id: string): Promise<User> {
        return api.get<User>(`/users/${id}`);
    }

    /**
     * جلب الموظفين فقط
     */
    async getEmployees(search?: string): Promise<User[]> {
        const response = await this.getUsers({
            role: 'EMPLOYEE',
            limit: 500,
            search,
        });
        return response.data || [];
    }
}

export const usersService = new UsersService();
