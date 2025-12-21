import { Controller, Get, Query, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { QiwaService } from './qiwa.service';

@ApiTags('قوى - Qiwa')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('qiwa')
export class QiwaController {
    constructor(private readonly qiwaService: QiwaService) { }

    @Get('contracts')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'تصدير العقود بصيغة متوافقة مع قوى' })
    getContracts(@Request() req: any, @Query('status') status?: string) {
        return this.qiwaService.exportContracts(req.user.companyId, status);
    }

    @Get('contracts/csv')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'تحميل ملف CSV للعقود' })
    async downloadContractsCsv(@Request() req: any, @Res() res: Response, @Query('status') status?: string) {
        const csv = await this.qiwaService.exportContractsCsv(req.user.companyId, status);

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=qiwa-contracts.csv');
        res.send(csv);
    }

    @Get('contracts/stats')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'إحصائيات العقود' })
    getStats(@Request() req: any) {
        return this.qiwaService.getContractStats(req.user.companyId);
    }

    @Get('contracts/actions-required')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'العقود التي تحتاج إجراء (انتهاء قريب)' })
    getActionsRequired(@Request() req: any) {
        return this.qiwaService.getContractsRequiringAction(req.user.companyId);
    }
}
