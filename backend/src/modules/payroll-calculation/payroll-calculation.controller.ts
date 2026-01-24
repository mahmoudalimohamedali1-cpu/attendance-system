import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { PayrollCalculationService } from './payroll-calculation.service';
import { PayrollValidationService } from './payroll-validation.service';
import { WpsGeneratorService } from './wps-generator.service';
import { FormulaEngineService } from './services/formula-engine.service';
import { BonusService } from './services/bonus.service';
import { CommissionService } from './services/commission.service';
import { AllowanceService } from './services/allowance.service';
import { TaxCalculatorService } from './services/tax-calculator.service';
import { SalaryAdvanceService } from './services/salary-advance.service';
import { PayrollRecalculationService } from './services/payroll-recalculation.service';
import { PayrollReportsService } from './services/payroll-reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PermissionsService } from '../permissions/permissions.service';
import { ForbiddenException } from '@nestjs/common';
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
        private readonly formulaEngine: FormulaEngineService,
        private readonly permissionsService: PermissionsService,
        private readonly bonusService: BonusService,
        private readonly commissionService: CommissionService,
        private readonly allowanceService: AllowanceService,
        private readonly taxService: TaxCalculatorService,
        private readonly advanceService: SalaryAdvanceService,
        private readonly recalculationService: PayrollRecalculationService,
        private readonly reportsService: PayrollReportsService,
    ) { }

    @Get('preview')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'معاينة حساب راتب موظف قبل التشغيل' })
    @ApiQuery({ name: 'employeeId', required: true })
    @ApiQuery({ name: 'year', required: false })
    @ApiQuery({ name: 'month', required: false })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    async previewCalculation(
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
        @Query('employeeId') employeeId: string,
        @Query('year') year?: string,
        @Query('month') month?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        // 🔥 Enforce Scope-based Permissions
        const access = await this.permissionsService.canAccessEmployee(
            userId,
            companyId,
            'PAYROLL_VIEW',
            employeeId
        );
        if (!access.hasAccess) {
            throw new ForbiddenException(`ليس لديك صلاحية للوصول لبيانات هذا الموظف: ${access.reason}`);
        }

        if (startDate && endDate) {
            return this.service.calculateForEmployee(
                employeeId,
                companyId,
                new Date(startDate),
                new Date(endDate),
                year ? parseInt(year) : undefined,
                month ? parseInt(month) : undefined,
            );
        }

        return this.service.previewCalculation(
            employeeId,
            companyId,
            parseInt(year || new Date().getFullYear().toString()),
            parseInt(month || (new Date().getMonth() + 1).toString()),
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

    @Post('test-formula')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'اختبار معادلة حساب الراتب' })
    async testFormula(
        @Body() dto: { formula: string; basicSalary?: number; variables?: Record<string, number> },
    ) {
        const variables = this.formulaEngine.buildVariableContext({
            basicSalary: dto.basicSalary || 5000,
            ...dto.variables,
        });

        const result = this.formulaEngine.evaluate(dto.formula, variables);

        return {
            formula: dto.formula,
            result: result.value,
            error: result.error,
            usedVariables: Object.keys(variables).filter(k =>
                dto.formula.toUpperCase().includes(k)
            ).map(k => ({ name: k, value: variables[k] })),
            supportedVariables: this.formulaEngine.getSupportedVariables(),
            supportedFunctions: this.formulaEngine.getSupportedFunctions(),
        };
    }

    @Get('formula-info')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'معلومات محرك المعادلات' })
    async getFormulaInfo() {
        return {
            supportedVariables: this.formulaEngine.getSupportedVariables(),
            supportedFunctions: this.formulaEngine.getSupportedFunctions(),
            examples: [
                { formula: 'BASIC * 0.25', description: 'بدل السكن 25% من الأساسي' },
                { formula: 'GOSI_BASE * GOSI_RATE_EMP', description: 'خصم GOSI للموظف' },
                { formula: 'OT_HOURS * HOURLY_RATE * 1.5', description: 'الوقت الإضافي' },
                { formula: 'if(DAYS_ABSENT > 0, DAILY_RATE * DAYS_ABSENT, 0)', description: 'خصم الغياب' },
                { formula: 'max(0, LATE_MINUTES - 15) * MINUTE_RATE', description: 'خصم التأخير مع فترة سماح' },
            ],
        };
    }

    // ==================== نظام المكافآت ====================

    @Post('bonus/programs')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'إنشاء برنامج مكافآت جديد' })
    async createBonusProgram(
        @Body() dto: any,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.bonusService.createBonusProgram(dto, companyId);
    }

    @Get('bonus/programs')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'جلب جميع برامج المكافآت' })
    async getBonusPrograms(@CurrentUser('companyId') companyId: string) {
        return this.bonusService.getBonusPrograms(companyId);
    }

    @Post('bonus/calculate')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'حساب مكافأة لموظف' })
    async calculateBonus(
        @Body() dto: { employeeId: string; programId: string; periodYear: number; periodMonth?: number },
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.bonusService.calculateBonusForEmployee(
            dto.employeeId,
            companyId,
            dto.programId,
            dto.periodYear,
            dto.periodMonth,
        );
    }

    @Post('bonus/generate-bulk')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'توليد مكافآت جماعية' })
    async generateBulkBonuses(
        @Body() dto: any,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.bonusService.generateBulkBonuses(dto, companyId);
    }

    @Post('bonus/create')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'إنشاء مكافأة فردية' })
    async createEmployeeBonus(
        @Body() dto: any,
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.bonusService.createEmployeeBonus(dto, companyId, userId);
    }

    @Post('bonus/:id/approve')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'الموافقة على مكافأة' })
    async approveBonus(
        @Param('id') bonusId: string,
        @Body() dto: { adjustedAmount?: number; notes?: string },
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.bonusService.approveBonus({ bonusId, ...dto }, companyId, userId);
    }

    @Post('bonus/:id/revert')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'إلغاء / استرجاع مكافأة معتمدة' })
    async revertBonus(
        @Param('id') bonusId: string,
        @Body() dto: { reason?: string },
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.bonusService.revertBonus(bonusId, companyId, dto.reason);
    }

    @Get('bonus/pending')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'جلب المكافآت المعلقة للموافقة' })
    async getPendingBonuses(@CurrentUser('companyId') companyId: string) {
        return this.bonusService.getPendingBonuses(companyId);
    }

    @Get('bonus/approved')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'جلب المكافآت المعتمدة (يمكن إلغاؤها)' })
    async getApprovedBonuses(@CurrentUser('companyId') companyId: string) {
        return this.bonusService.getApprovedBonuses(companyId);
    }

    @Get('bonus/statistics')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'إحصائيات المكافآت' })
    @ApiQuery({ name: 'year', required: false })
    async getBonusStatistics(
        @Query('year') year: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.bonusService.getBonusStatistics(companyId, year ? parseInt(year) : undefined);
    }

    @Post('bonus/trigger/:bonusType')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'تشغيل توليد المكافآت يدوياً حسب النوع' })
    @ApiParam({ name: 'bonusType', enum: ['MONTHLY', 'QUARTERLY', 'ANNUAL', 'EID', 'RAMADAN'] })
    async triggerBonusGeneration(
        @Param('bonusType') bonusType: string,
    ) {
        // Import and call the scheduler manually
        const result = await this.bonusService.triggerScheduledBonuses(bonusType);
        return result;
    }

    // ==================== نظام العمولات ====================

    @Post('commission/plans')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'إنشاء خطة عمولات جديدة' })
    async createCommissionPlan(
        @Body() dto: any,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.commissionService.createCommissionPlan(dto, companyId);
    }

    @Get('commission/plans')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'جلب جميع خطط العمولات' })
    async getCommissionPlans(@CurrentUser('companyId') companyId: string) {
        return this.commissionService.getCommissionPlans(companyId);
    }

    @Post('commission/record')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'تسجيل معاملة عمولة' })
    async recordCommission(
        @Body() dto: any,
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.commissionService.recordCommission(dto, companyId, userId);
    }

    @Post('commission/record-bulk')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'تسجيل معاملات عمولة متعددة' })
    async bulkRecordCommissions(
        @Body() dto: any,
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.commissionService.bulkRecordCommissions(dto, companyId, userId);
    }

    @Post('commission/:id/approve')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'الموافقة على عمولة' })
    async approveCommission(
        @Param('id') transactionId: string,
        @Body() dto: { adjustedAmount?: number; notes?: string },
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.commissionService.approveCommission({ transactionId, ...dto }, companyId, userId);
    }

    @Post('commission/:id/clawback')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'استرجاع عمولة' })
    async clawbackCommission(
        @Param('id') transactionId: string,
        @Body() dto: { reason: string; amount?: number },
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.commissionService.clawbackCommission({ transactionId, ...dto }, companyId, userId);
    }

    @Get('commission/pending')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'جلب العمولات المعلقة' })
    async getPendingCommissions(@CurrentUser('companyId') companyId: string) {
        return this.commissionService.getPendingCommissions(companyId);
    }

    @Get('commission/report')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'تقرير العمولات' })
    @ApiQuery({ name: 'startDate', required: true })
    @ApiQuery({ name: 'endDate', required: true })
    async getCommissionReport(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.commissionService.getCommissionReport(
            companyId,
            new Date(startDate),
            new Date(endDate),
        );
    }

    // ==================== نظام البدلات ====================

    @Post('allowances/definitions')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'إنشاء تعريف بدل جديد' })
    async createAllowanceDefinition(
        @Body() dto: any,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.allowanceService.createAllowanceDefinition(dto, companyId);
    }

    @Get('allowances/definitions')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'جلب جميع تعريفات البدلات' })
    @ApiQuery({ name: 'type', required: false })
    async getAllowanceDefinitions(
        @Query('type') type: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.allowanceService.getAllowanceDefinitions(companyId, type as any);
    }

    @Post('allowances/assign')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'تخصيص بدل لموظف' })
    async assignAllowance(
        @Body() dto: any,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.allowanceService.assignAllowanceToEmployee(dto, companyId);
    }

    @Post('allowances/assign-bulk')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'تخصيص بدل لمجموعة موظفين' })
    async bulkAssignAllowance(
        @Body() dto: any,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.allowanceService.bulkAssignAllowance(dto, companyId);
    }

    @Get('allowances/employee/:employeeId')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'حساب بدلات موظف' })
    @ApiQuery({ name: 'year', required: true })
    @ApiQuery({ name: 'month', required: true })
    async calculateEmployeeAllowances(
        @Param('employeeId') employeeId: string,
        @Query('year') year: string,
        @Query('month') month: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.allowanceService.calculateEmployeeAllowances(
            employeeId,
            companyId,
            parseInt(year),
            parseInt(month),
        );
    }

    @Get('allowances/summary')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'ملخص البدلات للشركة' })
    @ApiQuery({ name: 'year', required: true })
    @ApiQuery({ name: 'month', required: true })
    async getAllowanceSummary(
        @Query('year') year: string,
        @Query('month') month: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.allowanceService.getAllowanceSummary(
            companyId,
            parseInt(year),
            parseInt(month),
        );
    }

    // ==================== حاسبة الضرائب ====================

    @Post('tax/calculate')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'حساب الضريبة لموظف' })
    async calculateTax(
        @Body() dto: any,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.taxService.calculateTax(dto, companyId);
    }

    @Get('tax/configuration')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'جلب إعدادات الضريبة' })
    async getTaxConfiguration(@CurrentUser('companyId') companyId: string) {
        return this.taxService.getTaxConfiguration(companyId);
    }

    @Post('tax/configuration')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'حفظ إعدادات الضريبة' })
    async saveTaxConfiguration(
        @Body() dto: any,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.taxService.saveTaxConfiguration(dto, companyId);
    }

    @Get('tax/systems')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'جلب الأنظمة الضريبية المتاحة' })
    async getAvailableTaxSystems() {
        return this.taxService.getAvailableTaxSystems();
    }

    @Post('tax/load-default')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'تحميل نظام ضريبي افتراضي' })
    async loadDefaultTaxSystem(
        @Body() dto: { taxSystem: string },
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.taxService.loadDefaultTaxSystem(dto.taxSystem as any, companyId);
    }

    // ==================== نظام السلف ====================

    @Post('advances/policies')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'إنشاء سياسة سلف جديدة' })
    async createAdvancePolicy(
        @Body() dto: any,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.advanceService.createAdvancePolicy(dto, companyId);
    }

    @Get('advances/policies')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'جلب سياسات السلف' })
    @ApiQuery({ name: 'type', required: false })
    async getAdvancePolicies(
        @Query('type') type: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.advanceService.getAdvancePolicies(companyId, type as any);
    }

    @Post('advances/request')
    @Roles('ADMIN', 'HR', 'MANAGER', 'EMPLOYEE')
    @ApiOperation({ summary: 'تقديم طلب سلفة' })
    async createAdvanceRequest(
        @Body() dto: any,
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.advanceService.createAdvanceRequest(dto, dto.employeeId || userId, companyId);
    }

    @Post('advances/:id/approve')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'الموافقة على سلفة' })
    async approveAdvance(
        @Param('id') advanceId: string,
        @Body() dto: any,
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.advanceService.approveAdvance({ advanceId, ...dto }, userId, companyId);
    }

    @Post('advances/:id/reject')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'رفض سلفة' })
    async rejectAdvance(
        @Param('id') advanceId: string,
        @Body() dto: { reason: string },
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.advanceService.rejectAdvance(advanceId, userId, dto.reason, companyId);
    }

    @Post('advances/:id/payment')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'تسجيل دفعة على سلفة' })
    async recordAdvancePayment(
        @Param('id') advanceId: string,
        @Body() dto: any,
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.advanceService.recordPayment({ advanceId, ...dto }, userId, companyId);
    }

    @Get('advances/:id/schedule')
    @Roles('ADMIN', 'HR', 'EMPLOYEE')
    @ApiOperation({ summary: 'جلب جدول سداد سلفة' })
    async getAdvanceSchedule(
        @Param('id') advanceId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.advanceService.generateRepaymentSchedule(advanceId, companyId);
    }

    @Get('advances/pending')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'جلب السلف المعلقة' })
    async getPendingAdvances(@CurrentUser('companyId') companyId: string) {
        return this.advanceService.getPendingAdvances(companyId);
    }

    @Get('advances/employee/:employeeId')
    @Roles('ADMIN', 'HR', 'MANAGER', 'EMPLOYEE')
    @ApiOperation({ summary: 'جلب سلف موظف' })
    async getEmployeeAdvances(
        @Param('employeeId') employeeId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.advanceService.getEmployeeAdvances(employeeId, companyId);
    }

    @Get('advances/employee/:employeeId/summary')
    @Roles('ADMIN', 'HR', 'MANAGER', 'EMPLOYEE')
    @ApiOperation({ summary: 'ملخص سلف موظف' })
    async getEmployeeAdvanceSummary(
        @Param('employeeId') employeeId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.advanceService.getEmployeeAdvanceSummary(employeeId, companyId);
    }

    // ==================== إعادة الحساب ====================

    @Post('recalculate')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'طلب إعادة حساب الرواتب' })
    async createRecalculationRequest(
        @Body() dto: any,
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.recalculationService.createRecalculationRequest(dto, userId, companyId);
    }

    @Post('recalculate/:id/approve')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'الموافقة على إعادة الحساب' })
    async approveRecalculation(
        @Param('id') requestId: string,
        @Body() dto: { notes?: string },
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.recalculationService.approveRecalculation({ requestId, ...dto }, userId, companyId);
    }

    @Get('recalculate/requests')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'جلب طلبات إعادة الحساب' })
    async getRecalculationRequests(@CurrentUser('companyId') companyId: string) {
        return this.recalculationService.getRecalculationRequests(companyId);
    }

    // ==================== التقارير ====================

    @Get('reports/:reportType')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'جلب تقرير معين' })
    @ApiParam({ name: 'reportType', enum: ['summary', 'detailed', 'departments', 'gosi', 'bank-transfers', 'trends'] })
    @ApiQuery({ name: 'year', required: true })
    @ApiQuery({ name: 'month', required: true })
    async getReportByType(
        @Param('reportType') reportType: string,
        @Query('year') year: string,
        @Query('month') month: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        const yearNum = parseInt(year);
        const monthNum = parseInt(month);

        switch (reportType) {
            case 'summary':
                return this.reportsService.generatePayrollSummary(companyId, yearNum, monthNum);
            case 'detailed':
                return this.reportsService.generatePayrollDetailed(companyId, yearNum, monthNum);
            case 'departments':
                return this.reportsService.generateDepartmentAnalysis(companyId, yearNum, monthNum);
            case 'gosi':
                return this.reportsService.generateGosiReport(companyId, yearNum, monthNum);
            case 'bank-transfers':
                return this.reportsService.generateBankTransferReport(companyId, yearNum, monthNum);
            case 'trends':
                // For trends, calculate last 12 months
                const endMonth = monthNum;
                const endYear = yearNum;
                const startMonth = monthNum === 12 ? 1 : monthNum + 1;
                const startYear = monthNum === 12 ? yearNum : yearNum - 1;
                return this.reportsService.generateTrendAnalysis(companyId, startYear, startMonth, endYear, endMonth);
            default:
                return { error: 'نوع التقرير غير معروف' };
        }
    }

    @Get('reports/summary')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'تقرير ملخص الرواتب' })
    @ApiQuery({ name: 'year', required: true })
    @ApiQuery({ name: 'month', required: true })
    async getPayrollSummaryReport(
        @Query('year') year: string,
        @Query('month') month: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.reportsService.generatePayrollSummary(
            companyId,
            parseInt(year),
            parseInt(month),
        );
    }

    @Get('reports/detailed')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'تقرير الرواتب التفصيلي' })
    @ApiQuery({ name: 'year', required: true })
    @ApiQuery({ name: 'month', required: true })
    @ApiQuery({ name: 'departmentId', required: false })
    async getPayrollDetailedReport(
        @Query('year') year: string,
        @Query('month') month: string,
        @Query('departmentId') departmentId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.reportsService.generatePayrollDetailed(
            companyId,
            parseInt(year),
            parseInt(month),
            departmentId,
        );
    }

    @Get('reports/departments')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'تقرير تحليل الأقسام' })
    @ApiQuery({ name: 'year', required: true })
    @ApiQuery({ name: 'month', required: true })
    async getDepartmentAnalysisReport(
        @Query('year') year: string,
        @Query('month') month: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.reportsService.generateDepartmentAnalysis(
            companyId,
            parseInt(year),
            parseInt(month),
        );
    }

    @Get('reports/gosi')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'تقرير التأمينات الاجتماعية' })
    @ApiQuery({ name: 'year', required: true })
    @ApiQuery({ name: 'month', required: true })
    async getGosiReport(
        @Query('year') year: string,
        @Query('month') month: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.reportsService.generateGosiReport(
            companyId,
            parseInt(year),
            parseInt(month),
        );
    }

    @Get('reports/bank-transfers')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'تقرير التحويلات البنكية' })
    @ApiQuery({ name: 'year', required: true })
    @ApiQuery({ name: 'month', required: true })
    async getBankTransferReport(
        @Query('year') year: string,
        @Query('month') month: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.reportsService.generateBankTransferReport(
            companyId,
            parseInt(year),
            parseInt(month),
        );
    }

    @Get('reports/trends')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'تقرير تحليل الاتجاهات' })
    @ApiQuery({ name: 'startYear', required: true })
    @ApiQuery({ name: 'startMonth', required: true })
    @ApiQuery({ name: 'endYear', required: true })
    @ApiQuery({ name: 'endMonth', required: true })
    async getTrendAnalysisReport(
        @Query('startYear') startYear: string,
        @Query('startMonth') startMonth: string,
        @Query('endYear') endYear: string,
        @Query('endMonth') endMonth: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.reportsService.generateTrendAnalysis(
            companyId,
            parseInt(startYear),
            parseInt(startMonth),
            parseInt(endYear),
            parseInt(endMonth),
        );
    }
}

