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
    async analyzePolicy(text: string): Promise<{
        success: boolean;
        parsedRule: ParsedPolicyRule;
        feasibility?: any;
    }> {
        return await api.post(`${this.baseUrl}/analyze`, { text });
    }

    /**
     * 🧙 تحليل النص ذكياً للمعالج (Wizard)
     */
    async wizardAiParse(text: string): Promise<{
        success: boolean;
        data: { parsedRule: ParsedPolicyRule };
    }> {
        return await api.post(`${this.baseUrl}/wizard/ai-parse`, { text });
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

    /**
     * 🧠 تحليل السياسة واكتشاف الحقول الناقصة
     */
    async analyzeSchema(text: string): Promise<{
        success: boolean;
        canExecute: boolean;
        missingFields: Array<{ name: string; type: string; description: string; suggestedModel: string }>;
        suggestedModels: Array<{ name: string; fields: Array<{ name: string; type: string; description: string }> }>;
    }> {
        return await api.post(`${this.baseUrl}/analyze-schema`, { text });
    }

    /**
     * 🔥 توسيع النظام تلقائياً
     */
    async autoExtend(text: string, confirm: boolean = false): Promise<{
        success: boolean;
        needsExtension: boolean;
        extended?: boolean;
        addedModels?: string[];
        message: string;
        missingFields?: Array<{ name: string; type: string; description: string }>;
        suggestedModels?: Array<{ name: string; fields: Array<{ name: string; type: string }> }>;
    }> {
        return await api.post(`${this.baseUrl}/auto-extend`, { text, confirm });
    }

    // ============== Versioning APIs ==============

    /**
     * 📜 جلب تاريخ إصدارات السياسة
     */
    async getVersionHistory(policyId: string, params?: { page?: number; limit?: number }): Promise<{
        success: boolean;
        data: Array<{
            id: string;
            versionNumber: number;
            changedByName: string;
            changeReason: string;
            createdAt: string;
        }>;
        pagination: { page: number; limit: number; total: number; totalPages: number };
    }> {
        return await api.get(`${this.baseUrl}/${policyId}/versions`, { params });
    }

    /**
     * 🔄 استعادة إصدار سابق
     */
    async revertToVersion(policyId: string, version: number): Promise<{
        success: boolean;
        data: SmartPolicy;
        message: string;
    }> {
        return await api.post(`${this.baseUrl}/${policyId}/revert/${version}`);
    }

    // ============== Approval Workflow APIs ==============

    /**
     * 📋 جلب قائمة الموافقات المعلقة
     */
    async getApprovalQueue(): Promise<{
        success: boolean;
        data: Array<{
            id: string;
            policyId: string;
            policy: SmartPolicy;
            submittedByName: string;
            submittedAt: string;
            requiredLevel: 'HR' | 'CEO';
            notes?: string;
        }>;
        pagination: { page: number; limit: number; total: number; totalPages: number };
    }> {
        return await api.get(`${this.baseUrl}/approval-queue`);
    }

    /**
     * 📤 إرسال السياسة للموافقة
     */
    async submitForApproval(policyId: string, notes?: string): Promise<{
        success: boolean;
        message: string;
        approval: { id: string; requiredLevel: string };
    }> {
        return await api.post(`${this.baseUrl}/${policyId}/submit-for-approval`, { notes });
    }

    /**
     * ✅ الموافقة على السياسة
     */
    async approve(policyId: string, notes?: string, activateNow?: boolean): Promise<{
        success: boolean;
        message: string;
        policy: SmartPolicy;
    }> {
        return await api.post(`${this.baseUrl}/${policyId}/approve`, { notes, activateNow });
    }

    /**
     * ❌ رفض السياسة
     */
    async reject(policyId: string, reason: string): Promise<{
        success: boolean;
        message: string;
    }> {
        return await api.post(`${this.baseUrl}/${policyId}/reject`, { reason });
    }

    /**
     * 📋 جلب تاريخ الموافقات للسياسة
     */
    async getApprovalHistory(policyId: string): Promise<{
        success: boolean;
        data: Array<{
            id: string;
            action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
            actedByName: string;
            actedAt: string;
            notes?: string;
        }>;
    }> {
        return await api.get(`${this.baseUrl}/${policyId}/approvals`);
    }

    // ============== Simulation APIs ==============

    /**
     * 🧪 محاكاة السياسة
     */
    async simulate(policyId: string, period: string, employeeIds?: string[]): Promise<{
        success: boolean;
        id: string;
        summary: {
            totalEmployees: number;
            affectedEmployees: number;
            totalAdditions: number;
            totalDeductions: number;
            netImpact: number;
            executionTimeMs: number;
            warningsCount: number;
        };
        results: Array<{
            employeeId: string;
            employeeName: string;
            amount: number;
            type: 'ADDITION' | 'DEDUCTION' | 'NONE';
            reason: string;
            conditionsMet: boolean;
            details?: any;
        }>;
        warnings: string[];
    }> {
        return await api.post(`${this.baseUrl}/${policyId}/simulate`, { period, employeeIds });
    }

    /**
     * 📊 جلب تاريخ المحاكاة
     */
    async getSimulationHistory(policyId: string, params?: { page?: number; limit?: number }): Promise<{
        success: boolean;
        data: Array<{
            id: string;
            simulationPeriod: string;
            simulatedByName: string;
            totalEmployeesAffected: number;
            totalAdditions: number;
            totalDeductions: number;
            warningsCount: number;
            executionTimeMs: number;
            createdAt: string;
        }>;
        pagination: { page: number; limit: number; total: number; totalPages: number };
    }> {
        return await api.get(`${this.baseUrl}/${policyId}/simulations`, { params });
    }

    // ============== Conflict Detection APIs ==============

    /**
     * 🔍 اكتشاف التعارضات لسياسة معينة
     */
    async detectConflicts(policyId: string): Promise<{
        success: boolean;
        hasConflicts: boolean;
        conflictingPolicies: Array<{
            id: string;
            name: string;
            triggerEvent: string;
            conflictType: 'SAME_TRIGGER' | 'OVERLAPPING_CONDITIONS' | 'CONTRADICTING_ACTIONS';
            severity: 'LOW' | 'MEDIUM' | 'HIGH';
            description: string;
        }>;
        warnings: string[];
    }> {
        return await api.get(`${this.baseUrl}/${policyId}/conflicts`);
    }

    /**
     * ⚡ التحقق من إمكانية التفعيل
     */
    async canActivate(policyId: string): Promise<{
        success: boolean;
        canActivate: boolean;
        warnings: string[];
        blockingConflicts: string[];
    }> {
        return await api.get(`${this.baseUrl}/${policyId}/can-activate`);
    }

    /**
     * 🗺️ مصفوفة التعارضات للشركة
     */
    async getConflictMatrix(): Promise<{
        success: boolean;
        policies: Array<{ id: string; name: string; triggerEvent: string }>;
        conflicts: Array<{
            policy1Id: string;
            policy2Id: string;
            conflictType: string;
            severity: string;
        }>;
    }> {
        return await api.get(`${this.baseUrl}/conflict-matrix`);
    }

    // ============== Audit Log APIs ==============

    /**
     * 📋 سجل التدقيق لسياسة معينة
     */
    async getAuditLog(policyId: string, params?: { page?: number; limit?: number }): Promise<{
        success: boolean;
        data: Array<{
            id: string;
            action: string;
            description: string;
            userId: string;
            userName: string;
            details: any;
            createdAt: string;
        }>;
        pagination: { page: number; limit: number; total: number; totalPages: number };
    }> {
        return await api.get(`${this.baseUrl}/${policyId}/audit-log`, { params });
    }

    /**
     * 📊 سجل التدقيق الشامل للشركة
     */
    async getCompanyAuditLog(params?: { page?: number; limit?: number }): Promise<{
        success: boolean;
        data: Array<{
            id: string;
            action: string;
            policyId: string;
            description: string;
            userId: string;
            userName: string;
            details: any;
            createdAt: string;
        }>;
        pagination: { page: number; limit: number; total: number; totalPages: number };
    }> {
        return await api.get(`${this.baseUrl}/company-audit-log`, { params });
    }

    // ============== Exception Management APIs ==============

    /**
     * 🚫 إضافة استثناء لسياسة
     */
    async createException(policyId: string, dto: {
        exceptionType: 'EMPLOYEE' | 'DEPARTMENT' | 'JOB_TITLE' | 'BRANCH';
        targetId: string;
        targetName: string;
        reason?: string;
        exceptionFrom?: string;
        exceptionTo?: string;
    }): Promise<{ success: boolean; data: PolicyException }> {
        return await api.post(`${this.baseUrl}/${policyId}/exceptions`, dto);
    }

    /**
     * 📋 قائمة استثناءات سياسة
     */
    async getExceptions(policyId: string): Promise<{ success: boolean; data: PolicyException[] }> {
        return await api.get(`${this.baseUrl}/${policyId}/exceptions`);
    }

    /**
     * ❌ حذف استثناء
     */
    async deleteException(exceptionId: string): Promise<{ success: boolean; message: string }> {
        return await api.delete(`${this.baseUrl}/exceptions/${exceptionId}`);
    }

    /**
     * 📊 إحصائيات الاستثناءات
     */
    async getExceptionStats(policyId: string): Promise<{
        success: boolean;
        data: {
            total: number;
            active: number;
            inactive: number;
            byType: Record<string, number>;
            permanent: number;
            temporary: number;
        };
    }> {
        return await api.get(`${this.baseUrl}/${policyId}/exceptions/stats`);
    }

    // ============== Retroactive Application APIs ==============

    /**
     * ⏪ إنشاء طلب تطبيق بأثر رجعي
     */
    async createRetroApplication(policyId: string, dto: {
        startPeriod: string;
        endPeriod: string;
        notes?: string;
    }): Promise<{ success: boolean; data: RetroApplication }> {
        return await api.post(`${this.baseUrl}/${policyId}/retro-apply`, dto);
    }

    /**
     * 🔢 حساب الأثر الرجعي
     */
    async calculateRetroApplication(appId: string): Promise<{
        success: boolean;
        data: {
            summary: {
                totalEmployees: number;
                totalAdditions: number;
                totalDeductions: number;
                netAmount: number;
            };
            results: Array<{
                employeeId: string;
                employeeName: string;
                periods: Array<{
                    period: string;
                    amount: number;
                    type: 'ADDITION' | 'DEDUCTION';
                }>;
                totalAmount: number;
            }>;
        };
    }> {
        return await api.post(`${this.baseUrl}/retro-applications/${appId}/calculate`);
    }

    /**
     * ✅ الموافقة على طلب التطبيق الرجعي
     */
    async approveRetroApplication(appId: string): Promise<{ success: boolean; data: RetroApplication }> {
        return await api.post(`${this.baseUrl}/retro-applications/${appId}/approve`);
    }

    /**
     * 🚀 تنفيذ التطبيق الرجعي
     */
    async applyRetroApplication(appId: string, targetPayrollPeriod: string): Promise<{
        success: boolean;
        data: {
            retroPayRecords: number;
            totalAmount: number;
        };
    }> {
        return await api.post(`${this.baseUrl}/retro-applications/${appId}/apply`, { targetPayrollPeriod });
    }

    /**
     * 📋 قائمة طلبات التطبيق الرجعي
     */
    async getRetroApplications(): Promise<{ success: boolean; data: RetroApplication[] }> {
        return await api.get(`${this.baseUrl}/retro-applications`);
    }

    /**
     * 📋 قائمة طلبات التطبيق الرجعي لسياسة
     */
    async getPolicyRetroApplications(policyId: string): Promise<{ success: boolean; data: RetroApplication[] }> {
        return await api.get(`${this.baseUrl}/${policyId}/retro-applications`);
    }

    // ============== Tiered Penalty APIs ==============

    /**
     * 📊 إحصائيات التكرار لسياسة
     */
    async getOccurrenceStats(policyId: string): Promise<{
        success: boolean;
        data: {
            totalTrackers: number;
            totalOccurrences: number;
            byType: Record<string, { count: number; employees: number }>;
            topOffenders: Array<{ employeeId: string; count: number; type: string }>;
        };
    }> {
        return await api.get(`${this.baseUrl}/${policyId}/occurrences/stats`);
    }

    /**
     * 🔄 إعادة تعيين عدادات التكرار
     */
    async resetOccurrences(policyId: string): Promise<{ success: boolean; message: string }> {
        return await api.post(`${this.baseUrl}/${policyId}/occurrences/reset`);
    }

    /**
     * 📋 تاريخ التكرار لموظف
     */
    async getEmployeeOccurrences(employeeId: string): Promise<{
        success: boolean;
        data: Array<{
            id: string;
            policyId: string;
            policy: { id: string; name: string };
            occurrenceType: string;
            count: number;
            resetPeriod: string;
            lastOccurredAt: string;
        }>;
    }> {
        return await api.get(`${this.baseUrl}/occurrences/employee/${employeeId}`);
    }

    // ============== Payroll Protection APIs ==============

    /**
     * 🔒 التحقق من حالة قفل الرواتب
     */
    async getPayrollLockStatus(year?: number, month?: number): Promise<{
        success: boolean;
        data: {
            isLocked: boolean;
            lockedPeriod?: string;
            lockedAt?: string;
            lockedBy?: string;
            message?: string;
        };
    }> {
        return await api.get(`${this.baseUrl}/payroll-lock/status`, { params: { year, month } });
    }

    /**
     * 📋 حالة القفل للفترات الأخيرة
     */
    async getRecentPeriodsLockStatus(): Promise<{
        success: boolean;
        data: Array<{
            period: string;
            exists: boolean;
            status: string;
            isLocked: boolean;
            lockedAt?: string;
        }>;
    }> {
        return await api.get(`${this.baseUrl}/payroll-lock/recent`);
    }

    /**
     * ⚖️ التحقق من إمكانية التطبيق الرجعي
     */
    async canApplyRetro(startPeriod: string, endPeriod: string): Promise<{
        success: boolean;
        data: {
            canApply: boolean;
            blockedPeriods: string[];
            message?: string;
        };
    }> {
        return await api.get(`${this.baseUrl}/payroll-lock/can-apply-retro`, { params: { startPeriod, endPeriod } });
    }

    // ============== Payroll Integration APIs ==============

    /**
     * 📊 حساب تأثير السياسات على مسير الرواتب
     * يُستخدم لمعاينة التأثير قبل تشغيل مسير الرواتب
     */
    async getPayrollImpact(month: number, year: number): Promise<{
        success: boolean;
        data: {
            results: Array<{
                employeeId: string;
                employeeName: string;
                employeeCode: string;
                originalBasicSalary: number;
                originalTotalSalary: number;
                appliedPolicies: Array<{
                    policyId: string;
                    policyName: string;
                    amount: number;
                    reason: string;
                    category: string;
                }>;
                totalPolicyDeductions: number;
                totalPolicyBonuses: number;
                netPolicyImpact: number;
                finalTotalSalary: number;
            }>;
            summary: {
                period: { month: number; year: number; periodLabel: string };
                totalEmployees: number;
                employeesAffected: number;
                totalDeductions: number;
                totalBonuses: number;
                netImpact: number;
                policiesApplied: number;
                byPolicy: Array<{
                    policyId: string;
                    policyName: string;
                    timesApplied: number;
                    totalAmount: number;
                }>;
                byDepartment: Array<{
                    departmentId: string;
                    departmentName: string;
                    totalDeductions: number;
                    totalBonuses: number;
                    employeesAffected: number;
                }>;
            };
        };
    }> {
        return await api.get(`${this.baseUrl}/payroll/impact`, { params: { month, year } });
    }

    /**
     * 🔄 مزامنة السياسات مع مسير رواتب معين
     * يُنشئ PayrollAdjustment لكل تعديل من السياسات الذكية
     */
    async syncWithPayroll(payrollRunId: string, month: number, year: number): Promise<{
        success: boolean;
        data: {
            success: boolean;
            employeesProcessed: number;
            totalAdjustments: number;
            totalDeductions: number;
            totalBonuses: number;
            errors: string[];
        };
    }> {
        return await api.post(`${this.baseUrl}/payroll/sync/${payrollRunId}`, { month, year });
    }

    /**
     * 📋 الحصول على تعديلات السياسات لمسير راتب
     * يُظهر كل الخصومات والمكافآت من السياسات الذكية
     */
    async getPayrollAdjustments(payrollRunId: string): Promise<{
        success: boolean;
        data: {
            deductions: Array<{
                employeeId: string;
                employeeName: string;
                policyName: string;
                amount: number;
            }>;
            bonuses: Array<{
                employeeId: string;
                employeeName: string;
                policyName: string;
                amount: number;
            }>;
            totalDeductions: number;
            totalBonuses: number;
        };
    }> {
        return await api.get(`${this.baseUrl}/payroll/adjustments/${payrollRunId}`);
    }

    /**
     * 📝 تطبيق السياسات على موظف واحد في مسير الرواتب
     */
    async applyPoliciesToEmployee(
        payrollRunId: string,
        employeeId: string,
        month: number,
        year: number
    ): Promise<{
        success: boolean;
        data: {
            adjustmentsCreated: number;
            totalDeductions: number;
            totalBonuses: number;
        };
    }> {
        return await api.post(`${this.baseUrl}/payroll/apply-to-employee`, {
            payrollRunId,
            employeeId,
            month,
            year,
        });
    }
}

// ========== Enterprise Types ==========

export interface PolicyException {
    id: string;
    policyId: string;
    companyId: string;
    exceptionType: 'EMPLOYEE' | 'DEPARTMENT' | 'JOB_TITLE' | 'BRANCH';
    targetId: string;
    targetName: string;
    reason?: string;
    exceptionFrom?: string;
    exceptionTo?: string;
    isActive: boolean;
    createdBy: string;
    createdByName: string;
    createdAt: string;
}

export interface RetroApplication {
    id: string;
    policyId: string;
    companyId: string;
    startPeriod: string;
    endPeriod: string;
    periods: string[];
    totalEmployeesAffected: number;
    totalAdditions: number;
    totalDeductions: number;
    netAmount: number;
    status: 'PENDING' | 'CALCULATING' | 'REVIEWED' | 'APPROVED' | 'APPLIED' | 'CANCELLED';
    requestedBy: string;
    requestedByName: string;
    requestedAt: string;
    approvedBy?: string;
    approvedByName?: string;
    approvedAt?: string;
    appliedAt?: string;
    policy?: SmartPolicy;
}

export const smartPoliciesService = new SmartPoliciesService();
