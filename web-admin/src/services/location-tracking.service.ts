/**
 * Location Tracking Service - خدمة تتبع الموقع
 */

import { api } from './api.service';

// أنواع البيانات
export interface LastLocation {
    latitude: number;
    longitude: number;
    isInsideGeofence: boolean;
    distanceFromBranch: number;
    updatedAt: string;
}

export interface ActiveEmployee {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    branchName: string;
    departmentName?: string;
    checkInTime: string;
    lastLocation?: LastLocation;
    exitEvents: number;
}

export interface LiveLocation {
    userId: string;
    latitude: number;
    longitude: number;
    isInsideGeofence: boolean;
    distanceFromBranch: number;
    accuracy?: number;
    batteryLevel?: number;
    updatedAt: string;
}

export interface LocationLogEntry {
    id: string;
    latitude: number;
    longitude: number;
    isInsideGeofence: boolean;
    distanceFromBranch?: number;
    accuracy?: number;
    batteryLevel?: number;
    createdAt: string;
}

export interface GeofenceExitEvent {
    id: string;
    userId: string;
    exitLatitude: number;
    exitLongitude: number;
    distanceFromBranch: number;
    exitTime: string;
    returnTime?: string;
    returnLatitude?: number;
    returnLongitude?: number;
    durationMinutes?: number;
    notificationSent: boolean;
    user?: {
        firstName: string;
        lastName: string;
        employeeCode: string;
    };
}

class LocationTrackingService {
    // الحصول على قائمة الموظفين الحاضرين
    async getActiveEmployees(): Promise<ActiveEmployee[]> {
        return api.get<ActiveEmployee[]>('/location-tracking/active');
    }

    // الحصول على موقع موظف معين
    async getEmployeeLocation(userId: string): Promise<LiveLocation | null> {
        return api.get<LiveLocation | null>(`/location-tracking/${userId}`);
    }

    // الحصول على سجل المواقع
    async getLocationHistory(
        userId: string,
        params?: {
            startDate?: string;
            endDate?: string;
            insideOnly?: boolean;
            limit?: number;
        }
    ): Promise<LocationLogEntry[]> {
        const queryParams = new URLSearchParams();
        if (params?.startDate) queryParams.append('startDate', params.startDate);
        if (params?.endDate) queryParams.append('endDate', params.endDate);
        if (params?.insideOnly !== undefined)
            queryParams.append('insideOnly', String(params.insideOnly));
        if (params?.limit) queryParams.append('limit', String(params.limit));

        const query = queryParams.toString();
        return api.get<LocationLogEntry[]>(
            `/location-tracking/${userId}/history${query ? `?${query}` : ''}`
        );
    }

    // الحصول على أحداث الخروج
    async getExitEvents(userId: string, date?: string): Promise<GeofenceExitEvent[]> {
        const query = date ? `?date=${date}` : '';
        return api.get<GeofenceExitEvent[]>(`/location-tracking/${userId}/exit-events${query}`);
    }
}

export const locationTrackingService = new LocationTrackingService();
