import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WorkforcePlanningService } from './workforce-planning.service';
import { DemandForecastingService } from './services/demand-forecasting.service';
import { ScheduleOptimizerService } from './services/schedule-optimizer.service';
import { ForecastRequestDto, ForecastResponseDto } from './dto/forecast.dto';
import { OptimizeScheduleRequestDto, OptimizeScheduleResponseDto } from './dto/schedule-optimization.dto';
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
}
