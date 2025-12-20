import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';
import { Decimal } from '@prisma/client/runtime/library';

import { PayrollCalculationService } from '../payroll-calculation/payroll-calculation.service';

@Injectable()
export class PayrollRunsService {
    constructor(
        private prisma: PrismaService,
        private calculationService: PayrollCalculationService,
    ) { }

    async create(dto: CreatePayrollRunDto, companyId: string, userId: string) {
        const period = await this.prisma.payrollPeriod.findFirst({ where: { id: dto.periodId, companyId } });
        if (!period) throw new NotFoundException('فترة الرواتب غير موجودة');
        if (period.status === 'PAID') throw new BadRequestException('لا يمكن تشغيل الرواتب لفترة مدفوعة بالفعل');

        // 1. التأكد من وجود المكونات النظامية
        const systemComponents = [
            { code: 'LOAN_DED', nameAr: 'خصم سلفة', type: 'DEDUCTION', nature: 'VARIABLE' },
            { code: 'GOSI_DED', nameAr: 'تأمينات اجتماعية', type: 'DEDUCTION', nature: 'FORMULA' },
            { code: 'ABSENCE_DED', nameAr: 'خصم غياب', type: 'DEDUCTION', nature: 'VARIABLE' },
            { code: 'LATE_DED', nameAr: 'خصم تأخير', type: 'DEDUCTION', nature: 'VARIABLE' },
            { code: 'OVERTIME_EARN', nameAr: 'ساعات إضافية', type: 'EARNING', nature: 'VARIABLE' },
        ];

        const components: Record<string, any> = {};
        for (const sysComp of systemComponents) {
            let comp = await this.prisma.salaryComponent.findFirst({ where: { code: sysComp.code, companyId } });
            if (!comp) {
                comp = await this.prisma.salaryComponent.create({ data: { ...sysComp, companyId } as any });
            }
            components[sysComp.code] = comp;
        }

        // 2. جلب إعدادات GOSI النشطة
        const gosiConfig = await this.prisma.gosiConfig.findFirst({
            where: { isActive: true, companyId },
            orderBy: { createdAt: 'desc' }
        });

        const employees = await this.prisma.user.findMany({
            where: {
                companyId,
                id: dto.employeeIds ? { in: dto.employeeIds } : undefined,
                branchId: dto.branchId || undefined,
                status: 'ACTIVE',
                salaryAssignments: { some: { isActive: true } }
            },
            include: {
                salaryAssignments: {
                    where: { isActive: true },
                    include: {
                        structure: {
                            include: {
                                lines: { include: { component: true }, orderBy: { priority: 'asc' } }
                            }
                        }
                    }
                },
                advanceRequests: {
                    where: {
                        status: 'APPROVED',
                        startDate: { lte: period.endDate },
                        endDate: { gte: period.startDate }
                    }
                }
            }
        });

        if (employees.length === 0) throw new BadRequestException('لا يوجد موظفين نشطين لديهم تعيينات رواتب للفلتر المختار');

        return this.prisma.$transaction(async (tx) => {
            const run = await tx.payrollRun.create({
                data: {
                    companyId,
                    periodId: dto.periodId,
                    processedBy: userId,
                    status: 'DRAFT'
                }
            });

            for (const employee of employees) {
                // --- استخدام محرك الحساب الجديد ---
                const calculation = await this.calculationService.calculateForEmployee(
                    employee.id,
                    companyId,
                    period.year,
                    period.month,
                );

                const assignment = employee.salaryAssignments[0];
                const structure = assignment.structure;
                const baseSalary = assignment.baseSalary;

                let grossSalary = new Decimal(baseSalary.toString());
                let totalDeductions = new Decimal(0);
                let gosiBaseSalary = new Decimal(baseSalary.toString());

                const payslipLines = [];

                // 1. حساب المكونات الثابتة من الهيكل
                for (const line of structure.lines) {
                    let lineAmount = new Decimal(0);

                    if (line.component.nature === 'FIXED') {
                        lineAmount = new Decimal(line.amount.toString());
                    } else if (line.percentage) {
                        lineAmount = baseSalary.mul(line.percentage.toString()).div(100);
                    } else if (line.component.nature === 'FORMULA') {
                        // دعم المعادلات البسيطة
                        if (line.component.formula?.includes('BASIC')) {
                            const factorStr = line.component.formula.split('*')[1]?.trim();
                            if (factorStr) {
                                lineAmount = baseSalary.mul(factorStr);
                            }
                        }
                    }

                    if (line.component.type === 'EARNING') {
                        grossSalary = grossSalary.add(lineAmount);
                        if (line.component.gosiEligible) {
                            gosiBaseSalary = gosiBaseSalary.add(lineAmount);
                        }
                    } else {
                        totalDeductions = totalDeductions.add(lineAmount);
                    }

                    payslipLines.push({
                        componentId: line.componentId,
                        amount: lineAmount
                    });
                }

                // 2. تطبيق نتائج الحضور (غياب، تأخير، إضافي)
                if (calculation.absenceDeduction > 0) {
                    const amount = new Decimal(calculation.absenceDeduction.toFixed(2));
                    totalDeductions = totalDeductions.add(amount);
                    payslipLines.push({ componentId: components['ABSENCE_DED'].id, amount });
                }

                if (calculation.lateDeduction > 0) {
                    const amount = new Decimal(calculation.lateDeduction.toFixed(2));
                    totalDeductions = totalDeductions.add(amount);
                    payslipLines.push({ componentId: components['LATE_DED'].id, amount });
                }

                if (calculation.overtimeAmount > 0) {
                    const amount = new Decimal(calculation.overtimeAmount.toFixed(2));
                    grossSalary = grossSalary.add(amount);
                    payslipLines.push({ componentId: components['OVERTIME_EARN'].id, amount });
                }

                // 3. إضافة خصومات السلف (Advances)
                for (const advance of employee.advanceRequests) {
                    const deduction = advance.approvedMonthlyDeduction || advance.monthlyDeduction;
                    const deductionAmount = new Decimal(deduction.toString());
                    totalDeductions = totalDeductions.add(deductionAmount);
                    payslipLines.push({ componentId: components['LOAN_DED'].id, amount: deductionAmount });
                }

                // 4. حساب GOSI للسعوديين
                if (gosiConfig && (employee as any).isSaudi) {
                    const cappedGosiBase = Decimal.min(gosiBaseSalary, gosiConfig.maxCapAmount);
                    const totalGosiRate = new Decimal(gosiConfig.employeeRate.toString()).add(gosiConfig.sanedRate.toString());
                    const gosiDeduction = cappedGosiBase.mul(totalGosiRate).div(100);

                    if (gosiDeduction.gt(0)) {
                        totalDeductions = totalDeductions.add(gosiDeduction);
                        payslipLines.push({ componentId: components['GOSI_DED'].id, amount: gosiDeduction });
                    }
                }

                const netSalary = grossSalary.sub(totalDeductions);

                await tx.payslip.create({
                    data: {
                        employeeId: employee.id,
                        companyId,
                        periodId: dto.periodId,
                        runId: run.id,
                        baseSalary: baseSalary,
                        grossSalary: grossSalary,
                        totalDeductions: totalDeductions,
                        netSalary: netSalary,
                        status: 'DRAFT',
                        calculationTrace: calculation.calculationTrace as any,
                        lines: {
                            create: payslipLines
                        }
                    }
                });
            }

            return run;
        });
    }

    async findAll(companyId: string) {
        return this.prisma.payrollRun.findMany({
            where: { companyId },
            include: {
                period: true,
                _count: { select: { payslips: true } }
            },
            orderBy: { runDate: 'desc' }
        });
    }

    async findOne(id: string, companyId: string) {
        return this.prisma.payrollRun.findFirst({
            where: { id, companyId },
            include: {
                period: true,
                payslips: {
                    include: {
                        employee: true,
                        lines: { include: { component: true } }
                    }
                }
            }
        });
    }

    async approve(id: string, companyId: string) {
        return this.prisma.$transaction(async (tx) => {
            const run = await tx.payrollRun.updateMany({
                where: { id, companyId },
                data: { status: 'APPROVED' },
            });

            await tx.payslip.updateMany({
                where: { runId: id, companyId },
                data: { status: 'APPROVED' }
            });

            return run;
        });
    }

    async pay(id: string, companyId: string) {
        return this.prisma.$transaction(async (tx) => {
            const run = await tx.payrollRun.findFirst({
                where: { id, companyId }
            });
            if (!run) throw new NotFoundException('تشغيل الرواتب غير موجود');

            await tx.payrollRun.update({
                where: { id },
                data: { status: 'PAID' }
            });

            await tx.payslip.updateMany({
                where: { runId: id, companyId },
                data: { status: 'PAID' }
            });

            await tx.payrollPeriod.updateMany({
                where: { id: run.periodId, companyId },
                data: { status: 'PAID' }
            });

            return run;
        });
    }
}
