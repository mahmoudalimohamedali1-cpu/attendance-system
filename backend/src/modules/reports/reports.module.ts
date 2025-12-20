import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ExportService } from './services/export.service';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PermissionsModule],
  controllers: [ReportsController],
  providers: [ReportsService, ExportService],
  exports: [ReportsService],
})
export class ReportsModule { }


