import { Controller, Post, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EosService } from './eos.service';
import { CalculateEosDto } from './dto/calculate-eos.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('EOS - End of Service')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('eos')
export class EosController {
    constructor(private readonly service: EosService) { }

    // ========================================
    // حساب المكافأة (للمعاينة فقط)
    // ========================================
    @Post('calculate/:userId')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'حساب مكافأة نهاية الخدمة لموظف (معاينة)' })
    calculateEos(@Param('userId') userId: string, @Body() dto: CalculateEosDto) {
        return this.service.calculateEos(userId, dto);
    }

    // ========================================
    // تأكيد إنهاء الخدمات
    // ========================================
    @Post('terminate/:userId')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'تأكيد إنهاء خدمات موظف وإنشاء طلب التسوية' })
    terminateEmployee(
        @Param('userId') userId: string,
        @Body() dto: CalculateEosDto,
        @CurrentUser('id') createdById: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.service.terminateEmployee(userId, dto, createdById, companyId);
    }

    // ========================================
    // قائمة طلبات الإنهاء
    // ========================================
    @Get('terminations')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'قائمة طلبات إنهاء الخدمات' })
    @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'HR_APPROVED', 'APPROVED', 'PAID', 'CANCELLED'] })
    getTerminations(
        @CurrentUser('companyId') companyId: string,
        @Query('status') status?: string,
    ) {
        return this.service.getTerminations(companyId, status);
    }

    // ========================================
    // تفاصيل تسوية معينة
    // ========================================
    @Get('terminations/:id')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'تفاصيل طلب إنهاء خدمات' })
    getTerminationById(
        @Param('id') id: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.service.getTerminationById(id, companyId);
    }

    // ========================================
    // الموافقة على طلب الإنهاء
    // ========================================
    @Patch('terminations/:id/approve')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'الموافقة على طلب إنهاء الخدمات وتغيير حالة الموظف' })
    approveTermination(
        @Param('id') id: string,
        @CurrentUser('id') approvedById: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.service.approveTermination(id, approvedById, companyId);
    }

    // ========================================
    // إلغاء طلب الإنهاء
    // ========================================
    @Patch('terminations/:id/cancel')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'إلغاء طلب إنهاء الخدمات' })
    cancelTermination(
        @Param('id') id: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.service.cancelTermination(id, companyId);
    }
}
