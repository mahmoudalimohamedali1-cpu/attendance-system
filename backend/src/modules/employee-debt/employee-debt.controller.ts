/**
 * Employee Debt Controller
 *
 * واجهة API لإدارة ديون الموظفين
 */

import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EmployeeDebtService } from './employee-debt.service';
import { CreateDebtDto, ManualPaymentDto, WriteOffDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DebtStatus, DebtSourceType } from '@prisma/client';

@ApiTags('Employee Debts - ديون الموظفين')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employee-debts')
export class EmployeeDebtController {
    constructor(private readonly service: EmployeeDebtService) {}

    // ==========================================
    // List All Debts (for Admin Dashboard)
    // ==========================================

    @Get()
    @Roles('ADMIN', 'HR', 'FINANCE')
    @ApiOperation({ summary: 'قائمة جميع الديون' })
    @ApiQuery({ name: 'status', required: false, enum: DebtStatus })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getAllDebts(
        @CurrentUser('companyId') companyId: string,
        @Query('status') status?: DebtStatus,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.service.getAllDebts(companyId, {
            status,
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 10,
        });
    }

    // ==========================================
    // Company-level Routes
    // ==========================================

    @Get('summary')
    @Roles('ADMIN', 'HR', 'FINANCE')
    @ApiOperation({ summary: 'ملخص ديون الشركة' })
    getCompanySummary(@CurrentUser('companyId') companyId: string) {
        return this.service.getCompanyDebtSummary(companyId);
    }

    @Get('employees-with-debts')
    @Roles('ADMIN', 'HR', 'FINANCE')
    @ApiOperation({ summary: 'الموظفون الذين لديهم ديون نشطة' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'offset', required: false, type: Number })
    getEmployeesWithDebts(
        @CurrentUser('companyId') companyId: string,
        @Query('limit') limit?: number,
        @Query('offset') offset?: number,
    ) {
        return this.service.getEmployeesWithActiveDebts(companyId, {
            limit: limit ? Number(limit) : undefined,
            offset: offset ? Number(offset) : undefined,
        });
    }

    // ==========================================
    // Employee-specific Routes
    // ==========================================

    @Get('employee/:employeeId')
    @Roles('ADMIN', 'HR', 'FINANCE')
    @ApiOperation({ summary: 'ديون موظف معين' })
    @ApiQuery({ name: 'status', required: false, enum: DebtStatus, isArray: true })
    @ApiQuery({ name: 'includeTransactions', required: false, type: Boolean })
    getEmployeeDebts(
        @Param('employeeId', ParseUUIDPipe) employeeId: string,
        @CurrentUser('companyId') companyId: string,
        @Query('status') status?: DebtStatus | DebtStatus[],
        @Query('includeTransactions') includeTransactions?: string,
    ) {
        const statusArray = status
            ? Array.isArray(status) ? status : [status]
            : undefined;

        return this.service.getEmployeeDebts(employeeId, companyId, {
            status: statusArray,
            includeTransactions: includeTransactions === 'true',
        });
    }

    @Get('employee/:employeeId/total')
    @Roles('ADMIN', 'HR', 'FINANCE')
    @ApiOperation({ summary: 'إجمالي الديون النشطة لموظف' })
    async getEmployeeTotalDebts(
        @Param('employeeId', ParseUUIDPipe) employeeId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        const total = await this.service.getTotalActiveDebts(employeeId, companyId);
        return { employeeId, totalActiveDebts: Number(total.toFixed(2)) };
    }

    @Post('employee/:employeeId')
    @Roles('ADMIN', 'HR', 'FINANCE')
    @ApiOperation({ summary: 'إنشاء دين جديد لموظف' })
    createDebt(
        @Param('employeeId', ParseUUIDPipe) employeeId: string,
        @CurrentUser('companyId') companyId: string,
        @Body() dto: CreateDebtDto,
    ) {
        return this.service.createDebt({
            companyId,
            employeeId,
            amount: dto.amount,
            sourceType: dto.sourceType,
            sourceId: dto.sourceId,
            periodId: dto.periodId,
            reason: dto.reason,
            notes: dto.notes,
        });
    }

    // ==========================================
    // Single Debt Routes
    // ==========================================

    @Get(':id')
    @Roles('ADMIN', 'HR', 'FINANCE')
    @ApiOperation({ summary: 'تفاصيل دين معين' })
    getDebtById(@Param('id', ParseUUIDPipe) id: string) {
        return this.service.getDebtById(id);
    }

    @Get(':id/ledger')
    @Roles('ADMIN', 'HR', 'FINANCE')
    @ApiOperation({ summary: 'حركات دين معين' })
    getDebtLedger(@Param('id', ParseUUIDPipe) id: string) {
        return this.service.getDebtTransactions(id);
    }

    @Post(':id/payment')
    @Roles('ADMIN', 'HR', 'FINANCE')
    @ApiOperation({ summary: 'سداد يدوي لدين' })
    makePayment(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('id') userId: string,
        @Body() dto: ManualPaymentDto,
    ) {
        return this.service.makeManualPayment({
            debtId: id,
            amount: dto.amount,
            description: dto.description,
            processedBy: userId,
        });
    }

    @Patch(':id/write-off')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'شطب دين' })
    writeOff(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('id') userId: string,
        @Body() dto: WriteOffDto,
    ) {
        return this.service.writeOffDebt({
            debtId: id,
            reason: dto.reason,
            processedBy: userId,
        });
    }

    @Patch(':id/suspend')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'إيقاف دين مؤقتاً' })
    suspend(@Param('id', ParseUUIDPipe) id: string) {
        return this.service.suspendDebt(id, true);
    }

    @Patch(':id/resume')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'استئناف دين موقوف' })
    resume(@Param('id', ParseUUIDPipe) id: string) {
        return this.service.suspendDebt(id, false);
    }
}
