import { Controller, Get, Post, Param, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { QiwaService } from './qiwa.service';
import { SaudizationService } from './services/saudization.service';
import { ComplianceWarningsService } from './services/compliance-warnings.service';

@ApiTags('قوى - Qiwa')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('qiwa')
export class QiwaController {
    constructor(
        private readonly qiwaService: QiwaService,
        private readonly saudizationService: SaudizationService,
        private readonly complianceWarningsService: ComplianceWarningsService,
    ) { }

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

    @Get('saudization/ratio')
    @RequirePermission('QIWA_EXPORT')
    @ApiOperation({ summary: 'نسبة السعودة الإجمالية للشركة' })
    @ApiQuery({ name: 'targetRatio', type: Number, required: false, example: 75 })
    getSaudizationRatio(
        @CurrentUser('companyId') companyId: string,
        @Query('targetRatio') targetRatio?: string,
    ) {
        return this.saudizationService.getCompanySaudizationRatio(
            companyId,
            targetRatio ? parseInt(targetRatio) : undefined,
        );
    }

    @Get('saudization/by-branch')
    @RequirePermission('QIWA_EXPORT')
    @ApiOperation({ summary: 'نسبة السعودة حسب الفروع' })
    @ApiQuery({ name: 'targetRatio', type: Number, required: false, example: 75 })
    getSaudizationByBranch(
        @CurrentUser('companyId') companyId: string,
        @Query('targetRatio') targetRatio?: string,
    ) {
        return this.saudizationService.getSaudizationByBranch(
            companyId,
            targetRatio ? parseInt(targetRatio) : undefined,
        );
    }

    @Get('saudization/by-department')
    @RequirePermission('QIWA_EXPORT')
    @ApiOperation({ summary: 'نسبة السعودة حسب الأقسام' })
    @ApiQuery({ name: 'branchId', type: String, required: false })
    @ApiQuery({ name: 'targetRatio', type: Number, required: false, example: 75 })
    getSaudizationByDepartment(
        @CurrentUser('companyId') companyId: string,
        @Query('branchId') branchId?: string,
        @Query('targetRatio') targetRatio?: string,
    ) {
        return this.saudizationService.getSaudizationByDepartment(
            companyId,
            branchId,
            targetRatio ? parseInt(targetRatio) : undefined,
        );
    }

    @Get('saudization/branch/:id')
    @RequirePermission('QIWA_EXPORT')
    @ApiOperation({ summary: 'نسبة السعودة لفرع محدد' })
    @ApiQuery({ name: 'targetRatio', type: Number, required: false, example: 75 })
    getBranchSaudizationRatio(
        @CurrentUser('companyId') companyId: string,
        @Param('id') branchId: string,
        @Query('targetRatio') targetRatio?: string,
    ) {
        return this.saudizationService.getBranchSaudizationRatio(
            companyId,
            branchId,
            targetRatio ? parseInt(targetRatio) : undefined,
        );
    }

    @Get('saudization/department/:id')
    @RequirePermission('QIWA_EXPORT')
    @ApiOperation({ summary: 'نسبة السعودة لقسم محدد' })
    @ApiQuery({ name: 'targetRatio', type: Number, required: false, example: 75 })
    getDepartmentSaudizationRatio(
        @CurrentUser('companyId') companyId: string,
        @Param('id') departmentId: string,
        @Query('targetRatio') targetRatio?: string,
    ) {
        return this.saudizationService.getDepartmentSaudizationRatio(
            companyId,
            departmentId,
            targetRatio ? parseInt(targetRatio) : undefined,
        );
    }

    @Get('compliance/warnings')
    @RequirePermission('QIWA_EXPORT')
    @ApiOperation({ summary: 'تحذيرات الامتثال لمتطلبات قوى' })
    getComplianceWarnings(@CurrentUser('companyId') companyId: string) {
        return this.complianceWarningsService.getComplianceWarnings(companyId);
    }
}

