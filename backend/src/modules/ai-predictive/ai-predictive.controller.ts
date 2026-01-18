import { Controller, Get, Post, Query, Param, UseGuards, Request } from '@nestjs/common';
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

    /**
     * 🎯 توقعات غياب الموظفين
     */
    @Get('employee-predictions')
    @ApiOperation({ summary: 'الحصول على توقعات غياب جميع الموظفين' })
    async getEmployeePredictions(@Request() req: any, @Query('targetDate') targetDate?: string) {
        const date = targetDate ? new Date(targetDate) : undefined;
        return await this.predictiveService.getEmployeeAbsencePredictions(req.user.companyId, date);
    }

    /**
     * 🎯 توقع غياب موظف محدد مع الشرح
     */
    @Get('employee-predictions/:id')
    @ApiOperation({ summary: 'الحصول على توقع غياب موظف محدد مع شرح مفصل' })
    async getEmployeePrediction(
        @Request() req: any,
        @Param('id') userId: string,
        @Query('targetDate') targetDate?: string,
    ) {
        const date = targetDate ? new Date(targetDate) : undefined;
        return await this.predictiveService.getEmployeePredictionWithExplanation(
            userId,
            req.user.companyId,
            date,
        );
    }

    /**
     * 🔍 الأنماط المكتشفة
     */
    @Get('patterns')
    @ApiOperation({ summary: 'الحصول على أنماط الغياب المكتشفة' })
    async getPatterns(
        @Request() req: any,
        @Query('patternType') patternType?: string,
        @Query('limit') limit?: string,
    ) {
        const limitNum = limit ? parseInt(limit) : 20;
        return await this.predictiveService.getAbsencePatterns(req.user.companyId, patternType, limitNum);
    }

    /**
     * 📊 دقة النموذج
     */
    @Get('model-accuracy')
    @ApiOperation({ summary: 'الحصول على مقاييس دقة النموذج' })
    async getModelAccuracy(@Request() req: any) {
        return await this.predictiveService.getModelAccuracy(req.user.companyId);
    }

    /**
     * 🤖 تدريب النموذج
     */
    @Post('train-model')
    @ApiOperation({ summary: 'تدريب نموذج التعلم الآلي' })
    async trainModel(@Request() req: any) {
        return await this.predictiveService.trainModel(req.user.companyId);
    }

    /**
     * 💡 التوصيات
     */
    @Get('recommendations')
    @ApiOperation({ summary: 'الحصول على التوصيات بناءً على التوقعات والأنماط' })
    async getRecommendations(@Request() req: any) {
        return await this.predictiveService.getRecommendations(req.user.companyId);
    }
}
