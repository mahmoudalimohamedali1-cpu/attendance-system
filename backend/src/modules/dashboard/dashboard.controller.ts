import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DashboardSummaryDto, DashboardHealthDto, DashboardExceptionsDto, DashboardTrendsDto } from './dto/dashboard.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
    constructor(private readonly service: DashboardService) { }

    @Get('summary')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'Executive Summary - Main Dashboard Cards' })
    @ApiQuery({ name: 'year', type: Number, example: 2025 })
    @ApiQuery({ name: 'month', type: Number, example: 1 })
    async getSummary(
        @CurrentUser('companyId') companyId: string,
        @Query('year') year: string,
        @Query('month') month: string,
    ): Promise<DashboardSummaryDto> {
        return this.service.getSummary(
            companyId,
            parseInt(year) || new Date().getFullYear(),
            parseInt(month) || new Date().getMonth() + 1,
        );
    }

    @Get('health')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'Payroll Health Status - Can we lock?' })
    @ApiQuery({ name: 'year', type: Number, example: 2025 })
    @ApiQuery({ name: 'month', type: Number, example: 1 })
    async getHealth(
        @CurrentUser('companyId') companyId: string,
        @Query('year') year: string,
        @Query('month') month: string,
    ): Promise<DashboardHealthDto> {
        return this.service.getHealth(
            companyId,
            parseInt(year) || new Date().getFullYear(),
            parseInt(month) || new Date().getMonth() + 1,
        );
    }

    @Get('exceptions')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'Exceptions & Alerts' })
    @ApiQuery({ name: 'year', type: Number, example: 2025 })
    @ApiQuery({ name: 'month', type: Number, example: 1 })
    async getExceptions(
        @CurrentUser('companyId') companyId: string,
        @Query('year') year: string,
        @Query('month') month: string,
    ): Promise<DashboardExceptionsDto> {
        return this.service.getExceptions(
            companyId,
            parseInt(year) || new Date().getFullYear(),
            parseInt(month) || new Date().getMonth() + 1,
        );
    }

    @Get('trends')
    @Roles('ADMIN', 'HR', 'FINANCE')
    @ApiOperation({ summary: 'Payroll Trends (Last N months)' })
    @ApiQuery({ name: 'months', type: Number, required: false, example: 4 })
    async getTrends(
        @CurrentUser('companyId') companyId: string,
        @Query('months') months?: string,
    ): Promise<DashboardTrendsDto> {
        return this.service.getTrends(companyId, parseInt(months || '4'));
    }
}
