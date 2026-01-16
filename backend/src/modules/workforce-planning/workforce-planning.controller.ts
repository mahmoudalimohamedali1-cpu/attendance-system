import { Controller, Get, Post, Put, Delete, Patch, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { WorkforcePlanningService } from './workforce-planning.service';
import { DemandForecastingService } from './services/demand-forecasting.service';
import { ScheduleOptimizerService } from './services/schedule-optimizer.service';
import { CoverageAnalyzerService } from './services/coverage-analyzer.service';
import { BusinessMetricsService } from './services/business-metrics.service';
import { CoverageGapAlertService, AlertPriority, CoverageGapAlert, AlertGenerationResponse } from './services/coverage-gap-alert.service';
import { ForecastRequestDto, ForecastResponseDto } from './dto/forecast.dto';
import { OptimizeScheduleRequestDto, OptimizeScheduleResponseDto } from './dto/schedule-optimization.dto';
import { CoverageAnalysisRequestDto, CoverageAnalysisResponseDto } from './dto/coverage-analysis.dto';
import { CreateScenarioRequestDto, ScenarioResponseDto } from './dto/scenario.dto';
import { ScenarioQueryDto } from './dto/scenario-query.dto';
import {
    CreateBusinessMetricDto,
    UpdateBusinessMetricDto,
    BulkCreateMetricsDto,
    BusinessMetricQueryDto,
    BusinessMetricResponseDto,
    MetricsSummaryDto,
    MetricsTrendDto,
    BusinessMetricsAnalysisDto,
    MetricType,
} from './dto/business-metrics.dto';
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
        private readonly businessMetricsService: BusinessMetricsService,
        private readonly coverageGapAlertService: CoverageGapAlertService,
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

    @Get('scenarios')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'List all what-if scenarios for a company' })
    @ApiResponse({ status: 200, description: 'List of scenarios', type: [ScenarioResponseDto] })
    async getScenarios(
        @CurrentUser('companyId') companyId: string,
        @Query() query: ScenarioQueryDto,
    ): Promise<ScenarioResponseDto[]> {
        return this.service.getScenarios(companyId, query);
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

    // ==================== Business Metrics CRUD Endpoints ====================

    @Get('business-metrics')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'Get business metrics with optional filtering' })
    @ApiResponse({ status: 200, description: 'List of business metrics', type: [BusinessMetricResponseDto] })
    async getBusinessMetrics(
        @CurrentUser('companyId') companyId: string,
        @Query() query: BusinessMetricQueryDto,
    ): Promise<BusinessMetricResponseDto[]> {
        return this.businessMetricsService.getMetrics(companyId, query);
    }

    @Get('business-metrics/summary')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'Get business metrics summary for a date range' })
    @ApiQuery({ name: 'startDate', type: String, required: true, example: '2024-01-01' })
    @ApiQuery({ name: 'endDate', type: String, required: true, example: '2024-12-31' })
    @ApiQuery({ name: 'branchId', type: String, required: false })
    @ApiResponse({ status: 200, description: 'Metrics summary by type', type: [MetricsSummaryDto] })
    async getBusinessMetricsSummary(
        @CurrentUser('companyId') companyId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('branchId') branchId?: string,
    ): Promise<MetricsSummaryDto[]> {
        return this.businessMetricsService.getMetricsSummary(companyId, startDate, endDate, branchId);
    }

    @Get('business-metrics/trends')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'Get business metrics trends over time' })
    @ApiQuery({ name: 'metricType', enum: MetricType, required: true })
    @ApiQuery({ name: 'startDate', type: String, required: true, example: '2024-01-01' })
    @ApiQuery({ name: 'endDate', type: String, required: true, example: '2024-12-31' })
    @ApiQuery({ name: 'branchId', type: String, required: false })
    @ApiResponse({ status: 200, description: 'Metrics trends', type: [MetricsTrendDto] })
    async getBusinessMetricsTrends(
        @CurrentUser('companyId') companyId: string,
        @Query('metricType') metricType: MetricType,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('branchId') branchId?: string,
    ): Promise<MetricsTrendDto[]> {
        return this.businessMetricsService.getMetricsTrends(companyId, metricType, startDate, endDate, branchId);
    }

    @Get('business-metrics/analyze')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'Analyze business metrics and workforce correlation using AI' })
    @ApiQuery({ name: 'startDate', type: String, required: true, example: '2024-01-01' })
    @ApiQuery({ name: 'endDate', type: String, required: true, example: '2024-12-31' })
    @ApiQuery({ name: 'branchId', type: String, required: false })
    @ApiResponse({ status: 200, description: 'AI-powered metrics analysis', type: BusinessMetricsAnalysisDto })
    async analyzeBusinessMetrics(
        @CurrentUser('companyId') companyId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('branchId') branchId?: string,
    ): Promise<BusinessMetricsAnalysisDto> {
        return this.businessMetricsService.analyzeMetrics(companyId, startDate, endDate, branchId);
    }

    @Get('business-metrics/:id')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'Get a specific business metric by ID' })
    @ApiParam({ name: 'id', description: 'Business metric ID' })
    @ApiResponse({ status: 200, description: 'Business metric details', type: BusinessMetricResponseDto })
    async getBusinessMetric(
        @CurrentUser('companyId') companyId: string,
        @Param('id') metricId: string,
    ): Promise<BusinessMetricResponseDto> {
        return this.businessMetricsService.getMetric(companyId, metricId);
    }

    @Post('business-metrics')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'Create a new business metric' })
    @ApiResponse({ status: 201, description: 'Created business metric', type: BusinessMetricResponseDto })
    async createBusinessMetric(
        @CurrentUser('companyId') companyId: string,
        @Body() dto: CreateBusinessMetricDto,
    ): Promise<BusinessMetricResponseDto> {
        return this.businessMetricsService.createMetric(companyId, dto);
    }

    @Post('business-metrics/bulk')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'Bulk create business metrics' })
    @ApiResponse({ status: 201, description: 'Bulk creation result' })
    async bulkCreateBusinessMetrics(
        @CurrentUser('companyId') companyId: string,
        @Body() dto: BulkCreateMetricsDto,
    ): Promise<{ created: number; failed: number }> {
        return this.businessMetricsService.bulkCreateMetrics(companyId, dto);
    }

    @Put('business-metrics/:id')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'Update a business metric' })
    @ApiParam({ name: 'id', description: 'Business metric ID' })
    @ApiResponse({ status: 200, description: 'Updated business metric', type: BusinessMetricResponseDto })
    async updateBusinessMetric(
        @CurrentUser('companyId') companyId: string,
        @Param('id') metricId: string,
        @Body() dto: UpdateBusinessMetricDto,
    ): Promise<BusinessMetricResponseDto> {
        return this.businessMetricsService.updateMetric(companyId, metricId, dto);
    }

    @Delete('business-metrics/:id')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'Delete a business metric' })
    @ApiParam({ name: 'id', description: 'Business metric ID' })
    @ApiResponse({ status: 200, description: 'Metric deleted successfully' })
    async deleteBusinessMetric(
        @CurrentUser('companyId') companyId: string,
        @Param('id') metricId: string,
    ): Promise<void> {
        return this.businessMetricsService.deleteMetric(companyId, metricId);
    }

    // ==================== Coverage Gap Alerts Endpoints ====================

    @Get('coverage-gap-alerts')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'Get active coverage gap alerts' })
    @ApiQuery({ name: 'priority', enum: AlertPriority, required: false })
    @ApiQuery({ name: 'departmentId', type: String, required: false })
    @ApiQuery({ name: 'branchId', type: String, required: false })
    @ApiQuery({ name: 'startDate', type: String, required: false, example: '2024-02-01' })
    @ApiQuery({ name: 'endDate', type: String, required: false, example: '2024-02-28' })
    @ApiResponse({ status: 200, description: 'List of active alerts' })
    async getActiveAlerts(
        @CurrentUser('companyId') companyId: string,
        @Query('priority') priority?: AlertPriority,
        @Query('departmentId') departmentId?: string,
        @Query('branchId') branchId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ): Promise<CoverageGapAlert[]> {
        return this.coverageGapAlertService.getActiveAlerts(companyId, {
            priority,
            departmentId,
            branchId,
            startDate,
            endDate,
        });
    }

    @Post('coverage-gap-alerts/generate')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'Generate coverage gap alerts for a specific date' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                date: { type: 'string', example: '2024-02-15' },
                branchId: { type: 'string', required: false },
                departmentId: { type: 'string', required: false },
                notifyImmediately: { type: 'boolean', default: false },
                thresholds: {
                    type: 'object',
                    properties: {
                        criticalBelow: { type: 'number', example: 50 },
                        highBelow: { type: 'number', example: 70 },
                        mediumBelow: { type: 'number', example: 85 },
                    },
                },
            },
            required: ['date'],
        },
    })
    @ApiResponse({ status: 201, description: 'Alerts generated successfully' })
    async generateAlerts(
        @CurrentUser('companyId') companyId: string,
        @Body() body: {
            date: string;
            branchId?: string;
            departmentId?: string;
            notifyImmediately?: boolean;
            thresholds?: {
                criticalBelow?: number;
                highBelow?: number;
                mediumBelow?: number;
            };
        },
    ): Promise<AlertGenerationResponse> {
        return this.coverageGapAlertService.generateAlerts(companyId, body);
    }

    @Get('coverage-gap-alerts/upcoming')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'Check for coverage gaps in upcoming days' })
    @ApiQuery({ name: 'daysAhead', type: Number, required: false, example: 7 })
    @ApiResponse({ status: 200, description: 'Upcoming alerts for the next N days' })
    async checkUpcomingGaps(
        @CurrentUser('companyId') companyId: string,
        @Query('daysAhead') daysAhead?: string,
    ): Promise<AlertGenerationResponse[]> {
        return this.coverageGapAlertService.checkUpcomingGaps(
            companyId,
            daysAhead ? parseInt(daysAhead) : 7,
        );
    }

    @Post('coverage-gap-alerts/automated-detection')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'Run automated gap detection and send notifications' })
    @ApiResponse({ status: 200, description: 'Automated detection completed' })
    async runAutomatedDetection(
        @CurrentUser('companyId') companyId: string,
    ): Promise<{
        todayAlerts: AlertGenerationResponse;
        upcomingAlerts: AlertGenerationResponse[];
        summary: {
            totalAlerts: number;
            criticalCount: number;
            highCount: number;
            notificationsSent: number;
        };
    }> {
        return this.coverageGapAlertService.runAutomatedDetection(companyId);
    }

    @Get('coverage-gap-alerts/statistics')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'Get coverage gap alert statistics' })
    @ApiQuery({ name: 'startDate', type: String, required: true, example: '2024-01-01' })
    @ApiQuery({ name: 'endDate', type: String, required: true, example: '2024-12-31' })
    @ApiResponse({ status: 200, description: 'Alert statistics' })
    async getAlertStatistics(
        @CurrentUser('companyId') companyId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ): Promise<{
        totalAlerts: number;
        byPriority: Record<AlertPriority, number>;
        byDepartment: Record<string, number>;
        averageCoveragePercentage: number;
        mostAffectedDepartments: Array<{ departmentName: string; alertCount: number }>;
    }> {
        return this.coverageGapAlertService.getAlertStatistics(companyId, startDate, endDate);
    }

    @Patch('coverage-gap-alerts/:id/acknowledge')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'Acknowledge a coverage gap alert' })
    @ApiParam({ name: 'id', description: 'Alert ID' })
    @ApiResponse({ status: 200, description: 'Alert acknowledged' })
    async acknowledgeAlert(
        @CurrentUser('companyId') companyId: string,
        @CurrentUser('sub') userId: string,
        @Param('id') alertId: string,
    ): Promise<{ success: boolean; message: string }> {
        return this.coverageGapAlertService.acknowledgeAlert(companyId, alertId, userId);
    }

    @Patch('coverage-gap-alerts/:id/resolve')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'Resolve a coverage gap alert' })
    @ApiParam({ name: 'id', description: 'Alert ID' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                resolution: { type: 'string', description: 'Resolution notes' },
            },
            required: ['resolution'],
        },
    })
    @ApiResponse({ status: 200, description: 'Alert resolved' })
    async resolveAlert(
        @CurrentUser('companyId') companyId: string,
        @CurrentUser('sub') userId: string,
        @Param('id') alertId: string,
        @Body() body: { resolution: string },
    ): Promise<{ success: boolean; message: string }> {
        return this.coverageGapAlertService.resolveAlert(companyId, alertId, userId, body.resolution);
    }
}
