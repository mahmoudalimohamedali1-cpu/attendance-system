import { Module } from '@nestjs/common';
import { LeavesController } from './leaves.controller';
import { LeavesService } from './leaves.service';
import { LeaveCalculationService } from './leave-calculation.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { UploadModule } from '../../common/upload/upload.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [NotificationsModule, UploadModule, PermissionsModule],
  controllers: [LeavesController],
  providers: [LeavesService, LeaveCalculationService],
  exports: [LeavesService, LeaveCalculationService],
})
export class LeavesModule { }
