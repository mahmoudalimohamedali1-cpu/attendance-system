import { Controller, Get, Post, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LoanPaymentsService } from './loan-payments.service';
import { CreateLoanPaymentDto } from './dto/create-loan-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Loan Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('loan-payments')
export class LoanPaymentsController {
    constructor(private readonly service: LoanPaymentsService) { }

    @Post()
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'تسجيل دفعة سداد جديدة' })
    create(@Body() dto: CreateLoanPaymentDto, @Request() req: any) {
        return this.service.create(dto, req.user.id);
    }

    @Get('advance/:advanceId')
    @ApiOperation({ summary: 'مدفوعات سلفة معينة' })
    findByAdvance(@Param('advanceId') advanceId: string) {
        return this.service.findByAdvance(advanceId);
    }

    @Get('summary/:advanceId')
    @ApiOperation({ summary: 'ملخص السلفة مع المدفوعات' })
    getSummary(@Param('advanceId') advanceId: string) {
        return this.service.getAdvanceSummary(advanceId);
    }

    @Get('active')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'جميع السلف النشطة مع الأرصدة' })
    getActiveLoans() {
        return this.service.getActiveLoansWithBalance();
    }

    @Delete(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'حذف دفعة (تصحيح خطأ)' })
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
