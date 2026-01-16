/**
 * Contracts API Service
 * إدارة عقود الموظفين - متوافق مع قوى
 */

import { api } from './api.service';

export type ContractType = 'PERMANENT' | 'FIXED_TERM' | 'PART_TIME' | 'SEASONAL' | 'PROBATION';
export type ContractStatus = 'DRAFT' | 'PENDING_EMPLOYEE' | 'PENDING_EMPLOYER' | 'PENDING_QIWA' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'RENEWED' | 'SUSPENDED' | 'REJECTED';
export type QiwaAuthStatus = 'NOT_SUBMITTED' | 'PENDING' | 'AUTHENTICATED' | 'REJECTED' | 'EXPIRED';

export interface Contract {
    id: string;
    userId: string;
    user?: {
        id: string;
        firstName: string;
        lastName: string;
        employeeCode: string;
        nationalId?: string;
        iqamaNumber?: string;
        isSaudi?: boolean;
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
    // حقول الراتب - قوى
    basicSalary?: number;
    housingAllowance?: number;
    transportAllowance?: number;
    otherAllowances?: number;
    totalSalary?: number;
    // بيانات العمل
    contractJobTitle?: string;
    workLocation?: string;
    workingHoursPerWeek?: number;
    annualLeaveDays?: number;
    noticePeriodDays?: number;
    // التوقيعات
    employeeSignature?: boolean;
    employeeSignedAt?: string;
    employerSignature?: boolean;
    employerSignedAt?: string;
    signedByUserId?: string;
    // قوى
    qiwaContractId?: string;
    qiwaStatus?: QiwaAuthStatus;
    qiwaAuthDate?: string;
    qiwaRejectReason?: string;
    qiwaLastSync?: string;
    // ملاحظات
    additionalTerms?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ContractStats {
    total: number;
    byStatus: {
        draft: number;
        pendingEmployee: number;
        pendingEmployer: number;
        active: number;
        expired: number;
        terminated: number;
    };
    byQiwaStatus: {
        notSubmitted: number;
        pending: number;
        authenticated: number;
        rejected: number;
    };
    expiringSoon: number;
    byType: {
        permanent: number;
        fixedTerm: number;
        partTime: number;
    };
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
    basicSalary?: number;
    housingAllowance?: number;
    transportAllowance?: number;
    otherAllowances?: number;
    contractJobTitle?: string;
    workLocation?: string;
    workingHoursPerWeek?: number;
    annualLeaveDays?: number;
    noticePeriodDays?: number;
    additionalTerms?: string;
    notes?: string;
}

export interface UpdateContractDto extends Partial<CreateContractDto> {
    status?: ContractStatus;
    qiwaContractId?: string;
    qiwaStatus?: QiwaAuthStatus;
}

export interface TerminateContractDto {
    terminationReason: string;
}

export interface RenewContractDto {
    newEndDate: string;
    newType?: ContractType;
    newBasicSalary?: number;
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
    DRAFT: 'مسودة',
    PENDING_EMPLOYEE: 'بانتظار توقيع الموظف',
    PENDING_EMPLOYER: 'بانتظار توقيع صاحب العمل',
    PENDING_QIWA: 'بانتظار التوثيق في قوى',
    ACTIVE: 'ساري',
    EXPIRED: 'منتهي',
    TERMINATED: 'منهي',
    RENEWED: 'مجدد',
    SUSPENDED: 'موقوف',
    REJECTED: 'مرفوض',
};

// Qiwa Status Labels
export const qiwaStatusLabels: Record<QiwaAuthStatus, string> = {
    NOT_SUBMITTED: 'لم يرسل للتوثيق',
    PENDING: 'بانتظار التوثيق',
    AUTHENTICATED: 'موثق ✓',
    REJECTED: 'مرفوض',
    EXPIRED: 'منتهي التوثيق',
};

// Status Colors
export const contractStatusColors: Record<ContractStatus, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
    DRAFT: 'default',
    PENDING_EMPLOYEE: 'warning',
    PENDING_EMPLOYER: 'warning',
    PENDING_QIWA: 'info',
    ACTIVE: 'success',
    EXPIRED: 'error',
    TERMINATED: 'error',
    RENEWED: 'info',
    SUSPENDED: 'warning',
    REJECTED: 'error',
};

export const qiwaStatusColors: Record<QiwaAuthStatus, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
    NOT_SUBMITTED: 'default',
    PENDING: 'warning',
    AUTHENTICATED: 'success',
    REJECTED: 'error',
    EXPIRED: 'error',
};

class ContractsService {
    private readonly basePath = '/contracts';

    async getAll(filters?: { status?: string; qiwaStatus?: string }): Promise<Contract[]> {
        let url = this.basePath;
        if (filters) {
            const params = new URLSearchParams();
            if (filters.status) params.append('status', filters.status);
            if (filters.qiwaStatus) params.append('qiwaStatus', filters.qiwaStatus);
            if (params.toString()) url += `?${params.toString()}`;
        }
        const response = await api.get(url) as { data: Contract[] } | Contract[];
        return (response as any).data || response;
    }

    async getStats(): Promise<ContractStats> {
        const response = await api.get(`${this.basePath}/stats`) as { data: ContractStats } | ContractStats;
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

    async getExpiring(days: number = 30): Promise<Contract[]> {
        const response = await api.get(`${this.basePath}/expiring?days=${days}`) as { data: Contract[] } | Contract[];
        return (response as any).data || response;
    }

    async getPendingForEmployer(): Promise<Contract[]> {
        const response = await api.get(`${this.basePath}/pending-employer`) as { data: Contract[] } | Contract[];
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

    // ===== سير عمل التوقيع =====
    async sendToEmployee(id: string): Promise<Contract> {
        const response = await api.post(`${this.basePath}/${id}/send-to-employee`, {}) as { data: Contract } | Contract;
        return (response as any).data || response;
    }

    async employerSign(id: string): Promise<Contract> {
        const response = await api.post(`${this.basePath}/${id}/employer-sign`, {}) as { data: Contract } | Contract;
        return (response as any).data || response;
    }

    // ===== قوى =====
    async updateQiwaStatus(id: string, data: { qiwaContractId?: string; qiwaStatus: QiwaAuthStatus; rejectReason?: string }): Promise<Contract> {
        const response = await api.patch(`${this.basePath}/${id}/qiwa-status`, data) as { data: Contract } | Contract;
        return (response as any).data || response;
    }

    async registerToQiwa(id: string): Promise<Contract> {
        const response = await api.post(`/qiwa/contracts/register/${id}`, {}) as { data: Contract } | Contract;
        return (response as any).data || response;
    }

    async syncQiwaStatus(id: string): Promise<Contract> {
        const response = await api.post(`/qiwa/contracts/sync/${id}`, {}) as { data: Contract } | Contract;
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
}

export const contractsService = new ContractsService();
