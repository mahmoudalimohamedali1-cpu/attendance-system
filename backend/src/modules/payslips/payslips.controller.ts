import { Controller, Get, Query, UseGuards, Param, Res, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PdfService } from '../../common/pdf/pdf.service';
import { PermissionsService } from '../permissions/permissions.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

@ApiTags('Payslips')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payslips')
export class PayslipsController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly pdfService: PdfService,
        private readonly permissionsService: PermissionsService,
    ) { }

    /**
     * Employee Self-Service: Get my own payslips
     */
    @Get('my')
    @ApiOperation({ summary: 'Get my payslips (Employee Self-Service)' })
    async getMyPayslips(
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        const payslips = await this.prisma.payslip.findMany({
            where: {
                employeeId: userId,
                companyId,
                status: { in: ['PAID', 'LOCKED', 'FINANCE_APPROVED'] }, // Only show finalized payslips
            },
            include: {
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
            orderBy: [
                { period: { year: 'desc' } },
                { period: { month: 'desc' } },
            ],
        });

        return payslips.map(payslip => {
            const earnings = payslip.lines.filter(l => l.sign === 'EARNING');
            const deductions = payslip.lines.filter(l => l.sign === 'DEDUCTION');

            return {
                id: payslip.id,
                month: payslip.period.month,
                year: payslip.period.year,
                periodLabel: `${payslip.period.month}/${payslip.period.year}`,
                baseSalary: Number(payslip.baseSalary),
                grossSalary: Number(payslip.grossSalary),
                totalDeductions: Number(payslip.totalDeductions),
                netSalary: Number(payslip.netSalary),
                status: payslip.status,
                earnings: earnings.map(l => ({
                    name: l.component?.nameAr || l.component?.nameEn || l.component?.code,
                    amount: Number(l.amount),
                    description: l.descriptionAr,
                })),
                deductions: deductions.map(l => ({
                    name: l.component?.nameAr || l.component?.nameEn || l.component?.code,
                    amount: Number(l.amount),
                    description: l.descriptionAr,
                })),
            };
        });
    }

    @Get()
    @ApiOperation({ summary: 'Get payslips with filters' })
    async findAll(
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
        @Query('payrollRunId') payrollRunId?: string,
        @Query('periodId') periodId?: string,
        @Query('search') search?: string,
    ) {
        // 🔥 Get Accessible Employee IDs (Scope-based)
        const accessibleIds = await this.permissionsService.getAccessibleEmployeeIds(
            userId,
            companyId,
            'PAYROLL_VIEW'
        );

        const where: any = {
            companyId,
            employeeId: { in: accessibleIds }
        };

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

        const payslips = await this.prisma.payslip.findMany({
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

        // Map employee to user for frontend compatibility and convert Decimal to number
        return payslips.map(payslip => {
            // Calculate GOSI from lines
            const gosiEmployeeLines = payslip.lines.filter(l =>
                l.component?.code === 'GOSI_EMP' || l.component?.code === 'GOSI_DED'
            );
            const gosiEmployee = gosiEmployeeLines.reduce((sum, l) => sum + Number(l.amount), 0);

            // GOSI Employer (if exists in lines)
            const gosiEmployerLines = payslip.lines.filter(l =>
                l.component?.code === 'GOSI_EMPLOYER' || l.component?.code === 'GOSI_CO'
            );
            const gosiEmployer = gosiEmployerLines.reduce((sum, l) => sum + Number(l.amount), 0);

            return {
                ...payslip,
                user: payslip.employee,
                baseSalary: Number(payslip.baseSalary),
                grossSalary: Number(payslip.grossSalary),
                totalDeductions: Number(payslip.totalDeductions),
                netSalary: Number(payslip.netSalary),
                gosiEmployee,
                gosiEmployer,
                lines: payslip.lines.map(line => ({
                    ...line,
                    amount: Number(line.amount),
                    units: line.units ? Number(line.units) : null,
                    rate: line.rate ? Number(line.rate) : null,
                    type: line.sign === 'EARNING' ? 'EARNING' : 'DEDUCTION',
                    componentCode: line.component?.code,
                    componentName: line.component?.nameAr || line.component?.nameEn,
                })),
            };
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get single payslip details' })
    async findOne(
        @Param('id') id: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        const payslip = await this.prisma.payslip.findFirst({
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

        if (!payslip) return null;

        // Calculate GOSI from lines
        const gosiEmployeeLines = payslip.lines.filter(l =>
            l.component?.code === 'GOSI_EMP' || l.component?.code === 'GOSI_DED'
        );
        const gosiEmployee = gosiEmployeeLines.reduce((sum, l) => sum + Number(l.amount), 0);

        const gosiEmployerLines = payslip.lines.filter(l =>
            l.component?.code === 'GOSI_EMPLOYER' || l.component?.code === 'GOSI_CO'
        );
        const gosiEmployer = gosiEmployerLines.reduce((sum, l) => sum + Number(l.amount), 0);

        return {
            ...payslip,
            user: payslip.employee,
            baseSalary: Number(payslip.baseSalary),
            grossSalary: Number(payslip.grossSalary),
            totalDeductions: Number(payslip.totalDeductions),
            netSalary: Number(payslip.netSalary),
            gosiEmployee,
            gosiEmployer,
            lines: payslip.lines.map(line => ({
                ...line,
                amount: Number(line.amount),
                units: line.units ? Number(line.units) : null,
                rate: line.rate ? Number(line.rate) : null,
                type: line.sign === 'EARNING' ? 'EARNING' : 'DEDUCTION',
                componentCode: line.component?.code,
                componentName: line.component?.nameAr || line.component?.nameEn,
            })),
        };
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
