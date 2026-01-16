import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AiPayrollService } from './ai-payroll.service';

@ApiTags('AI Payroll - تحليلات الرواتب الذكية')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai-payroll')
export class AiPayrollController {
    constructor(private readonly payrollService: AiPayrollService) { }

    /**
     * 🔍 كشف الشذوذ في الرواتب
     */
    @Get('anomalies')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'كشف الشذوذ في الرواتب' })
    async detectAnomalies(@Request() req: any) {
        const anomalies = await this.payrollService.detectSalaryAnomalies(req.user.companyId);
        return {
            success: true,
            count: anomalies.length,
            data: anomalies,
        };
    }

    /**
     * 💰 تقييم مخاطر السلفة
     */
    @Post('advance-risk')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'تقييم مخاطر السلفة' })
    async assessAdvanceRisk(@Body() body: { userId: string; amount: number }) {
        const assessment = await this.payrollService.assessAdvanceRisk(body.userId, body.amount);
        return {
            success: true,
            data: assessment,
        };
    }

    /**
     * 📊 تحسين الخصومات
     */
    @Get('deduction-tips/:userId')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'نصائح لتحسين الخصومات' })
    async getDeductionTips(@Param('userId') userId: string) {
        const tips = await this.payrollService.getDeductionOptimizations(userId);
        return {
            success: true,
            tips,
        };
    }

    /**
     * 📈 اتجاهات الرواتب
     */
    @Get('trends')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'تحليل اتجاهات الرواتب' })
    async getSalaryTrends(@Request() req: any) {
        const trends = await this.payrollService.getSalaryTrends(req.user.companyId);
        return {
            success: true,
            data: trends,
        };
    }
}
