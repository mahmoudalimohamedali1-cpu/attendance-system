import { apiService, API_BASE_URL } from './api.service';

// === Types ===
export interface StatusLog {
    id: string;
    entityType: 'MUDAD' | 'WPS' | 'QIWA';
    entityId: string;
    fromStatus: string;
    toStatus: string;
    reason?: string;
    meta?: string;
    changedById?: string;
    changedByName?: string;
    createdAt: string;
}

// === API Functions ===

/**
 * جلب سجل تغييرات الحالة لكيان معين
 */
export const getEntityLogs = async (
    entityType: string,
    entityId: string
): Promise<StatusLog[]> => {
    const response = await apiService.get(
        `${API_BASE_URL}/audit/submissions/${entityType}/${entityId}/logs`
    );
    return response.data;
};

/**
 * جلب جميع سجلات التدقيق لفترة محددة
 */
export const getLogsByPeriod = async (
    startDate?: string,
    endDate?: string
): Promise<StatusLog[]> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await apiService.get(
        `${API_BASE_URL}/audit/submissions/logs?${params.toString()}`
    );
    return response.data;
};

/**
 * جلب سجلات مستخدم معين
 */
export const getLogsByUser = async (userId: string): Promise<StatusLog[]> => {
    const response = await apiService.get(
        `${API_BASE_URL}/audit/submissions/by-user/${userId}`
    );
    return response.data;
};

/**
 * تصدير سجلات التدقيق CSV
 */
export const exportAuditLogsCsv = async (
    startDate?: string,
    endDate?: string
): Promise<Blob> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await apiService.get(
        `${API_BASE_URL}/audit/submissions/export/csv?${params.toString()}`,
        { responseType: 'blob' }
    );
    return response.data;
};

export const auditService = {
    getEntityLogs,
    getLogsByPeriod,
    getLogsByUser,
    exportAuditLogsCsv,
};
