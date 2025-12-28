/**
 * My Payslips Service (Employee Self-Service)
 * خدمة كشوفات الراتب للموظف
 */

import { api } from './api.service';

export interface MyPayslipItem {
    id: string;
    month: number;
    year: number;
    periodLabel: string;
    baseSalary: number;
    grossSalary: number;
    totalDeductions: number;
    netSalary: number;
    status: string;
    earnings: Array<{
        name: string;
        amount: number;
        description?: string;
    }>;
    deductions: Array<{
        name: string;
        amount: number;
        description?: string;
    }>;
}

class MyPayslipsService {
    private readonly basePath = '/payslips';

    async getMyPayslips(): Promise<MyPayslipItem[]> {
        const response = await api.get(`${this.basePath}/my`) as MyPayslipItem[] | { data: MyPayslipItem[] };
        return (response as any).data || response;
    }

    getPayslipPdfUrl(id: string): string {
        return `${import.meta.env.VITE_API_URL || ''}${this.basePath}/${id}/pdf`;
    }
}

export const myPayslipsService = new MyPayslipsService();
