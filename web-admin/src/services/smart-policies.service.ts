import { api } from './api.service';

// أنواع السياسة الذكية
export interface SmartPolicy {
    id: string;
    companyId: string;
    originalText: string;
    name: string | null;
    description: string | null;
    triggerEvent: SmartPolicyTrigger;
    triggerSubEvent: string | null;
    parsedRule: ParsedPolicyRule;
    conditions: any[];
    actions: any[];
    scopeType: string;
    scopeId: string | null;
    scopeName: string | null;
    status: SmartPolicyStatus;
    isActive: boolean;
    priority: number;
    effectiveFrom: string | null;
    effectiveTo: string | null;
    aiExplanation: string | null;
    clarificationNeeded: string | null;
    executionCount: number;
    lastExecutedAt: string | null;
    totalAmountPaid: number;
    totalAmountDeduct: number;
    createdById: string | null;
    approvedById: string | null;
    approvedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export type SmartPolicyTrigger =
    | 'ATTENDANCE'
    | 'LEAVE'
    | 'CUSTODY'
    | 'PAYROLL'
    | 'ANNIVERSARY'
    | 'CONTRACT'
    | 'DISCIPLINARY'
    | 'PERFORMANCE'
    | 'CUSTOM';

export type SmartPolicyStatus =
    | 'DRAFT'
    | 'PENDING'
    | 'ACTIVE'
    | 'PAUSED'
    | 'ARCHIVED';

export interface ParsedPolicyRule {
    understood: boolean;
    trigger: {
        event: string;
        subEvent?: string;
    };
    conditions: Array<{
        field: string;
        operator: string;
        value: any;
        aggregation?: string;
        period?: string;
    }>;
    actions: Array<{
        type: string;
        valueType?: string;
        value?: number | string;
        componentCode?: string;
        message?: string;
    }>;
    scope: {
        type: string;
        targetId?: string;
        targetName?: string;
    };
    explanation: string;
    clarificationNeeded?: string;
}

export interface CreateSmartPolicyDto {
    originalText: string;
    name?: string;
    effectiveFrom?: string;
    effectiveTo?: string;
}

export interface UpdateSmartPolicyDto {
    name?: string;
    status?: SmartPolicyStatus;
    isActive?: boolean;
    priority?: number;
    effectiveFrom?: string;
    effectiveTo?: string;
}

export interface SmartPolicyListResponse {
    data: SmartPolicy[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface SmartPolicyStatsResponse {
    success: boolean;
    data: {
        total: number;
        active: number;
        draft: number;
        paused: number;
    };
}

class SmartPoliciesService {
    private readonly baseUrl = '/smart-policies';

    /**
     * تحليل نص السياسة بالذكاء الاصطناعي (معاينة فقط)
     */
    async analyzePolicy(text: string): Promise<{ success: boolean; parsedRule: ParsedPolicyRule }> {
        return await api.post(`${this.baseUrl}/analyze`, { text });
    }

    /**
     * إنشاء سياسة ذكية جديدة
     */
    async create(dto: CreateSmartPolicyDto): Promise<{ success: boolean; data: SmartPolicy }> {
        return await api.post(this.baseUrl, dto);
    }

    /**
     * الحصول على قائمة السياسات
     */
    async getAll(params?: {
        status?: SmartPolicyStatus;
        triggerEvent?: SmartPolicyTrigger;
        isActive?: boolean;
        page?: number;
        limit?: number;
    }): Promise<SmartPolicyListResponse> {
        return await api.get(this.baseUrl, { params });
    }

    /**
     * الحصول على سياسة بالمعرف
     */
    async getById(id: string): Promise<{ success: boolean; data: SmartPolicy }> {
        return await api.get(`${this.baseUrl}/${id}`);
    }

    /**
     * تحديث سياسة
     */
    async update(id: string, dto: UpdateSmartPolicyDto): Promise<{ success: boolean; data: SmartPolicy }> {
        return await api.patch(`${this.baseUrl}/${id}`, dto);
    }

    /**
     * حذف سياسة
     */
    async delete(id: string): Promise<{ success: boolean; message: string }> {
        return await api.delete(`${this.baseUrl}/${id}`);
    }

    /**
     * تفعيل سياسة
     */
    async activate(id: string): Promise<{ success: boolean; data: SmartPolicy; message: string }> {
        return await api.post(`${this.baseUrl}/${id}/activate`);
    }

    /**
     * إيقاف سياسة
     */
    async deactivate(id: string): Promise<{ success: boolean; data: SmartPolicy; message: string }> {
        return await api.post(`${this.baseUrl}/${id}/deactivate`);
    }

    /**
     * إحصائيات السياسات
     */
    async getStats(): Promise<SmartPolicyStatsResponse> {
        return await api.get(`${this.baseUrl}/stats/overview`);
    }
}

export const smartPoliciesService = new SmartPoliciesService();
