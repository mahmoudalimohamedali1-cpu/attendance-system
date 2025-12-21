/**
 * Salary Components API Service
 * مكونات الراتب (بدلات/خصومات)
 */

import { api } from './api.service';

export type ComponentType = 'EARNING' | 'DEDUCTION';

export interface SalaryComponent {
    id: string;
    name: string;
    nameEn?: string;
    type: ComponentType;
    isFixed: boolean;
    defaultValue?: number;
    isPercentage: boolean;
    isTaxable: boolean;
    isGosiApplicable: boolean;
    isActive: boolean;
    createdAt: string;
}

export interface CreateSalaryComponentDto {
    name: string;
    nameEn?: string;
    type: ComponentType;
    isFixed: boolean;
    defaultValue?: number;
    isPercentage: boolean;
    isTaxable: boolean;
    isGosiApplicable: boolean;
}

export const componentTypeLabels: Record<ComponentType, string> = {
    EARNING: 'بدل (إضافة)',
    DEDUCTION: 'خصم',
};

class SalaryComponentsService {
    private readonly basePath = '/salary-components';

    async getAll(): Promise<SalaryComponent[]> {
        const response = await api.get(this.basePath) as SalaryComponent[] | { data: SalaryComponent[] };
        return (response as any).data || response;
    }

    async create(data: CreateSalaryComponentDto): Promise<SalaryComponent> {
        const response = await api.post(this.basePath, data) as SalaryComponent | { data: SalaryComponent };
        return (response as any).data || response;
    }

    async update(id: string, data: Partial<CreateSalaryComponentDto>): Promise<SalaryComponent> {
        const response = await api.patch(`${this.basePath}/${id}`, data) as SalaryComponent | { data: SalaryComponent };
        return (response as any).data || response;
    }

    async delete(id: string): Promise<void> {
        await api.delete(`${this.basePath}/${id}`);
    }
}

export const salaryComponentsService = new SalaryComponentsService();
