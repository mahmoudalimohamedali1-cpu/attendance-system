/**
 * QIWA API Service
 * خدمة التكامل مع منصة قوى
 */

import { api } from './api.service';

// Saudization Interfaces
export interface SaudizationRatio {
    totalEmployees: number;
    saudiEmployees: number;
    nonSaudiEmployees: number;
    saudizationRatio: number;
    targetRatio: number;
    deficitCount: number;
    isCompliant: boolean;
}

export interface BranchSaudization {
    branchId: string;
    branchName: string;
    totalEmployees: number;
    saudiEmployees: number;
    ratio: number;
    isCompliant: boolean;
}

export interface DepartmentSaudization {
    departmentId: string;
    departmentName: string;
    branchId?: string;
    branchName?: string;
    totalEmployees: number;
    saudiEmployees: number;
    ratio: number;
    isCompliant: boolean;
}

// Compliance Warning Interfaces
export type WarningLevel = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
export type WarningType =
    | 'CONTRACT_EXPIRING_SOON'
    | 'CONTRACT_NOT_REGISTERED'
    | 'CONTRACT_PENDING_TOO_LONG'
    | 'CONTRACT_REJECTED'
    | 'SAUDIZATION_BELOW_THRESHOLD';

export interface ComplianceWarning {
    id: string;
    type: WarningType;
    severity: WarningLevel;
    title: string;
    message: string;
    affectedCount: number;
    affectedContracts?: string[];
    actionRequired: string;
    metadata?: Record<string, any>;
    createdAt: string;
}

// Contract Sync Interfaces
export interface PendingSyncContract {
    id: string;
    contractNumber?: string;
    userId: string;
    user?: {
        firstName: string;
        lastName: string;
        employeeCode: string;
    };
    type: string;
    status: string;
    qiwaStatus?: string;
    startDate: string;
    endDate?: string;
}

export interface RegisterContractResponse {
    success: boolean;
    message: string;
    qiwaContractId?: string;
    qiwaStatus: string;
}

export interface SyncContractResponse {
    success: boolean;
    message: string;
    qiwaStatus: string;
    updatedAt: string;
}

// Warning Level Labels (Arabic)
export const warningLevelLabels: Record<WarningLevel, string> = {
    INFO: 'معلومات',
    WARNING: 'تحذير',
    ERROR: 'خطأ',
    CRITICAL: 'حرج',
};

// Warning Level Colors
export const warningLevelColors: Record<WarningLevel, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'error',
};

// Warning Type Labels (Arabic)
export const warningTypeLabels: Record<WarningType, string> = {
    CONTRACT_EXPIRING_SOON: 'عقد ينتهي قريبًا',
    CONTRACT_NOT_REGISTERED: 'عقد غير مسجل في قوى',
    CONTRACT_PENDING_TOO_LONG: 'عقد معلق في الانتظار',
    CONTRACT_REJECTED: 'عقد مرفوض',
    SAUDIZATION_BELOW_THRESHOLD: 'نسبة السعودة أقل من الحد المطلوب',
};

class QiwaService {
    private readonly basePath = '/qiwa';

    // Saudization Methods
    async getSaudizationRatio(targetRatio?: number): Promise<SaudizationRatio> {
        let url = `${this.basePath}/saudization/ratio`;
        if (targetRatio) {
            url += `?targetRatio=${targetRatio}`;
        }
        const response = await api.get(url) as { data: SaudizationRatio } | SaudizationRatio;
        return (response as any).data || response;
    }

    async getSaudizationByBranch(targetRatio?: number): Promise<BranchSaudization[]> {
        let url = `${this.basePath}/saudization/by-branch`;
        if (targetRatio) {
            url += `?targetRatio=${targetRatio}`;
        }
        const response = await api.get(url) as { data: BranchSaudization[] } | BranchSaudization[];
        return (response as any).data || response;
    }

    async getSaudizationByDepartment(branchId?: string, targetRatio?: number): Promise<DepartmentSaudization[]> {
        let url = `${this.basePath}/saudization/by-department`;
        const params = new URLSearchParams();
        if (branchId) params.append('branchId', branchId);
        if (targetRatio) params.append('targetRatio', targetRatio.toString());
        if (params.toString()) url += `?${params.toString()}`;

        const response = await api.get(url) as { data: DepartmentSaudization[] } | DepartmentSaudization[];
        return (response as any).data || response;
    }

    async getBranchSaudization(branchId: string, targetRatio?: number): Promise<BranchSaudization> {
        let url = `${this.basePath}/saudization/branch/${branchId}`;
        if (targetRatio) {
            url += `?targetRatio=${targetRatio}`;
        }
        const response = await api.get(url) as { data: BranchSaudization } | BranchSaudization;
        return (response as any).data || response;
    }

    async getDepartmentSaudization(departmentId: string, targetRatio?: number): Promise<DepartmentSaudization> {
        let url = `${this.basePath}/saudization/department/${departmentId}`;
        if (targetRatio) {
            url += `?targetRatio=${targetRatio}`;
        }
        const response = await api.get(url) as { data: DepartmentSaudization } | DepartmentSaudization;
        return (response as any).data || response;
    }

    // Compliance Methods
    async getComplianceWarnings(): Promise<ComplianceWarning[]> {
        const response = await api.get(`${this.basePath}/compliance/warnings`) as { data: ComplianceWarning[] } | ComplianceWarning[];
        return (response as any).data || response;
    }

    // Contract Methods
    async getPendingSync(): Promise<PendingSyncContract[]> {
        const response = await api.get(`${this.basePath}/contracts/pending-sync`) as { data: PendingSyncContract[] } | PendingSyncContract[];
        return (response as any).data || response;
    }

    async registerContract(contractId: string): Promise<RegisterContractResponse> {
        const response = await api.post(`${this.basePath}/contracts/register/${contractId}`) as { data: RegisterContractResponse } | RegisterContractResponse;
        return (response as any).data || response;
    }

    async syncContractStatus(contractId: string): Promise<SyncContractResponse> {
        const response = await api.post(`${this.basePath}/contracts/sync/${contractId}`) as { data: SyncContractResponse } | SyncContractResponse;
        return (response as any).data || response;
    }

    // Utility Methods
    getWarningsByLevel(warnings: ComplianceWarning[], level: WarningLevel): ComplianceWarning[] {
        return warnings.filter(w => w.severity === level);
    }

    getWarningsByType(warnings: ComplianceWarning[], type: WarningType): ComplianceWarning[] {
        return warnings.filter(w => w.type === type);
    }

    getCriticalWarningsCount(warnings: ComplianceWarning[]): number {
        return warnings.filter(w => w.severity === 'CRITICAL' || w.severity === 'ERROR').length;
    }

    getTotalAffectedContracts(warnings: ComplianceWarning[]): number {
        const contractIds = new Set<string>();
        warnings.forEach(warning => {
            if (warning.affectedContracts) {
                warning.affectedContracts.forEach(contractId => {
                    contractIds.add(contractId);
                });
            }
        });
        return contractIds.size;
    }

    // Saudization Utility Methods
    getSaudizationStatusColor(ratio: number, targetRatio: number): 'success' | 'error' | 'warning' | 'info' {
        if (ratio >= targetRatio) return 'success';
        if (ratio >= targetRatio - 5) return 'warning';
        return 'error';
    }

    getSaudizationStatusText(ratio: number, targetRatio: number): string {
        if (ratio >= targetRatio) return 'متوافق ✓';
        if (ratio >= targetRatio - 5) return 'قريب من الحد المطلوب';
        if (ratio >= targetRatio - 10) return 'أقل من المطلوب';
        return 'غير متوافق';
    }

    formatRatio(ratio: number): string {
        return `${ratio.toFixed(2)}%`;
    }
}

export const qiwaService = new QiwaService();
