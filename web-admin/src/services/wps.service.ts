/**
 * WPS Export API Service
 * تصدير ملفات WPS للبنوك
 */

import { api, API_URL } from './api.service';

export interface WpsValidation {
    isReady: boolean;
    errors: string[];
    warnings: string[];
    employeesReady: number;
    employeesWithIssues: number;
}

export interface WpsSummary {
    filename: string;
    recordCount: number;
    totalAmount: number;
    errors: string[];
}

export interface EmployeeWithoutBank {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
}

class WpsExportService {
    private readonly basePath = '/wps-export';

    async validate(payrollRunId: string): Promise<WpsValidation> {
        const response = await api.get(`${this.basePath}/${payrollRunId}/validate`) as WpsValidation | { data: WpsValidation };
        return (response as any).data || response;
    }

    async getSummary(payrollRunId: string): Promise<WpsSummary> {
        const response = await api.get(`${this.basePath}/${payrollRunId}/summary`) as WpsSummary | { data: WpsSummary };
        return (response as any).data || response;
    }

    downloadCsv(payrollRunId: string): string {
        const token = localStorage.getItem('access_token');
        return `${API_URL}${this.basePath}/${payrollRunId}/csv?token=${token}`;
    }

    downloadSarie(payrollRunId: string): string {
        const token = localStorage.getItem('access_token');
        return `${API_URL}${this.basePath}/${payrollRunId}/sarie?token=${token}`;
    }

    async getEmployeesWithoutBank(): Promise<EmployeeWithoutBank[]> {
        const response = await api.get(`${this.basePath}/missing-bank`) as EmployeeWithoutBank[] | { data: EmployeeWithoutBank[] };
        return (response as any).data || response;
    }
}

export const wpsExportService = new WpsExportService();
