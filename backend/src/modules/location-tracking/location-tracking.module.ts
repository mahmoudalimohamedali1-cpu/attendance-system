import { Module, forwardRef } from '@nestjs/common';
import { LocationTrackingController } from './location-tracking.controller';
import { LocationTrackingService } from './location-tracking.service';
import { LocationTrackingGateway } from './location-tracking.gateway';
import { LocationReportsService } from './location-reports.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AttendanceModule } from '../attendance/attendance.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { GeofenceService } from '../attendance/services/geofence.service';

@Module({
    imports: [
        forwardRef(() => AttendanceModule),
        NotificationsModule,
        PermissionsModule,
    ],
    controllers: [LocationTrackingController],
    providers: [
        LocationTrackingService,
        LocationTrackingGateway,
        LocationReportsService,
        PrismaService,
        GeofenceService,
    ],
    exports: [LocationTrackingService, LocationTrackingGateway, LocationReportsService],
})
export class LocationTrackingModule { }

