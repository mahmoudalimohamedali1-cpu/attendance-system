/**
 * Company Config Service
 * API service for U-PEE configuration management
 */
import { api } from './api.service';

export interface CompanyConfig {
    id: string;
    companyId: string;
    companyType: string;
    philosophy: string;
    enabledModules: Record<string, boolean>;
    defaultWeights: Record<string, number>;
    policies: Record<string, any>;
    uiConfig: Record<string, any>;
}

export interface EvaluationTemplate {
    type: string;
    code: string;
    name: string;
    nameAr: string;
    modules: Record<string, boolean>;
    weights: Record<string, number>;
}

export interface JobFamily {
    id: string;
    companyId: string;
    code: string;
    name: string;
    nameAr?: string;
    moduleOverrides?: Record<string, boolean>;
    evidenceTypes?: string[];
    roleLevels?: RoleLevel[];
}

export interface RoleLevel {
    id: string;
    jobFamilyId: string;
    code: string;
    name: string;
    nameAr?: string;
    rank: number;
    isManager: boolean;
    weightOverrides?: Record<string, number>;
}

export const companyConfigService = {
    // ============ Company Config ============

    getConfig: async (companyId: string): Promise<CompanyConfig> => {
        const response = await api.get(`/company-config/${companyId}`);
        return response;
    },

    createConfig: async (data: {
        companyId: string;
        companyType?: string;
        philosophy?: string;
        enabledModules?: Record<string, boolean>;
        defaultWeights?: Record<string, number>;
        policies?: Record<string, any>;
        uiConfig?: Record<string, any>;
    }): Promise<CompanyConfig> => {
        const response = await api.post('/company-config', data);
        return response;
    },

    updateConfig: async (companyId: string, data: {
        companyType?: string;
        philosophy?: string;
        enabledModules?: Record<string, boolean>;
        defaultWeights?: Record<string, number>;
        policies?: Record<string, any>;
        uiConfig?: Record<string, any>;
    }): Promise<CompanyConfig> => {
        const response = await api.put(`/company-config/${companyId}`, data);
        return response;
    },

    applyTemplate: async (companyId: string, companyType: string): Promise<CompanyConfig> => {
        const response = await api.post(`/company-config/${companyId}/apply-template`, {
            companyType,
        });
        return response;
    },

    // ============ Templates ============

    getTemplates: async (): Promise<EvaluationTemplate[]> => {
        const response = await api.get('/company-config/templates/available');
        return response;
    },

    seedTemplates: async (): Promise<{ seeded: number; templates: any[] }> => {
        const response = await api.post('/company-config/templates/seed');
        return response;
    },

    // ============ Blueprint ============

    getBlueprint: async (companyId: string, employeeId: string, cycleId?: string) => {
        const params = cycleId ? `?cycleId=${cycleId}` : '';
        const response = await api.get(`/company-config/${companyId}/blueprint/${employeeId}${params}`);
        return response;
    },

    // ============ Job Families ============

    getJobFamilies: async (companyId: string): Promise<JobFamily[]> => {
        const response = await api.get(`/company-config/${companyId}/job-families`);
        return response;
    },

    createJobFamily: async (companyId: string, data: {
        code: string;
        name: string;
        nameAr?: string;
        moduleOverrides?: Record<string, boolean>;
        evidenceTypes?: string[];
    }): Promise<JobFamily> => {
        const response = await api.post(`/company-config/${companyId}/job-families`, data);
        return response;
    },

    // ============ Role Levels ============

    getRoleLevels: async (jobFamilyId: string): Promise<RoleLevel[]> => {
        const response = await api.get(`/company-config/job-families/${jobFamilyId}/role-levels`);
        return response;
    },

    createRoleLevel: async (jobFamilyId: string, data: {
        code: string;
        name: string;
        nameAr?: string;
        rank: number;
        isManager?: boolean;
        weightOverrides?: Record<string, number>;
    }): Promise<RoleLevel> => {
        const response = await api.post(`/company-config/job-families/${jobFamilyId}/role-levels`, data);
        return response;
    },
};

export default companyConfigService;
