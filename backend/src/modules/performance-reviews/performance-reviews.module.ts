import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PerformanceReviewsController } from './performance-reviews.controller';
import { PerformanceReviewsService } from './performance-reviews.service';
import { AiGoalAssistantService } from './ai-goal-assistant.service';
import { UnifiedPerformanceService } from './unified-performance.service';
import { UnifiedPerformanceController } from './unified-performance.controller';

@Module({
    imports: [PrismaModule],
    controllers: [PerformanceReviewsController, UnifiedPerformanceController],
    providers: [PerformanceReviewsService, AiGoalAssistantService, UnifiedPerformanceService],
    exports: [PerformanceReviewsService, AiGoalAssistantService, UnifiedPerformanceService],
})
export class PerformanceReviewsModule { }

