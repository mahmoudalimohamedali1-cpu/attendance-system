import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AiPredictiveService } from './ai-predictive.service';

@ApiTags('AI Predictive - التحليلات التنبؤية')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'HR', 'MANAGER')
@Controller('ai-predictive')
export class AiPredictiveController {
    constructor(private readonly predictiveService: AiPredictiveService) { }

    /**
     * 📊 توقع الحضور
     */
    @Get('attendance-forecast')
    @ApiOperation({ summary: 'توقع الحضور المستقبلي' })
    async forecastAttendance(@Request() req: any, @Query('days') days?: string) {
        const forecast = await this.predictiveService.forecastAttendance(
            req.user.companyId,
            days ? parseInt(days) : 7
        );
        return { success: true, data: forecast };
    }

    /**
     * 🚪 توقع الدوران
     */
    @Get('turnover-prediction')
    @ApiOperation({ summary: 'توقع معدل الدوران' })
    async predictTurnover(@Request() req: any) {
        const prediction = await this.predictiveService.predictTurnover(req.user.companyId);
        return { success: true, data: prediction };
    }

    /**
     * 💰 توقع التكاليف
     */
    @Get('cost-forecast')
    @ApiOperation({ summary: 'توقع التكاليف المستقبلية' })
    async forecastCosts(@Request() req: any) {
        const forecast = await this.predictiveService.forecastCosts(req.user.companyId);
        return { success: true, data: forecast };
    }

    /**
     * 🤖 توقعات AI شاملة
     */
    @Get('ai-predictions')
    @ApiOperation({ summary: 'توقعات AI شاملة' })
    async getAiPredictions(@Request() req: any) {
        const predictions = await this.predictiveService.getAiPredictions(req.user.companyId);
        return { success: true, predictions };
    }
}
