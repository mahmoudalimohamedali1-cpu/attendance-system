import { PrismaService } from '../../common/prisma/prisma.service';
import { GeofenceService } from '../attendance/services/geofence.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PermissionsService } from '../permissions/permissions.service';
import { UpdateLocationDto, LocationHistoryQueryDto, ActiveEmployeeDto, LiveLocationDto } from './dto/location-tracking.dto';
export declare class LocationTrackingService {
    private prisma;
    private geofenceService;
    private notificationsService;
    private permissionsService;
    private readonly logger;
    private readonly LOCATION_UPDATE_INTERVAL;
    private readonly EXIT_NOTIFICATION_COOLDOWN;
    private readonly DATA_RETENTION_DAYS;
    constructor(prisma: PrismaService, geofenceService: GeofenceService, notificationsService: NotificationsService, permissionsService: PermissionsService);
    updateLocation(userId: string, dto: UpdateLocationDto): Promise<LiveLocationDto>;
    private handleGeofenceExit;
    private handleGeofenceReturn;
    private notifyManagersOnExit;
    private notifyManagersOnReturn;
    getActiveEmployees(companyId: string): Promise<ActiveEmployeeDto[]>;
    getEmployeeLocation(requesterId: string, targetUserId: string, companyId: string): Promise<LiveLocationDto | null>;
    getLocationHistory(requesterId: string, targetUserId: string, companyId: string, query: LocationHistoryQueryDto): Promise<{
        id: string;
        latitude: number;
        longitude: number;
        isInsideGeofence: boolean;
        distanceFromBranch: number | null;
        accuracy: number | null;
        batteryLevel: number | null;
        createdAt: Date;
    }[]>;
    getExitEvents(requesterId: string, targetUserId: string, companyId: string, date?: Date): Promise<({
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
    private checkTrackingPermission;
    cleanOldLocationLogs(): Promise<void>;
}
