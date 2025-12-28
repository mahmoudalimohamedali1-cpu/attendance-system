import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { SmartNotificationService } from './smart-notification.service';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PrismaModule, PermissionsModule, ScheduleModule.forRoot()],
  controllers: [NotificationsController],
  providers: [NotificationsService, SmartNotificationService],
  exports: [NotificationsService, SmartNotificationService],
})
export class NotificationsModule { }


