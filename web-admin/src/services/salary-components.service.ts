/**
 * Salary Components API Service
 * مكونات الراتب (بدلات/خصومات)
 * متوافق مع Backend Schema
 */

import { api } from './api.service';

export type ComponentType = 'EARNING' | 'DEDUCTION';
export type ComponentNature = 'FIXED' | 'VARIABLE' | 'FORMULA';

export interface SalaryComponent {
    id: string;
    code: string;
    nameAr: string;
    nameEn?: string;
    type: ComponentType;
    nature: ComponentNature;
    description?: string;
    gosiEligible: boolean;
    otEligible: boolean;
    taxable?: boolean;
    formula?: string;
    isActive: boolean;
    createdAt: string;
}

export interface CreateSalaryComponentDto {
    code: string;
    nameAr: string;
    nameEn?: string;
    type: ComponentType;
    nature: ComponentNature;
    description?: string;
    gosiEligible?: boolean;
    otEligible?: boolean;
    taxable?: boolean;
    formula?: string;
}

export const componentTypeLabels: Record<ComponentType, string> = {
    EARNING: 'بدل (إضافة)',
    DEDUCTION: 'خصم',
};

export const componentNatureLabels: Record<ComponentNature, string> = {
    FIXED: 'ثابت',
    VARIABLE: 'متغير',
    FORMULA: 'معادلة',
};

class SalaryComponentsService {
    private readonly basePath = '/salary-components';

    async getAll(): Promise<SalaryComponent[]> {
        const response = await api.get(this.basePath) as SalaryComponent[] | { data: SalaryComponent[] };
        return (response as any).data || response;
    }

    async getById(id: string): Promise<SalaryComponent> {
        const response = await api.get(`${this.basePath}/${id}`) as SalaryComponent | { data: SalaryComponent };
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
