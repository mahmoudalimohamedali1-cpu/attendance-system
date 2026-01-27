/**
 * Exceptions Center API Service
 * مركز الاستثناءات - فحص الامتثال لقانون العمل السعودي
 */

import { api } from './api.service';

// =====================================================
// أنواع الاستثناءات حسب قانون العمل السعودي
// =====================================================

export type ExceptionCategory = 'WPS' | 'CONTRACT' | 'IDENTITY' | 'SALARY' | 'GOSI' | 'NITAQAT';

export type ExceptionType =
    | 'MISSING_BANK'
    | 'INVALID_IBAN'
    | 'UNVERIFIED_BANK'
    | 'BANK_NAME_MISMATCH'
    | 'MISSING_CONTRACT'
    | 'EXPIRED_CONTRACT'
    | 'EXPIRING_CONTRACT_30'
    | 'EXPIRING_CONTRACT_60'
    | 'MISSING_CONTRACT_DATES'
    | 'MISSING_NATIONAL_ID'
    | 'EXPIRED_IQAMA'
    | 'EXPIRING_IQAMA_60'
    | 'EXPIRING_IQAMA_30'
    | 'MISSING_SALARY'
    | 'NEGATIVE_NET'
    | 'BELOW_MINIMUM_SAUDI'
    | 'SALARY_MISMATCH'
    | 'MISSING_GOSI_NUMBER'
    | 'HALF_COUNTED_SAUDI';

export type ExceptionSeverity = 'ERROR' | 'WARNING' | 'INFO';

export interface PayrollException {
    type: ExceptionType;
    category: ExceptionCategory;
    severity: ExceptionSeverity;
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    message: string;
    details?: any;
    actionUrl?: string;
}

export interface CategoryStats {
    category: ExceptionCategory;
    categoryLabel: string;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    total: number;
}

export interface ExceptionsSummary {
    totalEmployees: number;
    employeesWithIssues: number;
    complianceRate: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    exceptions: PayrollException[];
    byType: { type: string; count: number }[];
    byCategory: CategoryStats[];
    lastChecked: string;
}

export interface QuickStats {
    missingBank: number;
    missingSalary: number;
    missingContract: number;
    missingNationalId: number;
    expiringContracts: number;
    expiringIqama: number;
    totalErrors: number;
    totalWarnings: number;
    complianceRate: number;
}

// =====================================================
// تسميات عربية
// =====================================================

export const categoryLabels: Record<ExceptionCategory, string> = {
    WPS: 'حماية الأجور (WPS)',
    CONTRACT: 'العقود',
    IDENTITY: 'الهوية والإقامة',
    SALARY: 'الراتب',
    GOSI: 'التأمينات (GOSI)',
    NITAQAT: 'نطاقات',
};

export const categoryIcons: Record<ExceptionCategory, string> = {
    WPS: '🏦',
    CONTRACT: '📄',
    IDENTITY: '🪪',
    SALARY: '💰',
    GOSI: '🛡️',
    NITAQAT: '📊',
};

export const categoryColors: Record<ExceptionCategory, string> = {
    WPS: '#1976d2',
    CONTRACT: '#9c27b0',
    IDENTITY: '#ed6c02',
    SALARY: '#2e7d32',
    GOSI: '#0288d1',
    NITAQAT: '#d32f2f',
};

export const exceptionTypeLabels: Record<ExceptionType, string> = {
    MISSING_BANK: 'لا يوجد حساب بنكي',
    INVALID_IBAN: 'IBAN غير صحيح',
    UNVERIFIED_BANK: 'حساب غير موثق',
    BANK_NAME_MISMATCH: 'اسم الحساب لا يطابق',
    MISSING_CONTRACT: 'لا يوجد عقد',
    EXPIRED_CONTRACT: 'عقد منتهي',
    EXPIRING_CONTRACT_30: 'عقد ينتهي قريباً',
    EXPIRING_CONTRACT_60: 'عقد ينتهي خلال شهرين',
    MISSING_CONTRACT_DATES: 'تواريخ العقد ناقصة',
    MISSING_NATIONAL_ID: 'لا يوجد رقم هوية',
    EXPIRED_IQAMA: 'إقامة منتهية',
    EXPIRING_IQAMA_60: 'إقامة تنتهي قريباً',
    EXPIRING_IQAMA_30: 'إقامة تنتهي خلال شهر',
    MISSING_SALARY: 'لا يوجد هيكل راتب',
    NEGATIVE_NET: 'صافي سالب',
    BELOW_MINIMUM_SAUDI: 'راتب أقل من الحد',
    SALARY_MISMATCH: 'راتب لا يطابق العقد',
    MISSING_GOSI_NUMBER: 'غير مسجل GOSI',
    HALF_COUNTED_SAUDI: 'يحتسب نصف نطاقات',
};

export const severityColors: Record<ExceptionSeverity, 'error' | 'warning' | 'info'> = {
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
};

export const severityLabels: Record<ExceptionSeverity, string> = {
    ERROR: 'خطأ',
    WARNING: 'تحذير',
    INFO: 'معلومة',
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
