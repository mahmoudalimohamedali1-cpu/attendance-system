/**
 * Exceptions Center API Service
 * مركز الاستثناءات - فحص مشاكل الرواتب
 */

import { api } from './api.service';

export type ExceptionType = 'MISSING_BANK' | 'INVALID_IBAN' | 'MISSING_SALARY' | 'NEGATIVE_NET' | 'MISSING_CONTRACT' | 'EXPIRED_CONTRACT';
export type ExceptionSeverity = 'ERROR' | 'WARNING';

export interface PayrollException {
    type: ExceptionType;
    severity: ExceptionSeverity;
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    message: string;
    details?: any;
}

export interface ExceptionsSummary {
    totalEmployees: number;
    employeesWithIssues: number;
    errorCount: number;
    warningCount: number;
    exceptions: PayrollException[];
    byType: { type: string; count: number }[];
}

export interface QuickStats {
    missingBank: number;
    missingSalary: number;
    expiringContracts: number;
    totalIssues: number;
}

// Exception Type Labels
export const exceptionTypeLabels: Record<ExceptionType, string> = {
    MISSING_BANK: 'لا يوجد حساب بنكي',
    INVALID_IBAN: 'IBAN غير صحيح',
    MISSING_SALARY: 'لا يوجد هيكل راتب',
    NEGATIVE_NET: 'صافي سالب',
    MISSING_CONTRACT: 'لا يوجد عقد نشط',
    EXPIRED_CONTRACT: 'عقد قريب الانتهاء',
};

// Severity Colors
export const severityColors: Record<ExceptionSeverity, 'error' | 'warning'> = {
    ERROR: 'error',
    WARNING: 'warning',
};

class ExceptionsService {
    private readonly basePath = '/exceptions';

    async validateEmployees(): Promise<ExceptionsSummary> {
        const response = await api.get(`${this.basePath}/validate`) as ExceptionsSummary | { data: ExceptionsSummary };
        return (response as any).data || response;
    }

    async validatePayrollRun(payrollRunId: string): Promise<ExceptionsSummary> {
        const response = await api.get(`${this.basePath}/validate/${payrollRunId}`) as ExceptionsSummary | { data: ExceptionsSummary };
        return (response as any).data || response;
    }

    async getQuickStats(): Promise<QuickStats> {
        const response = await api.get(`${this.basePath}/stats`) as QuickStats | { data: QuickStats };
        return (response as any).data || response;
    }
}

export const exceptionsService = new ExceptionsService();
