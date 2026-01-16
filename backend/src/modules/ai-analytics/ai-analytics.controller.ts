import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AiAnalyticsService } from './ai-analytics.service';

@ApiTags('AI Analytics - تحليلات الذكاء الاصطناعي')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai-analytics')
export class AiAnalyticsController {
    constructor(private readonly analyticsService: AiAnalyticsService) { }

    /**
     * 📊 جلب نقاط أداء الموظف الحالي
     */
    @Get('my-score')
    @ApiOperation({ summary: 'جلب نقاط أدائي' })
    async getMyScore(@Request() req: any) {
        const score = await this.analyticsService.calculateEmployeeScore(req.user.id);
        return {
            success: true,
            data: score,
        };
    }

    /**
     * 📊 جلب نقاط أداء موظف معين (للمدراء)
     */
    @Get('employee/:id/score')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'جلب نقاط أداء موظف معين' })
    async getEmployeeScore(@Param('id') id: string) {
        const score = await this.analyticsService.calculateEmployeeScore(id);
        return {
            success: true,
            data: score,
        };
    }

    /**
     * 👥 تحليلات الفريق (للمدراء)
     */
    @Get('team')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'جلب تحليلات الفريق' })
    async getTeamAnalytics(@Request() req: any) {
        const analytics = await this.analyticsService.getTeamAnalytics(req.user.companyId);
        return {
            success: true,
            data: analytics,
        };
    }

    /**
     * 📈 رؤى الإنتاجية
     */
    @Get('my-insights')
    @ApiOperation({ summary: 'جلب رؤى الإنتاجية الشخصية' })
    async getMyInsights(@Request() req: any) {
        const insights = await this.analyticsService.getProductivityInsights(req.user.id);
        return {
            success: true,
            insights,
        };
    }

    /**
     * 🔮 توقع الغياب (للمدراء)
     */
    @Get('employee/:id/absence-prediction')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'توقع احتمالية غياب موظف' })
    async predictAbsence(@Param('id') id: string) {
        const prediction = await this.analyticsService.predictAbsence(id);
        return {
            success: true,
            data: prediction,
        };
    }

    /**
     * ⏰ أنماط التأخير (للمدراء)
     */
    @Get('late-patterns')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'كشف أنماط التأخير' })
    async getLatePatterns(@Request() req: any) {
        const patterns = await this.analyticsService.detectLatePatterns(req.user.companyId);
        return {
            success: true,
            data: patterns,
        };
    }
}
