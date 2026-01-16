import { Controller, Get, Post, Param, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
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
    getContracts(
        @CurrentUser('companyId') companyId: string,
        @Query('status') status?: string,
    ) {
        return this.qiwaService.exportContracts(companyId, status);
    }

    @Get('contracts/csv')
    @RequirePermission('QIWA_EXPORT')
    @ApiOperation({ summary: 'تحميل ملف CSV للعقود' })
    async downloadContractsCsv(
        @CurrentUser('companyId') companyId: string,
        @Res() res: Response,
        @Query('status') status?: string,
    ) {
        const csv = await this.qiwaService.exportContractsCsv(companyId, status);

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=qiwa-contracts.csv');
        res.send(csv);
    }

    @Get('contracts/stats')
    @RequirePermission('QIWA_EXPORT')
    @ApiOperation({ summary: 'إحصائيات العقود' })
    getStats(@CurrentUser('companyId') companyId: string) {
        return this.qiwaService.getContractStats(companyId);
    }

    @Get('contracts/actions-required')
    @RequirePermission('QIWA_EXPORT')
    @ApiOperation({ summary: 'العقود التي تحتاج إجراء (انتهاء قريب)' })
    getActionsRequired(@CurrentUser('companyId') companyId: string) {
        return this.qiwaService.getContractsRequiringAction(companyId);
    }

    @Get('contracts/pending-sync')
    @RequirePermission('QIWA_EXPORT')
    @ApiOperation({ summary: 'العقود التي تحتاج توثيق في قوى' })
    getContractsPendingSync(@CurrentUser('companyId') companyId: string) {
        return this.qiwaService.getContractsPendingQiwa(companyId);
    }

    @Post('contracts/register/:id')
    @RequirePermission('QIWA_REGISTER')
    @ApiOperation({ summary: 'تسجيل عقد في منصة قوى' })
    registerContract(
        @Param('id') contractId: string,
        @CurrentUser('companyId') companyId: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.qiwaService.registerContract(contractId, companyId, userId);
    }

    @Post('contracts/sync/:id')
    @RequirePermission('QIWA_REGISTER')
    @ApiOperation({ summary: 'مزامنة حالة العقد من منصة قوى' })
    syncContract(
        @Param('id') contractId: string,
        @CurrentUser('companyId') companyId: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.qiwaService.syncContractStatus(contractId, companyId, userId);
    }
}

