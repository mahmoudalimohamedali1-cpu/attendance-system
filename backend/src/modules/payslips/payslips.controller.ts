import { Controller, Get, Query, UseGuards, Param, Res, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PdfService } from '../../common/pdf/pdf.service';

@ApiTags('Payslips')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payslips')
export class PayslipsController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly pdfService: PdfService,
    ) { }

    @Get()
    @ApiOperation({ summary: 'Get payslips with filters' })
    async findAll(
        @CurrentUser('companyId') companyId: string,
        @Query('payrollRunId') payrollRunId?: string,
        @Query('periodId') periodId?: string,
        @Query('search') search?: string,
    ) {
        const where: any = { companyId };

        if (payrollRunId) {
            where.runId = payrollRunId;
        }

        if (periodId) {
            where.periodId = periodId;
        }

        if (search) {
            where.employee = {
                OR: [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { employeeCode: { contains: search, mode: 'insensitive' } },
                ],
            };
        }

        return this.prisma.payslip.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        jobTitle: true,
                        department: { select: { name: true } },
                    },
                },
                period: {
                    select: {
                        month: true,
                        year: true,
                    },
                },
                run: {
                    select: {
                        id: true,
                        status: true,
                    },
                },
                lines: {
                    include: {
                        component: {
                            select: {
                                code: true,
                                nameAr: true,
                                nameEn: true,
                            },
                        },
                    },
                },
            },
            orderBy: [
                { employee: { firstName: 'asc' } },
            ],
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get single payslip details' })
    async findOne(
        @Param('id') id: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.prisma.payslip.findFirst({
            where: { id, companyId },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        jobTitle: true,
                        department: { select: { name: true } },
                    },
                },
                period: {
                    select: {
                        month: true,
                        year: true,
                    },
                },
                lines: {
                    include: {
                        component: {
                            select: {
                                code: true,
                                nameAr: true,
                                nameEn: true,
                            },
                        },
                    },
                },
            },
        });
    }

    @Get(':id/pdf')
    @ApiOperation({ summary: 'Download payslip as PDF' })
    @Header('Content-Type', 'application/pdf')
    async downloadPdf(
        @Param('id') id: string,
        @Res() res: Response,
    ) {
        const buffer = await this.pdfService.generatePayslipPdf(id);
        res.set({
            'Content-Disposition': `attachment; filename="payslip-${id}.pdf"`,
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }
}
