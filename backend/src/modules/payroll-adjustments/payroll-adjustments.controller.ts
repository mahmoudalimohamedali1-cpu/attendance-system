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
} from './payroll-adjustments.service';

@Controller('payroll-adjustments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayrollAdjustmentsController {
    constructor(private readonly service: PayrollAdjustmentsService) { }

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
}
