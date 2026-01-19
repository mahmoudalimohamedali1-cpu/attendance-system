import { Controller, Get, Post, Body, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WpsExportService } from './wps-export.service';
import { WpsTrackingService } from '../wps-tracking/wps-tracking.service';
import { ValidateMudadDto } from './dto/validate-mudad.dto';
import * as crypto from 'crypto';

@ApiTags('WPS Export')
@Controller('wps-export')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WpsExportController {
    constructor(
        private wpsExportService: WpsExportService,
        private wpsTrackingService: WpsTrackingService,
    ) { }

    @Get(':payrollRunId/validate')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'التحقق من جاهزية التصدير' })
    async validateExport(
        @Param('payrollRunId') payrollRunId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.wpsExportService.validateExportReadiness(payrollRunId, companyId);
    }

    // ============================================
    // MUDAD Validation Endpoints
    // ============================================

    @Post(':payrollRunId/validate-mudad')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'التحقق من صحة البيانات للتقديم إلى نظام مُدد مع خيارات متقدمة' })
    async validateMudadWithOptions(
        @Param('payrollRunId') payrollRunId: string,
        @Body() dto: ValidateMudadDto,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.wpsExportService.validateForMudad(payrollRunId, companyId, {
            strictMode: dto.strictMode,
            skipCompanyValidation: dto.skipCompanyValidation,
        });
    }

    @Get(':payrollRunId/validate-mudad')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'التحقق من صحة البيانات للتقديم إلى نظام مُدد' })
    async validateMudad(
        @Param('payrollRunId') payrollRunId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.wpsExportService.validateForMudad(payrollRunId, companyId);
    }

    @Get(':payrollRunId/validate-mudad/quick')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'تحقق سريع من صحة البيانات للتقديم إلى نظام مُدد' })
    async quickValidateMudad(
        @Param('payrollRunId') payrollRunId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.wpsExportService.quickValidateMudad(payrollRunId, companyId);
    }

    // ============================================
    // Export Endpoints
    // ============================================

    @Get(':payrollRunId/csv')
    @Roles('ADMIN', 'HR')
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
    @Roles('ADMIN', 'HR')
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
    @Roles('ADMIN', 'HR')
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

    // ============================================
    // Helper Endpoints
    // ============================================

    @Get('missing-bank')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'قائمة الموظفين بدون حساب بنكي' })
    async getMissingBank(@CurrentUser('companyId') companyId: string) {
        return this.wpsExportService.getEmployeesWithoutBank(companyId);
    }
}
