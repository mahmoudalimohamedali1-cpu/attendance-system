import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SaudizationService } from './saudization.service';
import { NitaqatAlertService } from './services/nitaqat-alert.service';
import { SaudizationRecommendationService } from './services/saudization-recommendation.service';

@ApiTags('Saudization')
@ApiBearerAuth()
@Controller('saudization')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SaudizationController {
    constructor(
        private readonly saudizationService: SaudizationService,
        private readonly alertService: NitaqatAlertService,
        private readonly recommendationService: SaudizationRecommendationService,
    ) { }

    @Get('statistics')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'Get saudization statistics' })
    async getStatistics(@CurrentUser('companyId') companyId: string) {
        return this.saudizationService.getStatistics(companyId);
    }

    @Get('trend')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'Get saudization trend over time' })
    @ApiQuery({ name: 'months', required: false, type: Number })
    async getTrend(
        @CurrentUser('companyId') companyId: string,
        @Query('months') months?: string,
    ) {
        return this.saudizationService.getTrend(companyId, months ? parseInt(months) : 12);
    }

    @Get('compliance')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'Get compliance status' })
    async getComplianceStatus(@CurrentUser('companyId') companyId: string) {
        return this.saudizationService.getComplianceStatus(companyId);
    }

    @Get('alerts')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'Get Nitaqat alerts' })
    async getAlerts(@CurrentUser('companyId') companyId: string) {
        return this.alertService.getAlerts(companyId);
    }

    @Get('recommendations')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'Get AI-powered recommendations' })
    async getRecommendations(@CurrentUser('companyId') companyId: string) {
        return this.recommendationService.getRecommendations(companyId);
    }
}
