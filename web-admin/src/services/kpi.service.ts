/**
 * KPI Service - Frontend API
 * Interacts with KPI Engine backend endpoints
 */
import { api } from './api.service';

// Types
export interface KPIDefinition {
    id: string;
    companyId: string;
    jobFamilyId?: string;
    code: string;
    name: string;
    nameAr?: string;
    description?: string;
    unit: string;
    formula?: Record<string, any>;
    thresholds: {
        exceptional: number;
        exceeds: number;
        meets: number;
        partial: number;
    };
    sourceType: 'MANUAL' | 'SYSTEM_SYNC' | 'API_IMPORT' | 'CSV_IMPORT';
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    minValue?: number;
    maxValue?: number;
    targetValue?: number;
    isActive: boolean;
    jobFamily?: { id: string; name: string; nameAr?: string };
    _count?: { assignments: number };
}

export interface KPIAssignment {
    id: string;
    cycleId: string;
    employeeId: string;
    kpiDefinitionId: string;
    target: number;
    weight: number;
    actualValue?: number;
    score?: number;
    notes?: string;
    kpiDefinition?: KPIDefinition;
    employee?: {
        id: string;
        firstName: string;
        lastName: string;
        employeeCode?: string;
        avatar?: string;
        department?: { id: string; name: string };
    };
    cycle?: {
        id: string;
        name: string;
        startDate: string;
        endDate: string;
    };
    _count?: { entries: number };
}

export interface KPIEntry {
    id: string;
    assignmentId: string;
    periodStart: string;
    periodEnd: string;
    value: number;
    source?: string;
    notes?: string;
    createdBy: string;
    createdAt: string;
}

export interface KPISummary {
    employeeId: string;
    totalKPIs: number;
    assignmentsWithScores: number;
    averageScore: number;
    ratingBand: string;
    assignments: KPIAssignment[];
}

export interface CycleOverview {
    cycleId: string;
    totalAssignments: number;
    assignmentsWithScores: number;
    averageScore: number;
    byDepartment: { department: string; count: number; avgScore: number }[];
    byKPI: { kpi: string; count: number; avgScore: number }[];
}

// Service
export const kpiService = {
    // ============ KPI Definitions ============

    getDefinitions: async (companyId: string, filters?: {
        jobFamilyId?: string;
        isActive?: boolean;
        sourceType?: string;
        frequency?: string;
    }): Promise<KPIDefinition[]> => {
        const params = new URLSearchParams();
        if (filters?.jobFamilyId) params.append('jobFamilyId', filters.jobFamilyId);
        if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
        if (filters?.sourceType) params.append('sourceType', filters.sourceType);
        if (filters?.frequency) params.append('frequency', filters.frequency);

        const query = params.toString() ? `?${params.toString()}` : '';
        return api.get(`/kpi/definitions/${companyId}${query}`);
    },

    getDefinitionById: async (id: string): Promise<KPIDefinition> => {
        return api.get(`/kpi/definitions/detail/${id}`);
    },

    createDefinition: async (data: {
        companyId: string;
        jobFamilyId?: string;
        code: string;
        name: string;
        nameAr?: string;
        description?: string;
        unit: string;
        formula?: Record<string, any>;
        thresholds: { exceptional: number; exceeds: number; meets: number; partial: number };
        sourceType?: string;
        frequency?: string;
        minValue?: number;
        maxValue?: number;
        targetValue?: number;
    }): Promise<KPIDefinition> => {
        return api.post('/kpi/definitions', data);
    },

    updateDefinition: async (id: string, data: Partial<Omit<KPIDefinition, 'id'>>): Promise<KPIDefinition> => {
        return api.put(`/kpi/definitions/${id}`, data);
    },

    deleteDefinition: async (id: string): Promise<void> => {
        return api.delete(`/kpi/definitions/${id}`);
    },

    seedDefaultKPIs: async (companyId: string): Promise<{ seeded: number; kpis: KPIDefinition[] }> => {
        return api.post(`/kpi/definitions/seed/${companyId}`);
    },

    // ============ KPI Assignments ============

    getAssignments: async (filters?: {
        cycleId?: string;
        employeeId?: string;
        kpiDefinitionId?: string;
    }): Promise<KPIAssignment[]> => {
        const params = new URLSearchParams();
        if (filters?.cycleId) params.append('cycleId', filters.cycleId);
        if (filters?.employeeId) params.append('employeeId', filters.employeeId);
        if (filters?.kpiDefinitionId) params.append('kpiDefinitionId', filters.kpiDefinitionId);

        const query = params.toString() ? `?${params.toString()}` : '';
        return api.get(`/kpi/assignments${query}`);
    },

    getAssignmentById: async (id: string): Promise<KPIAssignment> => {
        return api.get(`/kpi/assignments/${id}`);
    },

    createAssignment: async (data: {
        cycleId: string;
        employeeId: string;
        kpiDefinitionId: string;
        target: number;
        weight?: number;
        notes?: string;
    }): Promise<KPIAssignment> => {
        return api.post('/kpi/assignments', data);
    },

    bulkCreateAssignments: async (data: {
        cycleId: string;
        employeeIds: string[];
        kpiDefinitionId: string;
        target: number;
        weight?: number;
    }): Promise<{ created: number; failed: number; results: KPIAssignment[]; errors: any[] }> => {
        return api.post('/kpi/assignments/bulk', data);
    },

    updateAssignment: async (id: string, data: {
        target?: number;
        weight?: number;
        notes?: string;
    }): Promise<KPIAssignment> => {
        return api.put(`/kpi/assignments/${id}`, data);
    },

    deleteAssignment: async (id: string): Promise<void> => {
        return api.delete(`/kpi/assignments/${id}`);
    },

    // ============ KPI Entries ============

    getEntries: async (assignmentId: string): Promise<KPIEntry[]> => {
        return api.get(`/kpi/entries/${assignmentId}`);
    },

    createEntry: async (data: {
        assignmentId: string;
        periodStart: string;
        periodEnd: string;
        value: number;
        source?: string;
        notes?: string;
    }): Promise<KPIEntry> => {
        return api.post('/kpi/entries', data);
    },

    bulkCreateEntries: async (entries: {
        assignmentId: string;
        periodStart: string;
        periodEnd: string;
        value: number;
        source?: string;
        notes?: string;
    }[]): Promise<{ created: number; failed: number; results: KPIEntry[]; errors: any[] }> => {
        return api.post('/kpi/entries/bulk', { entries });
    },

    importEntries: async (data: {
        cycleId: string;
        data: {
            employeeCode?: string;
            employeeId?: string;
            kpiCode: string;
            periodStart: string;
            periodEnd: string;
            value: number;
        }[];
    }): Promise<{ imported: number; failed: number; results: KPIEntry[]; errors: any[] }> => {
        return api.post('/kpi/entries/import', data);
    },

    deleteEntry: async (id: string): Promise<void> => {
        return api.delete(`/kpi/entries/${id}`);
    },

    // ============ Score Calculation ============

    calculateScore: async (assignmentId: string): Promise<{
        actualValue: number;
        score: number;
        ratingBand: string;
    }> => {
        return api.post(`/kpi/calculate/${assignmentId}`);
    },

    recalculateAllScores: async (cycleId: string, employeeId?: string): Promise<{
        recalculated: number;
        results: { assignmentId: string; actualValue: number; score: number; ratingBand: string }[];
    }> => {
        return api.post('/kpi/recalculate-all', { cycleId, employeeId });
    },

    // ============ Analytics ============

    getEmployeeSummary: async (employeeId: string, cycleId?: string): Promise<KPISummary> => {
        const query = cycleId ? `?cycleId=${cycleId}` : '';
        return api.get(`/kpi/summary/employee/${employeeId}${query}`);
    },

    getCycleOverview: async (cycleId: string): Promise<CycleOverview> => {
        return api.get(`/kpi/overview/cycle/${cycleId}`);
    },
};

export default kpiService;
