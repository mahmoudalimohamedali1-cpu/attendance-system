import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ExceptionsService } from './exceptions.service';

@ApiTags('Exceptions Center')
@Controller('exceptions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExceptionsController {
    constructor(private exceptionsService: ExceptionsService) { }

    @Get('validate')
    @ApiOperation({ summary: 'فحص شامل للموظفين قبل الرواتب' })
    async validateEmployees(@CurrentUser('companyId') companyId: string) {
        return this.exceptionsService.validateEmployeesForPayroll(companyId);
    }

    @Get('validate/:payrollRunId')
    @ApiOperation({ summary: 'فحص مسير رواتب معين' })
    async validatePayrollRun(
        @Param('payrollRunId') payrollRunId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.exceptionsService.validatePayrollRun(payrollRunId, companyId);
    }

    @Get('stats')
    @ApiOperation({ summary: 'إحصائيات سريعة للوحة القيادة' })
    async getQuickStats(@CurrentUser('companyId') companyId: string) {
        return this.exceptionsService.getQuickStats(companyId);
    }
}
