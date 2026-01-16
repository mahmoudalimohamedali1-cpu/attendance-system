import { Module } from '@nestjs/common';
import { AiPredictiveService } from './ai-predictive.service';
import { AiPredictiveController } from './ai-predictive.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [PrismaModule, AiModule],
    controllers: [AiPredictiveController],
    providers: [AiPredictiveService],
    exports: [AiPredictiveService],
})
export class AiPredictiveModule { }
