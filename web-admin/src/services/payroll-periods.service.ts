/**
 * Payroll Periods API Service
 * فترات الرواتب
 */

import { api } from './api.service';

export type PeriodStatus = 'OPEN' | 'CLOSED' | 'LOCKED' | 'DRAFT';

export interface PayrollPeriod {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    paymentDate?: string;
    status: PeriodStatus;
    createdAt: string;
}

export interface CreatePayrollPeriodDto {
    name: string;
    startDate: string;
    endDate: string;
    paymentDate?: string;
}

export const periodStatusLabels: Record<PeriodStatus, string> = {
    OPEN: 'مفتوحة',
    CLOSED: 'مغلقة',
    LOCKED: 'مقفلة',
    DRAFT: 'مسودة',
};

export const periodStatusColors: Record<PeriodStatus, 'success' | 'warning' | 'error' | 'default'> = {
    OPEN: 'success',
    CLOSED: 'warning',
    LOCKED: 'error',
    DRAFT: 'default',
};

class PayrollPeriodsService {
    private readonly basePath = '/payroll-periods';

    async getAll(): Promise<PayrollPeriod[]> {
        const response = await api.get(this.basePath) as PayrollPeriod[] | { data: PayrollPeriod[] };
        return (response as any).data || response;
    }

    async getById(id: string): Promise<PayrollPeriod> {
        const response = await api.get(`${this.basePath}/${id}`) as PayrollPeriod | { data: PayrollPeriod };
        return (response as any).data || response;
    }

    async create(data: CreatePayrollPeriodDto): Promise<PayrollPeriod> {
        const response = await api.post(this.basePath, data) as PayrollPeriod | { data: PayrollPeriod };
        return (response as any).data || response;
    }

    async updateStatus(id: string, status: string): Promise<PayrollPeriod> {
        const response = await api.patch(`${this.basePath}/${id}/status`, { status }) as PayrollPeriod | { data: PayrollPeriod };
        return (response as any).data || response;
    }
}

export const payrollPeriodsService = new PayrollPeriodsService();
