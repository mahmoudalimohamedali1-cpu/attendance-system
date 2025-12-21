import { Module } from '@nestjs/common';
import { WpsTrackingController } from './wps-tracking.controller';
import { WpsTrackingService } from './wps-tracking.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { StatusLogService } from '../../common/services/status-log.service';
import { StateMachineService } from '../../common/services/state-machine.service';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
    imports: [PrismaModule, PermissionsModule],
    controllers: [WpsTrackingController],
    providers: [WpsTrackingService, StatusLogService, StateMachineService],
    exports: [WpsTrackingService],
})
export class WpsTrackingModule { }
