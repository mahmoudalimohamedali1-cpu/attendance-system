import { Module } from '@nestjs/common';
import { FaceRecognitionController } from './face-recognition.controller';
import { FaceRecognitionService } from './face-recognition.service';
import { FaceComparisonService } from './services/face-comparison.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FaceRecognitionController],
  providers: [FaceRecognitionService, FaceComparisonService],
  exports: [FaceRecognitionService, FaceComparisonService],
})
export class FaceRecognitionModule {}

