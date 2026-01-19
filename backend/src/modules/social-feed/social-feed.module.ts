import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { TargetingService } from './targeting.service';

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [],
  providers: [TargetingService],
  exports: [TargetingService],
})
export class SocialFeedModule {}
