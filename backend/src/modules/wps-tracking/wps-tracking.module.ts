import { Module } from '@nestjs/common';
import { WpsTrackingController } from './wps-tracking.controller';
import { WpsTrackingService } from './wps-tracking.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { StatusLogService } from '../../common/services/status-log.service';

@Module({
    imports: [PrismaModule],
    controllers: [WpsTrackingController],
    providers: [WpsTrackingService, StatusLogService],
    exports: [WpsTrackingService],
})
export class WpsTrackingModule { }
