import { Module } from '@nestjs/common';
import { AiPredictiveService } from './ai-predictive.service';
import { AiPredictiveController } from './ai-predictive.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { MlTrainingService } from './services/ml-training.service';
import { AbsencePredictionService } from './services/absence-prediction.service';
import { PatternDetectionService } from './services/pattern-detection.service';
import { ExplainabilityService } from './services/explainability.service';

@Module({
    imports: [PrismaModule, AiModule],
    controllers: [AiPredictiveController],
    providers: [
        AiPredictiveService,
        MlTrainingService,
        AbsencePredictionService,
        PatternDetectionService,
        ExplainabilityService,
    ],
    exports: [AiPredictiveService],
})
export class AiPredictiveModule { }
