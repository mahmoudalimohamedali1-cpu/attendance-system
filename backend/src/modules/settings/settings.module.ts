import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { LeaveResetService } from './leave-reset.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [SettingsController],
  providers: [SettingsService, LeaveResetService],
  exports: [SettingsService, LeaveResetService],
})
export class SettingsModule { }
