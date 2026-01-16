import { Module } from '@nestjs/common';
import { WorkforcePlanningController } from './workforce-planning.controller';
import { WorkforcePlanningService } from './workforce-planning.service';
import { DemandForecastingService } from './services/demand-forecasting.service';
import { ScheduleOptimizerService } from './services/schedule-optimizer.service';
import { CoverageAnalyzerService } from './services/coverage-analyzer.service';
import { BusinessMetricsService } from './services/business-metrics.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [PrismaModule, AiModule],
    controllers: [WorkforcePlanningController],
    providers: [
        WorkforcePlanningService,
        DemandForecastingService,
        ScheduleOptimizerService,
        CoverageAnalyzerService,
        BusinessMetricsService,
    ],
    exports: [
        WorkforcePlanningService,
        DemandForecastingService,
        ScheduleOptimizerService,
        CoverageAnalyzerService,
        BusinessMetricsService,
    ],
})
export class WorkforcePlanningModule {}
