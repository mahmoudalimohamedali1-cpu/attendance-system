/**
 * GOSI (Social Insurance) API Service
 * التأمينات الاجتماعية
 */

import { api } from './api.service';

export interface GosiConfig {
    id: string;
    employeePercentage: number;
    employerPercentage: number;
    maxSalary: number;
    effectiveFrom: string;
    isActive: boolean;
    createdAt: string;
}

export interface CreateGosiConfigDto {
    employeePercentage: number;
    employerPercentage: number;
    maxSalary: number;
    effectiveFrom: string;
}

class GosiService {
    private readonly basePath = '/gosi';

    async getActiveConfig(): Promise<GosiConfig | null> {
        try {
            const response = await api.get(`${this.basePath}/config/active`) as GosiConfig | { data: GosiConfig };
            return (response as any).data || response;
        } catch {
            return null;
        }
    }

    async getAll(): Promise<GosiConfig[]> {
        const response = await api.get(`${this.basePath}/configs`) as GosiConfig[] | { data: GosiConfig[] };
        return (response as any).data || response;
    }

    async create(data: CreateGosiConfigDto): Promise<GosiConfig> {
        const response = await api.post(`${this.basePath}/config`, data) as GosiConfig | { data: GosiConfig };
        return (response as any).data || response;
    }

    async update(id: string, data: Partial<CreateGosiConfigDto>): Promise<GosiConfig> {
        const response = await api.patch(`${this.basePath}/config/${id}`, data) as GosiConfig | { data: GosiConfig };
        return (response as any).data || response;
    }
}

export const gosiService = new GosiService();
