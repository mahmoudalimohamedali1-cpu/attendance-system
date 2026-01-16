import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WorkforcePlanningService } from './workforce-planning.service';
import { DemandForecastingService } from './services/demand-forecasting.service';
import { ScheduleOptimizerService } from './services/schedule-optimizer.service';
import { CoverageAnalyzerService } from './services/coverage-analyzer.service';
import { ForecastRequestDto, ForecastResponseDto } from './dto/forecast.dto';
import { OptimizeScheduleRequestDto, OptimizeScheduleResponseDto } from './dto/schedule-optimization.dto';
import { CoverageAnalysisRequestDto, CoverageAnalysisResponseDto } from './dto/coverage-analysis.dto';
import { CreateScenarioRequestDto, ScenarioResponseDto } from './dto/scenario.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Workforce Planning')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('workforce-planning')
export class WorkforcePlanningController {
    constructor(
        private readonly service: WorkforcePlanningService,
        private readonly demandForecastingService: DemandForecastingService,
        private readonly scheduleOptimizerService: ScheduleOptimizerService,
        private readonly coverageAnalyzerService: CoverageAnalyzerService,
    ) { }

    @Get('forecast')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'Get workforce forecast' })
    @ApiQuery({ name: 'months', type: Number, required: false, example: 6 })
    async getForecast(
        @CurrentUser('companyId') companyId: string,
        @Query('months') months?: string,
    ): Promise<any> {
        return this.service.getForecast(companyId, parseInt(months || '6'));
    }

    @Post('forecast')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'Generate detailed workforce forecast' })
    async generateForecast(
        @CurrentUser('companyId') companyId: string,
        @Body() requestDto: ForecastRequestDto,
    ): Promise<ForecastResponseDto> {
        return this.demandForecastingService.generateForecast(companyId, requestDto);
    }

    @Post('optimize-schedule')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'Generate optimized work schedule' })
    async optimizeSchedule(
        @CurrentUser('companyId') companyId: string,
        @Body() requestDto: OptimizeScheduleRequestDto,
    ): Promise<OptimizeScheduleResponseDto> {
        return this.scheduleOptimizerService.optimizeSchedule(companyId, requestDto);
    }

    @Get('coverage-gaps')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'Analyze workforce coverage gaps' })
    @ApiQuery({ name: 'date', type: String, required: true, example: '2024-02-01' })
    @ApiQuery({ name: 'analysisType', enum: ['DAILY', 'WEEKLY', 'MONTHLY'], required: false })
    @ApiQuery({ name: 'branchId', type: String, required: false })
    @ApiQuery({ name: 'departmentId', type: String, required: false })
    async getCoverageGaps(
        @CurrentUser('companyId') companyId: string,
        @Query('date') date: string,
        @Query('analysisType') analysisType?: string,
        @Query('branchId') branchId?: string,
        @Query('departmentId') departmentId?: string,
    ): Promise<CoverageAnalysisResponseDto> {
        const requestDto: CoverageAnalysisRequestDto = {
            date,
            analysisType: analysisType as any,
            branchId,
            departmentId,
        };
        return this.coverageAnalyzerService.analyzeCoverage(companyId, requestDto);
    }

    @Post('scenario')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'Create and analyze what-if scenario' })
    async createScenario(
        @CurrentUser('companyId') companyId: string,
        @CurrentUser('sub') userId: string,
        @Body() requestDto: CreateScenarioRequestDto,
    ): Promise<ScenarioResponseDto> {
        return this.service.createScenario(companyId, userId, requestDto);
    }
}
