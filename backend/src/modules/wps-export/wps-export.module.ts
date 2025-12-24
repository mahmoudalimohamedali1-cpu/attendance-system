import { Module, forwardRef } from '@nestjs/common';
import { WpsExportService } from './wps-export.service';
import { WpsExportController } from './wps-export.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { WpsTrackingModule } from '../wps-tracking/wps-tracking.module';

@Module({
    imports: [PrismaModule, forwardRef(() => WpsTrackingModule)],
    controllers: [WpsExportController],
    providers: [WpsExportService],
    exports: [WpsExportService],
})
export class WpsExportModule { }
