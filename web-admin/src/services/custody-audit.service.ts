import { api } from './api.service';

export interface AuditLog {
    id: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    entity: string;
    entityId: string;
    userId: string;
    oldValue?: any;
    newValue?: any;
    description?: string;
    ipAddress?: string;
    userAgent?: string;
    createdAt: string;
    user?: {
        id: string;
        firstName: string;
        lastName: string;
    };
}

export interface AuditLogsResponse {
    data: AuditLog[];
    total: number;
    page: number;
    limit: number;
}

class CustodyAuditService {
    // Get custody audit history
    async getAuditHistory(params?: {
        entityId?: string;
        entity?: string;
        startDate?: string;
        endDate?: string;
        page?: number;
        limit?: number;
    }): Promise<AuditLogsResponse> {
        const response = await api.get('/custody/audit/history', { params });
        return response.data;
    }

    // Get item audit history
    async getItemAuditHistory(itemId: string, params?: {
        page?: number;
        limit?: number;
    }): Promise<AuditLogsResponse> {
        const response = await api.get(`/custody/audit/item/${itemId}`, { params });
        return response.data;
    }

    // Get employee custody audit history
    async getEmployeeAuditHistory(employeeId: string, params?: {
        page?: number;
        limit?: number;
    }): Promise<AuditLogsResponse> {
        const response = await api.get(`/custody/audit/employee/${employeeId}`, { params });
        return response.data;
    }
}

export const custodyAuditService = new CustodyAuditService();
export default custodyAuditService;
