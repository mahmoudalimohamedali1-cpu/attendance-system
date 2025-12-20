import { Module, Global } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { SmartNotificationService } from './smart-notification.service';
import { FcmService } from './services/fcm.service';
import { PermissionsModule } from '../permissions/permissions.module';

@Global()
@Module({
  imports: [PermissionsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, SmartNotificationService, FcmService],
  exports: [NotificationsService, SmartNotificationService],
})
export class NotificationsModule { }


