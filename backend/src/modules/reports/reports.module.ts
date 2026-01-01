import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ExportService } from './services/export.service';
import { ExtendedReportsService } from './services/extended-reports.service';
import { ExtendedReportsController } from './controllers/extended-reports.controller';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PermissionsModule],
  controllers: [ReportsController, ExtendedReportsController],
  providers: [ReportsService, ExportService, ExtendedReportsService],
  exports: [ReportsService, ExtendedReportsService],
})
export class ReportsModule { }
