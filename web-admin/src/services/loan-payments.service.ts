/**
 * Loan Payments API Service
 * أقساط السلف
 */

import { api } from './api.service';

export interface LoanPayment {
    id: string;
    advanceId: string;
    advance?: {
        id: string;
        user: {
            firstName: string;
            lastName: string;
            employeeCode: string;
        };
        amount: number;
    };
    amount: number;
    paymentDate: string;
    note?: string;
    createdBy?: string;
    createdAt: string;
}

export interface AdvanceSummary {
    advance: {
        id: string;
        amount: number;
        status: string;
        user: {
            firstName: string;
            lastName: string;
            employeeCode: string;
        };
    };
    totalPaid: number;
    remaining: number;
    payments: LoanPayment[];
}

export interface ActiveLoan {
    id: string;
    amount: number;
    user: {
        firstName: string;
        lastName: string;
        employeeCode: string;
    };
    totalPaid: number;
    remaining: number;
    status: string;
}

export interface CreateLoanPaymentDto {
    advanceId: string;
    amount: number;
    paymentDate: string;
    note?: string;
}

class LoanPaymentsService {
    private readonly basePath = '/loan-payments';

    async getByAdvance(advanceId: string): Promise<LoanPayment[]> {
        const response = await api.get(`${this.basePath}/advance/${advanceId}`) as LoanPayment[] | { data: LoanPayment[] };
        return (response as any).data || response;
    }

    async getSummary(advanceId: string): Promise<AdvanceSummary> {
        const response = await api.get(`${this.basePath}/summary/${advanceId}`) as AdvanceSummary | { data: AdvanceSummary };
        return (response as any).data || response;
    }

    async getActiveLoans(): Promise<ActiveLoan[]> {
        const response = await api.get(`${this.basePath}/active`) as ActiveLoan[] | { data: ActiveLoan[] };
        return (response as any).data || response;
    }

    async create(data: CreateLoanPaymentDto): Promise<LoanPayment> {
        const response = await api.post(this.basePath, data) as LoanPayment | { data: LoanPayment };
        return (response as any).data || response;
    }

    async delete(id: string): Promise<void> {
        await api.delete(`${this.basePath}/${id}`);
    }
}

export const loanPaymentsService = new LoanPaymentsService();
