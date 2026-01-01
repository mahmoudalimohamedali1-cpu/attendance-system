/**
 * Organization Service - خدمة الهيكل التنظيمي
 */

import { api } from './api.service';

export interface OrgNode {
    id: string;
    name: string;
    jobTitle: string;
    department?: string;
    branch?: string;
    avatar?: string;
    email?: string;
    phone?: string;
    employeeCode?: string;
    status?: 'online' | 'offline' | 'busy' | 'away';
    employeesCount?: number;
    children?: OrgNode[];
}

export interface OrgStats {
    totalEmployees: number;
    departments: number;
    branches: number;
    managers: number;
}

export interface DepartmentInfo {
    id: string;
    name: string;
    nameEn?: string;
    branch?: {
        id: string;
        name: string;
    };
    _count: {
        users: number;
    };
}

export interface BranchInfo {
    id: string;
    name: string;
    nameEn?: string;
    _count: {
        users: number;
    };
}

class OrganizationService {
    /**
     * الحصول على الهيكل التنظيمي
     */
    async getOrgStructure(): Promise<OrgNode | null> {
        return api.get<OrgNode | null>('/organization/structure');
    }

    /**
     * الحصول على قائمة الأقسام
     */
    async getDepartments(): Promise<DepartmentInfo[]> {
        return api.get<DepartmentInfo[]>('/organization/departments');
    }

    /**
     * الحصول على قائمة الفروع
     */
    async getBranches(): Promise<BranchInfo[]> {
        return api.get<BranchInfo[]>('/organization/branches');
    }

    /**
     * الحصول على إحصائيات الهيكل التنظيمي
     */
    async getOrgStats(): Promise<OrgStats> {
        return api.get<OrgStats>('/organization/stats');
    }
}

export const organizationService = new OrganizationService();
