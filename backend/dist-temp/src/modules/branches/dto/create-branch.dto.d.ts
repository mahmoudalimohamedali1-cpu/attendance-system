export declare class CreateBranchDto {
    name: string;
    nameEn?: string;
    address?: string;
    latitude: number;
    longitude: number;
    geofenceRadius?: number;
    timezone?: string;
    workStartTime?: string;
    workEndTime?: string;
    lateGracePeriod?: number;
    earlyCheckInPeriod?: number;
    earlyCheckOutPeriod?: number;
    workingDays?: string;
    isActive?: boolean;
}
