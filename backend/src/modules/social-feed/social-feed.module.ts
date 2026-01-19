import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TargetingService } from './targeting.service';
import { SocialFeedService } from './social-feed.service';
import { SocialFeedController } from './social-feed.controller';

@Module({
  imports: [PrismaModule, PermissionsModule, NotificationsModule],
  controllers: [SocialFeedController],
  providers: [TargetingService, SocialFeedService],
  exports: [TargetingService, SocialFeedService],
})
export class SocialFeedModule {}
