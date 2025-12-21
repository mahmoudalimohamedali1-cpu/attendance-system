import { Module } from '@nestjs/common';
import { WpsExportService } from './wps-export.service';
import { WpsExportController } from './wps-export.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [WpsExportController],
    providers: [WpsExportService],
    exports: [WpsExportService],
})
export class WpsExportModule { }
