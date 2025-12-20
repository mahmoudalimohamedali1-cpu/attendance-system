import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PayrollPeriodsService } from './payroll-periods.service';
import { CreatePayrollPeriodDto } from './dto/create-payroll-period.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Payroll Periods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll-periods')
export class PayrollPeriodsController {
    constructor(private readonly service: PayrollPeriodsService) { }

    @Post()
    @Roles('ADMIN')
    @ApiOperation({ summary: 'إنشاء فترة رواتب جديدة' })
    create(@Body() dto: CreatePayrollPeriodDto, @CurrentUser('companyId') companyId: string) {
        return this.service.create(dto, companyId);
    }

    @Get()
    @ApiOperation({ summary: 'عرض جميع فترات الرواتب' })
    findAll(@CurrentUser('companyId') companyId: string) {
        return this.service.findAll(companyId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'تفاصيل فترة الرواتب' })
    findOne(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
        return this.service.findOne(id, companyId);
    }

    @Patch(':id/status')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'تحديث حالة فترة الرواتب' })
    updateStatus(
        @Param('id') id: string,
        @CurrentUser('companyId') companyId: string,
        @Body('status') status: string
    ) {
        return this.service.updateStatus(id, companyId, status);
    }
}
