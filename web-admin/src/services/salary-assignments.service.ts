/**
 * Salary Assignments API Service
 * تخصيص هياكل الرواتب للموظفين
 */

import { api } from './api.service';

export interface SalaryAssignment {
    id: string;
    userId: string;
    user?: {
        id: string;
        firstName: string;
        lastName: string;
        employeeCode: string;
    };
    salaryStructureId: string;
    salaryStructure?: {
        id: string;
        name: string;
        baseSalary: number;
    };
    effectiveFrom: string;
    effectiveTo?: string;
    baseSalary: number;
    isActive: boolean;
    createdAt: string;
}

export interface CreateSalaryAssignmentDto {
    userId: string;
    salaryStructureId: string;
    baseSalary: number;
    effectiveFrom: string;
    effectiveTo?: string;
}

class SalaryAssignmentsService {
    private readonly basePath = '/salary-assignments';

    async getAll(): Promise<SalaryAssignment[]> {
        const response = await api.get(this.basePath) as SalaryAssignment[] | { data: SalaryAssignment[] };
        return (response as any).data || response;
    }

    async getByEmployee(userId: string): Promise<SalaryAssignment[]> {
        const response = await api.get(`${this.basePath}/employee/${userId}`) as SalaryAssignment[] | { data: SalaryAssignment[] };
        return (response as any).data || response;
    }

    async getActive(userId: string): Promise<SalaryAssignment | null> {
        try {
            const response = await api.get(`${this.basePath}/employee/${userId}/active`) as SalaryAssignment | { data: SalaryAssignment };
            return (response as any).data || response;
        } catch {
            return null;
        }
    }

    async create(data: CreateSalaryAssignmentDto): Promise<SalaryAssignment> {
        const response = await api.post(this.basePath, data) as SalaryAssignment | { data: SalaryAssignment };
        return (response as any).data || response;
    }

    async delete(id: string): Promise<void> {
        await api.delete(`${this.basePath}/${id}`);
    }
}

export const salaryAssignmentsService = new SalaryAssignmentsService();
