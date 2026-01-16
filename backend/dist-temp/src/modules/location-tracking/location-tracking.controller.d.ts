import { LocationTrackingService } from './location-tracking.service';
import { LocationReportsService } from './location-reports.service';
import { UpdateLocationDto, LocationHistoryQueryDto } from './dto/location-tracking.dto';
export declare class LocationTrackingController {
    private readonly locationTrackingService;
    private readonly reportsService;
    constructor(locationTrackingService: LocationTrackingService, reportsService: LocationReportsService);
    updateLocation(req: any, dto: UpdateLocationDto): Promise<import("./dto/location-tracking.dto").LiveLocationDto>;
    getActiveEmployees(req: any): Promise<import("./dto/location-tracking.dto").ActiveEmployeeDto[]>;
    getExitSummary(req: any, startDate: string, endDate: string): Promise<import("./location-reports.service").ExitReportSummary>;
    getDailyReport(req: any, startDate: string, endDate: string): Promise<import("./location-reports.service").DailyExitReport[]>;
    getAllEmployeesStats(req: any, startDate: string, endDate: string): Promise<{
        userId: string;
        employeeName: string;
        employeeCode: string;
        departmentName?: string;
        exitCount: number;
        totalDuration: number;
    }[]>;
    getEmployeeReport(req: any, userId: string, startDate: string, endDate: string): Promise<import("./location-reports.service").EmployeeExitDetail | null>;
    getEmployeeLocation(req: any, targetUserId: string): Promise<import("./dto/location-tracking.dto").LiveLocationDto | null>;
    getLocationHistory(req: any, targetUserId: string, query: LocationHistoryQueryDto): Promise<{
        id: string;
        latitude: number;
        longitude: number;
        isInsideGeofence: boolean;
        distanceFromBranch: number | null;
        accuracy: number | null;
        batteryLevel: number | null;
        createdAt: Date;
    }[]>;
    getExitEvents(req: any, targetUserId: string, dateStr?: string): Promise<({
        user: {
            firstName: string;
            lastName: string;
            employeeCode: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        userId: string;
        distanceFromBranch: number;
        attendanceId: string;
        exitLatitude: import("@prisma/client/runtime/library").Decimal;
        exitLongitude: import("@prisma/client/runtime/library").Decimal;
        exitTime: Date;
        returnTime: Date | null;
        returnLatitude: import("@prisma/client/runtime/library").Decimal | null;
        returnLongitude: import("@prisma/client/runtime/library").Decimal | null;
        durationMinutes: number | null;
        notificationSent: boolean;
    })[]>;
}
