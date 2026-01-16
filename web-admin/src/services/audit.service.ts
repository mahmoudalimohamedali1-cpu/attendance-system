import axios from 'axios';

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

// استخدام متغير البيئة - Direct URL to bypass api.service
const API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api/v1';

// Helper to get auth header
const getAuthHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem('access_token')}`,
});

// === API Functions ===

/**
 * جلب سجل تغييرات الحالة لكيان معين
 */
export const getEntityLogs = async (
    entityType: string,
    entityId: string
): Promise<StatusLog[]> => {
    const response = await axios.get<StatusLog[]>(
        `${API_URL}/audit/submissions/${entityType}/${entityId}/logs`,
        { headers: getAuthHeader() }
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

    const response = await axios.get<StatusLog[]>(
        `${API_URL}/audit/submissions/logs?${params.toString()}`,
        { headers: getAuthHeader() }
    );
    return response.data;
};

/**
 * جلب سجلات مستخدم معين
 */
export const getLogsByUser = async (userId: string): Promise<StatusLog[]> => {
    const response = await axios.get<StatusLog[]>(
        `${API_URL}/audit/submissions/by-user/${userId}`,
        { headers: getAuthHeader() }
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

    const response = await axios.get<Blob>(
        `${API_URL}/audit/submissions/export/csv?${params.toString()}`,
        { headers: getAuthHeader(), responseType: 'blob' }
    );
    return response.data;
};

export const auditService = {
    getEntityLogs,
    getLogsByPeriod,
    getLogsByUser,
    exportAuditLogsCsv,
};
