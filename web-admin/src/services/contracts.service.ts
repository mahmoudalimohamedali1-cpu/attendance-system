/**
 * Contracts API Service
 * إدارة عقود الموظفين
 */

import { api } from './api.service';

export type ContractType = 'PERMANENT' | 'FIXED_TERM' | 'PART_TIME' | 'SEASONAL' | 'PROBATION';
export type ContractStatus = 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'RENEWED' | 'SUSPENDED';

export interface Contract {
    id: string;
    userId: string;
    user?: {
        id: string;
        firstName: string;
        lastName: string;
        employeeCode: string;
    };
    contractNumber?: string;
    type: ContractType;
    status: ContractStatus;
    startDate: string;
    endDate?: string;
    probationEndDate?: string;
    terminatedAt?: string;
    terminationReason?: string;
    terminatedBy?: string;
    renewalCount: number;
    previousContractId?: string;
    salaryCycle: string;
    documentUrl?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateContractDto {
    userId: string;
    contractNumber?: string;
    type: ContractType;
    startDate: string;
    endDate?: string;
    probationEndDate?: string;
    salaryCycle?: string;
    documentUrl?: string;
}

export interface UpdateContractDto extends Partial<CreateContractDto> {
    status?: ContractStatus;
}

export interface TerminateContractDto {
    terminationReason: string;
}

export interface RenewContractDto {
    newEndDate: string;
    newType?: ContractType;
}

// Contract Type Labels
export const contractTypeLabels: Record<ContractType, string> = {
    PERMANENT: 'عقد دائم',
    FIXED_TERM: 'عقد محدد المدة',
    PART_TIME: 'دوام جزئي',
    SEASONAL: 'موسمي',
    PROBATION: 'فترة تجربة',
};

// Contract Status Labels
export const contractStatusLabels: Record<ContractStatus, string> = {
    ACTIVE: 'ساري',
    EXPIRED: 'منتهي',
    TERMINATED: 'منهي',
    RENEWED: 'مجدد',
    SUSPENDED: 'موقوف',
};

// Status Colors
export const contractStatusColors: Record<ContractStatus, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
    ACTIVE: 'success',
    EXPIRED: 'error',
    TERMINATED: 'error',
    RENEWED: 'info',
    SUSPENDED: 'warning',
};

class ContractsService {
    private readonly basePath = '/contracts';

    async getAll(): Promise<Contract[]> {
        const response = await api.get(this.basePath) as { data: Contract[] } | Contract[];
        return (response as any).data || response;
    }

    async getByEmployee(userId: string): Promise<Contract[]> {
        const response = await api.get(`${this.basePath}/employee/${userId}`) as { data: Contract[] } | Contract[];
        return (response as any).data || response;
    }

    async getById(id: string): Promise<Contract> {
        const response = await api.get(`${this.basePath}/${id}`) as { data: Contract } | Contract;
        return (response as any).data || response;
    }

    async create(data: CreateContractDto): Promise<Contract> {
        const response = await api.post(this.basePath, data) as { data: Contract } | Contract;
        return (response as any).data || response;
    }

    async update(id: string, data: UpdateContractDto): Promise<Contract> {
        const response = await api.patch(`${this.basePath}/${id}`, data) as { data: Contract } | Contract;
        return (response as any).data || response;
    }

    async terminate(id: string, data: TerminateContractDto): Promise<Contract> {
        const response = await api.post(`${this.basePath}/${id}/terminate`, data) as { data: Contract } | Contract;
        return (response as any).data || response;
    }

    async renew(id: string, data: RenewContractDto): Promise<Contract> {
        const response = await api.post(`${this.basePath}/${id}/renew`, data) as { data: Contract } | Contract;
        return (response as any).data || response;
    }

    async delete(id: string): Promise<void> {
        await api.delete(`${this.basePath}/${id}`);
    }

    // Get expiring contracts (within 30 days)
    async getExpiring(): Promise<Contract[]> {
        const response = await api.get(`${this.basePath}/expiring`) as { data: Contract[] } | Contract[];
        return (response as any).data || response;
    }
}

export const contractsService = new ContractsService();
