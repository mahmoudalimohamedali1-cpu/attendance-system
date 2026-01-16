import { Controller, Get, Post, Body, Query, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { QiwaService } from './qiwa.service';

@ApiTags('قوى - Qiwa')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('qiwa')
export class QiwaController {
    constructor(private readonly qiwaService: QiwaService) { }

    @Get('contracts')
    @RequirePermission('QIWA_EXPORT')
    @ApiOperation({ summary: 'تصدير العقود بصيغة متوافقة مع قوى' })
    getContracts(@Request() req: any, @Query('status') status?: string) {
        return this.qiwaService.exportContracts(req.user.companyId, status);
    }

    @Get('contracts/csv')
    @RequirePermission('QIWA_EXPORT')
    @ApiOperation({ summary: 'تحميل ملف CSV للعقود' })
    async downloadContractsCsv(@Request() req: any, @Res() res: Response, @Query('status') status?: string) {
        const csv = await this.qiwaService.exportContractsCsv(req.user.companyId, status);

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=qiwa-contracts.csv');
        res.send(csv);
    }

    @Get('contracts/stats')
    @RequirePermission('QIWA_EXPORT')
    @ApiOperation({ summary: 'إحصائيات العقود' })
    getStats(@Request() req: any) {
        return this.qiwaService.getContractStats(req.user.companyId);
    }

    @Get('contracts/actions-required')
    @RequirePermission('QIWA_EXPORT')
    @ApiOperation({ summary: 'العقود التي تحتاج إجراء (انتهاء قريب)' })
    getActionsRequired(@Request() req: any) {
        return this.qiwaService.getContractsRequiringAction(req.user.companyId);
    }

    @Post('contracts/register')
    @RequirePermission('QIWA_REGISTER')
    @ApiOperation({ summary: 'تسجيل عقد في منصة قوى' })
    registerContract(@Request() req: any, @Body() body: { contractId: string }) {
        return this.qiwaService.registerContract(body.contractId, req.user.companyId, req.user.userId);
    }

    @Post('contracts/sync')
    @RequirePermission('QIWA_REGISTER')
    @ApiOperation({ summary: 'مزامنة حالة العقد من منصة قوى' })
    syncContract(@Request() req: any, @Body() body: { contractId: string }) {
        return this.qiwaService.syncContractStatus(body.contractId, req.user.companyId, req.user.userId);
    }
}

