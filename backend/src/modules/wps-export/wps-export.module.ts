import { Module, forwardRef } from '@nestjs/common';
import { WpsExportService } from './wps-export.service';
import { WpsExportController } from './wps-export.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { WpsTrackingModule } from '../wps-tracking/wps-tracking.module';
import { MudadValidatorService } from './validators/mudad-validator.service';

@Module({
    imports: [PrismaModule, forwardRef(() => WpsTrackingModule)],
    controllers: [WpsExportController],
    providers: [WpsExportService, MudadValidatorService],
    exports: [WpsExportService, MudadValidatorService],
})
export class WpsExportModule { }
