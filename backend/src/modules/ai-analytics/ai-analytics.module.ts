import { Module } from '@nestjs/common';
import { AiAnalyticsService } from './ai-analytics.service';
import { AiAnalyticsController } from './ai-analytics.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [PrismaModule, AiModule],
    controllers: [AiAnalyticsController],
    providers: [AiAnalyticsService],
    exports: [AiAnalyticsService],
})
export class AiAnalyticsModule { }
