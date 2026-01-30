import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
    PayrollAdjustmentsService,
    CreateAdjustmentDto,
    ApproveAdjustmentDto,
    InstantAdjustmentDto,
} from './payroll-adjustments.service';
import { DeductionApprovalService } from './deduction-approval.service';

@Controller('payroll-adjustments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayrollAdjustmentsController {
    constructor(
        private readonly service: PayrollAdjustmentsService,
        private readonly approvalService: DeductionApprovalService,
    ) { }

    /**
     * ⚡ إنشاء خصم/مكافأة فورية
     * POST /payroll-adjustments/instant
     */
    @Post('instant')
    @Roles('ADMIN', 'MANAGER', 'HR')
    async createInstant(
        @Body() dto: InstantAdjustmentDto,
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.service.createInstant(dto, userId, companyId);
    }

    /**
     * 📋 جلب التسويات المعلقة
     * GET /payroll-adjustments/pending
     */
    @Get('pending')
    @Roles('ADMIN', 'MANAGER', 'HR', 'ACCOUNTANT')
    async findPending(
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.service.findPendingByCompany(companyId);
    }

    /**
     * 📊 إحصائيات الفترة الحالية
     * GET /payroll-adjustments/stats
     */
    @Get('stats')
    @Roles('ADMIN', 'MANAGER', 'HR', 'ACCOUNTANT')
    async getStats(
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.service.getCurrentPeriodStats(companyId);
    }

    /**
     * 🕐 معاينة خصومات الحضور للفترة الحالية
     * GET /payroll-adjustments/attendance-deductions-preview
     */
    @Get('attendance-deductions-preview')
    @Roles('ADMIN', 'MANAGER', 'HR', 'ACCOUNTANT')
    async getAttendanceDeductionsPreview(
        @Query('periodId') periodId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.service.getAttendanceDeductionsPreview(companyId, periodId);
    }

    /**
     * 💰 معاينة أقساط السلف للفترة الحالية
     * GET /payroll-adjustments/advance-deductions-preview
     */
    @Get('advance-deductions-preview')
    @Roles('ADMIN', 'MANAGER', 'HR', 'ACCOUNTANT')
    async getAdvanceDeductionsPreview(
        @Query('periodId') periodId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.service.getAdvanceDeductionsPreview(companyId, periodId);
    }

    /**
     * 🏥 معاينة خصومات الإجازات للفترة الحالية
     * GET /payroll-adjustments/leave-deductions-preview
     */
    @Get('leave-deductions-preview')
    @Roles('ADMIN', 'MANAGER', 'HR', 'ACCOUNTANT')
    async getLeaveDeductionsPreview(
        @Query('periodId') periodId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.service.getLeaveDeductionsPreview(companyId, periodId);
    }

    /**
     * 🏛️ معاينة التأمينات الاجتماعية (GOSI) للفترة الحالية
     * GET /payroll-adjustments/gosi-preview
     */
    @Get('gosi-preview')
    @Roles('ADMIN', 'MANAGER', 'HR', 'ACCOUNTANT')
    async getGosiPreview(
        @Query('periodId') periodId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.service.getGosiPreview(companyId, periodId);
    }


    /**
     * إنشاء تسوية جديدة
     * POST /payroll-adjustments
     */
    @Post()
    @Roles('ADMIN', 'MANAGER', 'ACCOUNTANT')
    async create(
        @Body() dto: CreateAdjustmentDto,
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.service.create(dto, userId, companyId);
    }

    /**
     * جلب تسويات مسيّر معين
     * GET /payroll-adjustments/by-run/:runId
     */
    @Get('by-run/:runId')
    async findByPayrollRun(
        @Param('runId') runId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.service.findByPayrollRun(runId, companyId);
    }

    /**
     * جلب تسويات موظف معين
     * GET /payroll-adjustments/by-employee/:employeeId
     */
    @Get('by-employee/:employeeId')
    async findByEmployee(
        @Param('employeeId') employeeId: string,
        @Query('runId') runId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.service.findByEmployee(employeeId, companyId, runId);
    }

    /**
     * احتساب إجمالي التسويات المعتمدة لموظف
     * GET /payroll-adjustments/totals/:employeeId/:runId
     */
    @Get('totals/:employeeId/:runId')
    async getAdjustmentsTotals(
        @Param('employeeId') employeeId: string,
        @Param('runId') runId: string,
    ) {
        return this.service.getApprovedAdjustmentsTotal(employeeId, runId);
    }

    /**
     * اعتماد أو رفض تسوية
     * POST /payroll-adjustments/approve
     */
    @Post('approve')
    @Roles('ADMIN', 'MANAGER')
    async approve(
        @Body() dto: ApproveAdjustmentDto,
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.service.approve(dto, userId, companyId);
    }

    /**
     * حذف تسوية (فقط لو PENDING)
     * DELETE /payroll-adjustments/:id
     */
    @Delete(':id')
    @Roles('ADMIN', 'MANAGER', 'ACCOUNTANT')
    async delete(
        @Param('id') id: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.service.delete(id, companyId);
    }

    // ==================== نظام اعتماد الخصومات ====================

    /**
     * 📋 جلب الخصومات المعلقة للاعتماد
     * GET /payroll-adjustments/deductions/pending
     */
    @Get('deductions/pending')
    @Roles('ADMIN', 'MANAGER', 'HR', 'ACCOUNTANT')
    async getPendingDeductions(
        @Query('periodId') periodId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.approvalService.getPendingDeductions(companyId, periodId);
    }

    /**
     * ✅ اعتماد خصم
     * POST /payroll-adjustments/deductions/:id/approve
     */
    @Post('deductions/:id/approve')
    @Roles('ADMIN', 'MANAGER', 'HR')
    async approveDeduction(
        @Param('id') id: string,
        @Body('notes') notes: string,
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.approvalService.approveDeduction(id, companyId, userId, notes);
    }

    /**
     * ❌ رفض خصم
     * POST /payroll-adjustments/deductions/:id/reject
     */
    @Post('deductions/:id/reject')
    @Roles('ADMIN', 'MANAGER', 'HR')
    async rejectDeduction(
        @Param('id') id: string,
        @Body('reason') reason: string,
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.approvalService.rejectDeduction(id, companyId, userId, reason);
    }

    /**
     * ✏️ تعديل مبلغ الخصم
     * POST /payroll-adjustments/deductions/:id/modify
     */
    @Post('deductions/:id/modify')
    @Roles('ADMIN', 'MANAGER', 'HR')
    async modifyDeduction(
        @Param('id') id: string,
        @Body('amount') amount: number,
        @Body('notes') notes: string,
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.approvalService.modifyDeduction(id, companyId, userId, amount, notes);
    }

    /**
     * 🔄 تحويل الخصم لإجازة
     * POST /payroll-adjustments/deductions/:id/convert-to-leave
     */
    @Post('deductions/:id/convert-to-leave')
    @Roles('ADMIN', 'MANAGER', 'HR')
    async convertToLeave(
        @Param('id') id: string,
        @Body('leaveType') leaveType: string,
        @Body('days') days: number,
        @Body('notes') notes: string,
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.approvalService.convertToLeave(id, companyId, userId, leaveType, days, notes);
    }

    /**
     * 📊 جلب سجل التدقيق للخصم
     * GET /payroll-adjustments/deductions/:id/audit-log
     */
    @Get('deductions/:id/audit-log')
    @Roles('ADMIN', 'MANAGER', 'HR', 'ACCOUNTANT')
    async getDeductionAuditLog(
        @Param('id') id: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.approvalService.getDeductionAuditLog(id, companyId);
    }
}

