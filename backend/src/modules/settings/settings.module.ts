import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { LeaveResetService } from './leave-reset.service';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, LeaveResetService],
  exports: [SettingsService, LeaveResetService],
})
export class SettingsModule {}

