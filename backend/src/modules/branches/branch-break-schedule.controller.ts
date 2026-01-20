import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
    Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { BranchBreakScheduleService, CreateBreakScheduleDto, UpdateBreakScheduleDto } from './branch-break-schedule.service';

@Controller('branches/:branchId/break-schedules')
@UseGuards(JwtAuthGuard)
export class BranchBreakScheduleController {
    constructor(private readonly breakScheduleService: BranchBreakScheduleService) { }

    /**
     * إنشاء جدول استراحة جديد للفرع
     * POST /api/v1/branches/:branchId/break-schedules
     */
    @Post()
    async create(
        @Param('branchId') branchId: string,
        @Body() dto: CreateBreakScheduleDto,
        @Request() req: any,
    ) {
        return this.breakScheduleService.create(branchId, req.user.companyId, dto);
    }

    /**
     * الحصول على جميع استراحات الفرع
     * GET /api/v1/branches/:branchId/break-schedules
     */
    @Get()
    async findAll(@Param('branchId') branchId: string) {
        return this.breakScheduleService.findByBranch(branchId);
    }

    /**
     * تحديث جدول استراحة
     * PATCH /api/v1/branches/:branchId/break-schedules/:id
     */
    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateBreakScheduleDto,
        @Request() req: any,
    ) {
        return this.breakScheduleService.update(id, req.user.companyId, dto);
    }

    /**
     * حذف جدول استراحة
     * DELETE /api/v1/branches/:branchId/break-schedules/:id
     */
    @Delete(':id')
    async delete(@Param('id') id: string, @Request() req: any) {
        return this.breakScheduleService.delete(id, req.user.companyId);
    }

    /**
     * إنشاء استراحات افتراضية للفرع
     * POST /api/v1/branches/:branchId/break-schedules/create-defaults
     */
    @Post('create-defaults')
    async createDefaults(
        @Param('branchId') branchId: string,
        @Request() req: any,
    ) {
        return this.breakScheduleService.createDefaultBreaks(branchId, req.user.companyId);
    }

    /**
     * الحصول على إجمالي دقائق الاستراحات المدفوعة
     * GET /api/v1/branches/:branchId/break-schedules/paid-minutes
     */
    @Get('paid-minutes')
    async getPaidMinutes(@Param('branchId') branchId: string) {
        const minutes = await this.breakScheduleService.getTotalPaidBreakMinutes(branchId);
        return { paidBreakMinutes: minutes };
    }

    /**
     * الحصول على إجمالي دقائق الاستراحات غير المدفوعة
     * GET /api/v1/branches/:branchId/break-schedules/unpaid-minutes
     */
    @Get('unpaid-minutes')
    async getUnpaidMinutes(@Param('branchId') branchId: string) {
        const minutes = await this.breakScheduleService.getTotalUnpaidBreakMinutes(branchId);
        return { unpaidBreakMinutes: minutes };
    }
}
