import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
    DashboardSummaryDto,
    DashboardHealthDto,
    DashboardExceptionsDto,
    DashboardTrendsDto,
    RoleBasedDashboardDto,
    ROLE_VISIBILITY,
    filterByRole
} from './dto/dashboard.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
    constructor(private readonly service: DashboardService) { }

    /**
     * Combined role-based dashboard endpoint
     * Returns all data filtered by user role
     */
    @Get()
    @Roles('ADMIN', 'HR', 'FINANCE')
    @ApiOperation({ summary: 'Role-based Dashboard - All data filtered by role' })
    @ApiQuery({ name: 'year', type: Number, example: 2025 })
    @ApiQuery({ name: 'month', type: Number, example: 1 })
    async getDashboard(
        @CurrentUser('companyId') companyId: string,
        @CurrentUser('role') role: string,
        @Query('year') year: string,
        @Query('month') month: string,
    ): Promise<RoleBasedDashboardDto> {
        const y = parseInt(year) || new Date().getFullYear();
        const m = parseInt(month) || new Date().getMonth() + 1;

        const visibility = ROLE_VISIBILITY[role as keyof typeof ROLE_VISIBILITY] || ROLE_VISIBILITY.EMPLOYEE;

        const [summary, health, exceptions, trends] = await Promise.all([
            this.service.getSummary(companyId, y, m),
            this.service.getHealth(companyId, y, m),
            this.service.getExceptions(companyId, y, m),
            this.service.getTrends(companyId, 4),
        ]);

        return {
            role,
            summary: filterByRole(summary, visibility.summary),
            health: filterByRole(health, visibility.health),
            exceptions: filterByRole(exceptions, visibility.exceptions),
            trends: filterByRole(trends, visibility.trends),
        };
    }

    @Get('summary')
    @Roles('ADMIN', 'HR', 'FINANCE')
    @ApiOperation({ summary: 'Executive Summary - Main Dashboard Cards' })
    @ApiQuery({ name: 'year', type: Number, example: 2025 })
    @ApiQuery({ name: 'month', type: Number, example: 1 })
    async getSummary(
        @CurrentUser('companyId') companyId: string,
        @CurrentUser('role') role: string,
        @Query('year') year: string,
        @Query('month') month: string,
    ): Promise<Partial<DashboardSummaryDto>> {
        const data = await this.service.getSummary(
            companyId,
            parseInt(year) || new Date().getFullYear(),
            parseInt(month) || new Date().getMonth() + 1,
        );
        const visibility = ROLE_VISIBILITY[role as keyof typeof ROLE_VISIBILITY] || ROLE_VISIBILITY.EMPLOYEE;
        return filterByRole(data, visibility.summary);
    }

    @Get('health')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'Payroll Health Status - Can we lock?' })
    @ApiQuery({ name: 'year', type: Number, example: 2025 })
    @ApiQuery({ name: 'month', type: Number, example: 1 })
    async getHealth(
        @CurrentUser('companyId') companyId: string,
        @CurrentUser('role') role: string,
        @Query('year') year: string,
        @Query('month') month: string,
    ): Promise<Partial<DashboardHealthDto>> {
        const data = await this.service.getHealth(
            companyId,
            parseInt(year) || new Date().getFullYear(),
            parseInt(month) || new Date().getMonth() + 1,
        );
        const visibility = ROLE_VISIBILITY[role as keyof typeof ROLE_VISIBILITY] || ROLE_VISIBILITY.EMPLOYEE;
        return filterByRole(data, visibility.health);
    }

    @Get('exceptions')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'Exceptions & Alerts' })
    @ApiQuery({ name: 'year', type: Number, example: 2025 })
    @ApiQuery({ name: 'month', type: Number, example: 1 })
    async getExceptions(
        @CurrentUser('companyId') companyId: string,
        @CurrentUser('role') role: string,
        @Query('year') year: string,
        @Query('month') month: string,
    ): Promise<Partial<DashboardExceptionsDto>> {
        const data = await this.service.getExceptions(
            companyId,
            parseInt(year) || new Date().getFullYear(),
            parseInt(month) || new Date().getMonth() + 1,
        );
        const visibility = ROLE_VISIBILITY[role as keyof typeof ROLE_VISIBILITY] || ROLE_VISIBILITY.EMPLOYEE;
        return filterByRole(data, visibility.exceptions);
    }

    @Get('trends')
    @Roles('ADMIN', 'HR', 'FINANCE')
    @ApiOperation({ summary: 'Payroll Trends (Last N months)' })
    @ApiQuery({ name: 'months', type: Number, required: false, example: 4 })
    async getTrends(
        @CurrentUser('companyId') companyId: string,
        @CurrentUser('role') role: string,
        @Query('months') months?: string,
    ): Promise<Partial<DashboardTrendsDto>> {
        const data = await this.service.getTrends(companyId, parseInt(months || '4'));
        const visibility = ROLE_VISIBILITY[role as keyof typeof ROLE_VISIBILITY] || ROLE_VISIBILITY.EMPLOYEE;
        return filterByRole(data, visibility.trends);
    }

    @Get('users-stats')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'Quick Users Stats for Users Page' })
    async getUsersStats(
        @CurrentUser('companyId') companyId: string,
    ): Promise<{ totalActive: number; newThisMonth: number; onLeaveToday: number; pendingApprovals: number }> {
        return this.service.getUsersQuickStats(companyId);
    }
}
