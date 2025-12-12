import { Module } from '@nestjs/common';
import { DataUpdateController } from './data-update.controller';
import { DataUpdateService } from './data-update.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DevicesModule } from '../devices/devices.module';
import { FaceRecognitionModule } from '../face-recognition/face-recognition.module';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    DevicesModule,
    FaceRecognitionModule,
  ],
  controllers: [DataUpdateController],
  providers: [DataUpdateService],
  exports: [DataUpdateService],
})
export class DataUpdateModule {}

