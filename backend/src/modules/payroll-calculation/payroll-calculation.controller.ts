import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PayrollCalculationService } from './payroll-calculation.service';
import { PayrollValidationService } from './payroll-validation.service';
import { WpsGeneratorService } from './wps-generator.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Response } from 'express';

@ApiTags('Payroll Calculation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll-calculation')
export class PayrollCalculationController {
    constructor(
        private readonly service: PayrollCalculationService,
        private readonly validationService: PayrollValidationService,
        private readonly wpsService: WpsGeneratorService,
    ) { }

    @Get('preview')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'معاينة حساب راتب موظف قبل التشغيل' })
    @ApiQuery({ name: 'employeeId', required: true })
    @ApiQuery({ name: 'year', required: true })
    @ApiQuery({ name: 'month', required: true })
    async previewCalculation(
        @Query('employeeId') employeeId: string,
        @Query('year') year: string,
        @Query('month') month: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.service.previewCalculation(
            employeeId,
            companyId,
            parseInt(year),
            parseInt(month),
        );
    }

    @Get('validate-period')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'التحقق من بيانات الموظفين قبل تشغيل הرواتب' })
    @ApiQuery({ name: 'periodId', required: true })
    async validatePeriod(@Query('periodId') periodId: string, @CurrentUser('companyId') companyId: string) {
        return this.validationService.validatePeriod(periodId, companyId);
    }

    @Get('export-wps-excel')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'تصدير ملف حماية الأجور (WPS) بتنسيق Excel' })
    @ApiQuery({ name: 'runId', required: true })
    async exportWpsExcel(@Query('runId') runId: string, @CurrentUser('companyId') companyId: string, @Res() res: Response) {
        const buffer = await this.wpsService.generateWpsExcel(runId, companyId);
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename=WPS_${runId}.xlsx`,
            'Content-Length': buffer.length,
        });
        res.send(buffer);
    }

    @Get('export-wps-csv')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'تصدير ملف حماية الأجور (WPS) بتنسيق CSV' })
    @ApiQuery({ name: 'runId', required: true })
    async exportWpsCsv(@Query('runId') runId: string, @CurrentUser('companyId') companyId: string, @Res() res: Response) {
        const csv = await this.wpsService.generateWpsCsv(runId, companyId);
        res.set({
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename=WPS_${runId}.csv`,
        });
        res.send(csv);
    }
}
