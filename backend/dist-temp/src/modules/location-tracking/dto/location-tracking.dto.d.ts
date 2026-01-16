export declare class UpdateLocationDto {
    latitude: number;
    longitude: number;
    accuracy?: number;
    batteryLevel?: number;
    deviceInfo?: string;
}
export declare class LocationHistoryQueryDto {
    userId?: string;
    startDate?: string;
    endDate?: string;
    insideOnly?: boolean;
    limit?: number;
}
export declare class ActiveEmployeeDto {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    branchName: string;
    departmentName?: string;
    checkInTime: Date;
    lastLocation?: {
        latitude: number;
        longitude: number;
        isInsideGeofence: boolean;
        distanceFromBranch: number;
        updatedAt: Date;
    };
    exitEvents: number;
}
export declare class LiveLocationDto {
    userId: string;
    latitude: number;
    longitude: number;
    isInsideGeofence: boolean;
    distanceFromBranch: number;
    accuracy?: number;
    batteryLevel?: number;
    updatedAt: Date;
}
export declare class JoinTrackingDto {
    userId: string;
}
export declare class LocationUpdateEventDto {
    userId: string;
    location: LiveLocationDto;
}
