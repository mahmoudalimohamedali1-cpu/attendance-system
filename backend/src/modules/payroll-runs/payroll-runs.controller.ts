import { Controller, Get, Post, Body, Param, Patch, UseGuards, Request, Res, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { PayrollRunsService } from './payroll-runs.service';
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PdfService } from '../../common/pdf/pdf.service';
import { ExcelService } from '../../common/excel/excel.service';
import { EmailService } from '../../common/email/email.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('Payroll Runs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll-runs')
export class PayrollRunsController {
    constructor(
        private readonly service: PayrollRunsService,
        private readonly pdfService: PdfService,
        private readonly excelService: ExcelService,
        private readonly emailService: EmailService,
        private readonly prisma: PrismaService,
    ) { }

    @Post()
    @Roles('ADMIN')
    @ApiOperation({ summary: 'تشغيل احتساب مسير الرواتب' })
    create(@Body() dto: CreatePayrollRunDto, @CurrentUser('companyId') companyId: string, @CurrentUser('id') userId: string) {
        return this.service.create(dto, companyId, userId);
    }

    @Get()
    @ApiOperation({ summary: 'عرض جميع تشغيلات الرواتب' })
    findAll(@CurrentUser('companyId') companyId: string) {
        return this.service.findAll(companyId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'تفاصيل تشغيل معين والمسودات الناتجة' })
    findOne(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
        return this.service.findOne(id, companyId);
    }

    @Patch(':id/approve')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'اعتماد مسير الرواتب' })
    approve(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
        return this.service.approve(id, companyId);
    }

    @Patch(':id/pay')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'تأكيد صرف الرواتب' })
    pay(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
        return this.service.pay(id, companyId);
    }

    @Get('payslip/:payslipId/pdf')
    @ApiOperation({ summary: 'تحميل قسيمة الراتب PDF' })
    @Header('Content-Type', 'application/pdf')
    async downloadPayslipPdf(@Param('payslipId') payslipId: string, @Res() res: Response) {
        const buffer = await this.pdfService.generatePayslipPdf(payslipId);
        res.set({
            'Content-Disposition': `attachment; filename="payslip-${payslipId}.pdf"`,
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }

    @Get(':id/excel')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'تحميل مسير الرواتب Excel' })
    @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    async downloadExcel(@Param('id') id: string, @Res() res: Response) {
        const buffer = await this.excelService.generatePayrollRunExcel(id);
        res.set({
            'Content-Disposition': `attachment; filename="payroll-${id}.xlsx"`,
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }

    @Post(':id/send-emails')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'إرسال قسائم الرواتب بالبريد الإلكتروني' })
    async sendPayslipEmails(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
        const run = await this.prisma.payrollRun.findFirst({
            where: { id, companyId },
            include: {
                period: true,
                payslips: { include: { employee: true } },
            },
        });

        if (!run) throw new Error('Payroll run not found');

        const results = { sent: 0, failed: 0 };

        for (const payslip of run.payslips) {
            if (!payslip.employee.email) {
                results.failed++;
                continue;
            }

            const pdfBuffer = await this.pdfService.generatePayslipPdf(payslip.id);
            const sent = await this.emailService.sendPayslipEmail(
                payslip.employee.email,
                `${payslip.employee.firstName} ${payslip.employee.lastName}`,
                run.period.month,
                run.period.year,
                pdfBuffer,
            );

            if (sent) results.sent++;
            else results.failed++;
        }

        return { message: `تم إرسال ${results.sent} قسيمة، فشل ${results.failed}`, ...results };
    }
}
