import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { TargetingService } from './targeting.service';
import { SocialFeedService } from './social-feed.service';

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [],
  providers: [TargetingService, SocialFeedService],
  exports: [TargetingService, SocialFeedService],
})
export class SocialFeedModule {}
