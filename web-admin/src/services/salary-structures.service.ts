/**
 * Salary Structures API Service
 * هياكل الرواتب
 */

import { api } from './api.service';

export interface SalaryStructure {
    id: string;
    name: string;
    description?: string;
    baseSalary: number;
    components?: SalaryStructureComponent[];
    isActive: boolean;
    createdAt: string;
}

export interface SalaryStructureComponent {
    id: string;
    componentId: string;
    component?: {
        id: string;
        name: string;
        type: 'EARNING' | 'DEDUCTION';
    };
    value: number;
    isPercentage: boolean;
}

export interface CreateSalaryStructureDto {
    name: string;
    description?: string;
    baseSalary: number;
    components?: { componentId: string; value: number; isPercentage: boolean }[];
}

class SalaryStructuresService {
    private readonly basePath = '/salary-structures';

    async getAll(): Promise<SalaryStructure[]> {
        const response = await api.get(this.basePath) as SalaryStructure[] | { data: SalaryStructure[] };
        return (response as any).data || response;
    }

    async getById(id: string): Promise<SalaryStructure> {
        const response = await api.get(`${this.basePath}/${id}`) as SalaryStructure | { data: SalaryStructure };
        return (response as any).data || response;
    }

    async create(data: CreateSalaryStructureDto): Promise<SalaryStructure> {
        const response = await api.post(this.basePath, data) as SalaryStructure | { data: SalaryStructure };
        return (response as any).data || response;
    }

    async update(id: string, data: Partial<CreateSalaryStructureDto>): Promise<SalaryStructure> {
        const response = await api.patch(`${this.basePath}/${id}`, data) as SalaryStructure | { data: SalaryStructure };
        return (response as any).data || response;
    }

    async delete(id: string): Promise<void> {
        await api.delete(`${this.basePath}/${id}`);
    }
}

export const salaryStructuresService = new SalaryStructuresService();
