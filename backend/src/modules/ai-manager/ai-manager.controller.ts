import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AiManagerService } from './ai-manager.service';

@ApiTags('AI Manager - لوحة المدير الذكية')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'HR', 'MANAGER')
@Controller('ai-manager')
export class AiManagerController {
    constructor(private readonly managerService: AiManagerService) { }

    /**
     * 💚 صحة الفريق
     */
    @Get('team-health')
    @ApiOperation({ summary: 'صحة الفريق الإجمالية' })
    async getTeamHealth(@Request() req: any) {
        const health = await this.managerService.getTeamHealthScore(req.user.companyId);
        return { success: true, data: health };
    }

    /**
     * ⚖️ توزيع عبء العمل
     */
    @Get('workload')
    @ApiOperation({ summary: 'تحليل توزيع عبء العمل' })
    async getWorkloadDistribution(@Request() req: any) {
        const workload = await this.managerService.analyzeWorkloadDistribution(req.user.companyId);
        return { success: true, data: workload };
    }

    /**
     * 🔥 مخاطر الإرهاق
     */
    @Get('burnout-risks')
    @ApiOperation({ summary: 'كشف مخاطر الإرهاق' })
    async getBurnoutRisks(@Request() req: any) {
        const risks = await this.managerService.detectBurnoutRisks(req.user.companyId);
        return { success: true, count: risks.length, data: risks };
    }

    /**
     * 🤖 نصائح AI للمدير
     */
    @Get('insights')
    @ApiOperation({ summary: 'نصائح AI للمدير' })
    async getManagerInsights(@Request() req: any) {
        const insights = await this.managerService.getManagerInsights(req.user.companyId);
        return { success: true, insights };
    }
}
