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
    WaiveDeductionDto,
    ModifyDeductionDto,
    ConvertToLeaveDto,
} from './payroll-adjustments.service';

@Controller('payroll-adjustments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayrollAdjustmentsController {
    constructor(private readonly service: PayrollAdjustmentsService) { }

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

    // ==================== إجراءات اعتماد الخصومات ====================

    /**
     * ❌ إلغاء خصم (رفض كامل)
     * POST /payroll-adjustments/attendance-deductions/waive
     */
    @Post('attendance-deductions/waive')
    @Roles('ADMIN', 'MANAGER', 'HR')
    async waiveDeduction(
        @Body() dto: WaiveDeductionDto,
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.service.waiveDeduction(dto, userId, companyId);
    }

    /**
     * ✏️ تعديل مبلغ الخصم
     * POST /payroll-adjustments/attendance-deductions/modify
     */
    @Post('attendance-deductions/modify')
    @Roles('ADMIN', 'MANAGER', 'HR')
    async modifyDeduction(
        @Body() dto: ModifyDeductionDto,
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.service.modifyDeduction(dto, userId, companyId);
    }

    /**
     * 🔄 تحويل الخصم لإجازة
     * POST /payroll-adjustments/attendance-deductions/convert-to-leave
     */
    @Post('attendance-deductions/convert-to-leave')
    @Roles('ADMIN', 'MANAGER', 'HR')
    async convertToLeave(
        @Body() dto: ConvertToLeaveDto,
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.service.convertDeductionToLeave(dto, userId, companyId);
    }
}

