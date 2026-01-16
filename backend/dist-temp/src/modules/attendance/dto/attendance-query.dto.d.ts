declare enum AttendanceStatus {
    PRESENT = "PRESENT",
    LATE = "LATE",
    EARLY_LEAVE = "EARLY_LEAVE",
    ABSENT = "ABSENT",
    ON_LEAVE = "ON_LEAVE",
    WORK_FROM_HOME = "WORK_FROM_HOME"
}
export declare class AttendanceQueryDto {
    startDate?: string;
    endDate?: string;
    date?: string;
    search?: string;
    status?: AttendanceStatus;
    branchId?: string;
    departmentId?: string;
    userId?: string;
    page?: number;
    limit?: number;
}
export {};
