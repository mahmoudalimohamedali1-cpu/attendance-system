/**
 * Companies API Service (Super Admin Only)
 * إدارة الشركات
 */

import { api } from './api.service';

export interface Company {
    id: string;
    name: string;
    nameEn?: string;
    commercialRegistration?: string;
    vatNumber?: string;
    email?: string;
    phone?: string;
    address?: string;
    logo?: string;
    timezone?: string;
    isActive: boolean;
    createdAt: string;
    _count?: {
        users: number;
        branches: number;
    };
}

export interface CreateCompanyDto {
    name: string;
    nameEn?: string;
    commercialRegistration?: string;
    vatNumber?: string;
    email?: string;
    phone?: string;
    address?: string;
    timezone?: string;
}

class CompaniesService {
    private readonly basePath = '/companies';

    async getAll(): Promise<Company[]> {
        const response = await api.get(this.basePath) as Company[] | { data: Company[] };
        return (response as any).data || response;
    }

    async getById(id: string): Promise<Company> {
        const response = await api.get(`${this.basePath}/${id}`) as Company | { data: Company };
        return (response as any).data || response;
    }

    async create(data: CreateCompanyDto): Promise<Company> {
        const response = await api.post(this.basePath, data) as Company | { data: Company };
        return (response as any).data || response;
    }

    async update(id: string, data: Partial<CreateCompanyDto>): Promise<Company> {
        const response = await api.patch(`${this.basePath}/${id}`, data) as Company | { data: Company };
        return (response as any).data || response;
    }

    async delete(id: string): Promise<void> {
        await api.delete(`${this.basePath}/${id}`);
    }
}

export const companiesService = new CompaniesService();
