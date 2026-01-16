import { Module } from '@nestjs/common';
import { WorkforcePlanningController } from './workforce-planning.controller';
import { WorkforcePlanningService } from './workforce-planning.service';
import { DemandForecastingService } from './services/demand-forecasting.service';
import { ScheduleOptimizerService } from './services/schedule-optimizer.service';
import { CoverageAnalyzerService } from './services/coverage-analyzer.service';
import { CoverageGapAlertService } from './services/coverage-gap-alert.service';
import { BusinessMetricsService } from './services/business-metrics.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [PrismaModule, AiModule, NotificationsModule],
    controllers: [WorkforcePlanningController],
    providers: [
        WorkforcePlanningService,
        DemandForecastingService,
        ScheduleOptimizerService,
        CoverageAnalyzerService,
        CoverageGapAlertService,
        BusinessMetricsService,
    ],
    exports: [
        WorkforcePlanningService,
        DemandForecastingService,
        ScheduleOptimizerService,
        CoverageAnalyzerService,
        CoverageGapAlertService,
        BusinessMetricsService,
    ],
})
export class WorkforcePlanningModule {}
