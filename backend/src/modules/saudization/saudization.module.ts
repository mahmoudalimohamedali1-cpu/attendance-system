import { Module } from '@nestjs/common';
import { SaudizationService } from './saudization.service';
import { SaudizationController } from './saudization.controller';
import { NitaqatCalculatorService } from './services/nitaqat-calculator.service';
import { SaudizationRecommendationService } from './services/saudization-recommendation.service';
import { NitaqatAlertService } from './services/nitaqat-alert.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SaudizationController],
  providers: [
    SaudizationService,
    NitaqatCalculatorService,
    SaudizationRecommendationService,
    NitaqatAlertService,
  ],
  exports: [SaudizationService, NitaqatCalculatorService],
})
export class SaudizationModule {}
