import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WpsExportService } from './wps-export.service';
import { WpsTrackingService } from '../wps-tracking/wps-tracking.service';
import * as crypto from 'crypto';

@ApiTags('WPS Export')
@Controller('wps-export')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WpsExportController {
    constructor(
        private wpsExportService: WpsExportService,
        private wpsTrackingService: WpsTrackingService,
    ) { }

    @Get(':payrollRunId/validate')
    @ApiOperation({ summary: 'التحقق من جاهزية التصدير' })
    async validateExport(
        @Param('payrollRunId') payrollRunId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.wpsExportService.validateExportReadiness(payrollRunId, companyId);
    }

    @Get(':payrollRunId/csv')
    @ApiOperation({ summary: 'تصدير ملف WPS بصيغة CSV' })
    async exportCsv(
        @Param('payrollRunId') payrollRunId: string,
        @CurrentUser('companyId') companyId: string,
        @CurrentUser('sub') userId: string,
        @Res() res: Response,
    ) {
        const result = await this.wpsExportService.generateWpsFile(payrollRunId, companyId);

        // Create tracking record
        const fileContent = '\uFEFF' + result.content;
        const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex');

        try {
            await this.wpsTrackingService.createSubmission({
                payrollRunId,
                filename: result.filename,
                fileFormat: 'CSV',
                fileHashSha256: fileHash,
            }, companyId, userId);
        } catch (err) {
            // Log but don't fail if tracking fails
            console.error('Failed to create WPS tracking record:', err);
        }

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`);
        res.send(fileContent);
    }

    @Get(':payrollRunId/sarie')
    @ApiOperation({ summary: 'تصدير ملف WPS بصيغة SARIE (البنك المركزي)' })
    async exportSarie(
        @Param('payrollRunId') payrollRunId: string,
        @CurrentUser('companyId') companyId: string,
        @CurrentUser('sub') userId: string,
        @Res() res: Response,
    ) {
        const result = await this.wpsExportService.generateSarieFile(payrollRunId, companyId);

        // Create tracking record
        const fileHash = crypto.createHash('sha256').update(result.content).digest('hex');

        try {
            await this.wpsTrackingService.createSubmission({
                payrollRunId,
                filename: result.filename,
                fileFormat: 'SARIE',
                fileHashSha256: fileHash,
            }, companyId, userId);
        } catch (err) {
            // Log but don't fail if tracking fails
            console.error('Failed to create WPS tracking record:', err);
        }

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`);
        res.send(result.content);
    }

    @Get(':payrollRunId/summary')
    @ApiOperation({ summary: 'ملخص التصدير بدون تنزيل' })
    async exportSummary(
        @Param('payrollRunId') payrollRunId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        const result = await this.wpsExportService.generateWpsFile(payrollRunId, companyId);
        return {
            filename: result.filename,
            recordCount: result.recordCount,
            totalAmount: result.totalAmount,
            errors: result.errors,
        };
    }

    @Get('missing-bank')
    @ApiOperation({ summary: 'قائمة الموظفين بدون حساب بنكي' })
    async getMissingBank(@CurrentUser('companyId') companyId: string) {
        return this.wpsExportService.getEmployeesWithoutBank(companyId);
    }
}
