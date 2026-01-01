import { Module, forwardRef } from '@nestjs/common';
import { LocationTrackingController } from './location-tracking.controller';
import { LocationTrackingService } from './location-tracking.service';
import { LocationTrackingGateway } from './location-tracking.gateway';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AttendanceModule } from '../attendance/attendance.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PermissionsModule } from '../permissions/permissions.module';

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
        PrismaService,
    ],
    exports: [LocationTrackingService, LocationTrackingGateway],
})
export class LocationTrackingModule { }
