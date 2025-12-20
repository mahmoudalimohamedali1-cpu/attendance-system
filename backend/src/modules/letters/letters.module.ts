import { Module } from '@nestjs/common';
import { LettersController } from './letters.controller';
import { LettersService } from './letters.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { UploadModule } from '../../common/upload/upload.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [NotificationsModule, UploadModule, PermissionsModule],
  controllers: [LettersController],
  providers: [LettersService],
  exports: [LettersService],
})
export class LettersModule { }
