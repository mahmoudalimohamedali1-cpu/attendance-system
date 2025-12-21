import { Module } from '@nestjs/common';
import { WpsTrackingController } from './wps-tracking.controller';
import { WpsTrackingService } from './wps-tracking.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [WpsTrackingController],
    providers: [WpsTrackingService],
    exports: [WpsTrackingService],
})
export class WpsTrackingModule { }
