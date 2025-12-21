/**
 * Devices API Service
 * إدارة أجهزة البصمة/الموبايل
 */

import { api } from './api.service';

export type DeviceStatus = 'PENDING' | 'APPROVED' | 'BLOCKED' | 'EXPIRED';

export interface Device {
    id: string;
    userId: string;
    user?: {
        id: string;
        firstName: string;
        lastName: string;
        employeeCode: string;
    };
    deviceId: string;
    deviceName: string;
    deviceModel?: string;
    osVersion?: string;
    appVersion?: string;
    status: DeviceStatus;
    isMain: boolean;
    lastUsed?: string;
    registeredAt: string;
    approvedAt?: string;
    approvedBy?: string;
    blockReason?: string;
}

export const deviceStatusLabels: Record<DeviceStatus, string> = {
    PENDING: 'في الانتظار',
    APPROVED: 'معتمد',
    BLOCKED: 'محظور',
    EXPIRED: 'منتهي',
};

export const deviceStatusColors: Record<DeviceStatus, 'warning' | 'success' | 'error' | 'default'> = {
    PENDING: 'warning',
    APPROVED: 'success',
    BLOCKED: 'error',
    EXPIRED: 'default',
};

class DevicesService {
    private readonly basePath = '/devices';

    async getPending(): Promise<Device[]> {
        const response = await api.get(`${this.basePath}/admin/pending`) as Device[] | { data: Device[] };
        return (response as any).data || response;
    }

    async getAll(filters?: { userId?: string; status?: DeviceStatus; branchId?: string }): Promise<Device[]> {
        const params = new URLSearchParams();
        if (filters?.userId) params.append('userId', filters.userId);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.branchId) params.append('branchId', filters.branchId);
        const query = params.toString() ? `?${params.toString()}` : '';
        const response = await api.get(`${this.basePath}/admin/all${query}`) as Device[] | { data: Device[] };
        return (response as any).data || response;
    }

    async getUserDevices(userId: string): Promise<Device[]> {
        const response = await api.get(`${this.basePath}/admin/user/${userId}`) as Device[] | { data: Device[] };
        return (response as any).data || response;
    }

    async approve(deviceId: string): Promise<Device> {
        const response = await api.patch(`${this.basePath}/admin/${deviceId}/approve`, {}) as Device | { data: Device };
        return (response as any).data || response;
    }

    async block(deviceId: string, reason?: string): Promise<Device> {
        const response = await api.patch(`${this.basePath}/admin/${deviceId}/block`, { reason }) as Device | { data: Device };
        return (response as any).data || response;
    }

    async delete(deviceId: string): Promise<void> {
        await api.delete(`${this.basePath}/${deviceId}`);
    }
}

export const devicesService = new DevicesService();
