import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { PayslipLineSource, AuditAction } from '@prisma/client';

import { PayrollCalculationService } from '../payroll-calculation/payroll-calculation.service';
import { PayrollLedgerService } from '../payroll-calculation/payroll-ledger.service';
import { AuditService } from '../audit/audit.service';


@Injectable()
export class PayrollRunsService {
    constructor(
        private prisma: PrismaService,
        private calculationService: PayrollCalculationService,
        private auditService: AuditService,
        private ledgerService: PayrollLedgerService,
    ) { }

    async create(dto: CreatePayrollRunDto, companyId: string, userId: string) {
        const period = await this.prisma.payrollPeriod.findFirst({ where: { id: dto.periodId, companyId } });
        if (!period) throw new NotFoundException('فترة الرواتب غير موجودة');
        if (period.status === 'PAID') throw new BadRequestException('لا يمكن تشغيل الرواتب لفترة مدفوعة بالفعل');

        // 1. التأكد من وجود المكونات النظامية (لخصم السلف)
        let loanComp = await this.prisma.salaryComponent.findFirst({ where: { code: 'LOAN_DED', companyId } });
        if (!loanComp) {
            loanComp = await this.prisma.salaryComponent.create({
                data: { code: 'LOAN_DED', nameAr: 'خصم سلفة', type: 'DEDUCTION', nature: 'VARIABLE', companyId } as any
            });
        }

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
                        structure: true
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

        const result = await this.prisma.$transaction(async (tx) => {
            const run = await tx.payrollRun.create({
                data: {
                    companyId,
                    periodId: dto.periodId,
                    processedBy: userId,
                    status: 'DRAFT'
                }
            });

            for (const employee of employees) {
                // محرك الحساب المركزي (Consolidated Breakdown)
                const calculation = await this.calculationService.calculateForEmployee(
                    employee.id,
                    companyId,
                    period.year,
                    period.month,
                );

                const assignment = employee.salaryAssignments[0];
                const baseSalary = assignment.baseSalary;
                const payslipLines = [];

                // 1. إضافة الخطوط المحسوبة (من الهيكل، السياسات، والتأمينات)
                if (calculation.policyLines) {
                    for (const pl of calculation.policyLines) {
                        // تحديد مصدر السطر بناءً على نوع المكوّن
                        let sourceType = PayslipLineSource.STRUCTURE;
                        if (pl.componentId === 'GOSI-STATUTORY') {
                            sourceType = (PayslipLineSource as any).STATUTORY || 'STATUTORY';
                        } else if (pl.componentCode === 'SMART' || pl.componentId?.startsWith('SMART-')) {
                            sourceType = (PayslipLineSource as any).SMART || 'SMART';
                        }

                        payslipLines.push({
                            componentId: pl.componentId,
                            amount: new Decimal(pl.amount.toFixed(2)),
                            sourceType,
                            sign: pl.sign,
                            descriptionAr: pl.descriptionAr || undefined,
                            sourceRef: pl.source ? `${pl.source.policyId}:${pl.source.ruleId}` : undefined,
                        });
                    }
                }


                // 2. معالجة السلف (Advances)
                let advanceDeduction = new Decimal(0);
                for (const advance of employee.advanceRequests) {
                    const ded = advance.approvedMonthlyDeduction || advance.monthlyDeduction;
                    const dedAmount = new Decimal(ded.toString());
                    advanceDeduction = advanceDeduction.add(dedAmount);

                    payslipLines.push({
                        componentId: loanComp!.id,
                        amount: dedAmount,
                        sourceType: PayslipLineSource.POLICY,
                        sign: 'DEDUCTION'
                    });
                }

                const finalGross = new Decimal(calculation.grossSalary.toFixed(2));
                const finalDeductions = new Decimal((calculation.totalDeductions + advanceDeduction.toNumber()).toFixed(2));
                const finalNet = finalGross.sub(finalDeductions);

                await tx.payslip.create({
                    data: {
                        employeeId: employee.id,
                        companyId,
                        periodId: dto.periodId,
                        runId: run.id,
                        baseSalary: baseSalary,
                        grossSalary: finalGross,
                        totalDeductions: finalDeductions,
                        netSalary: finalNet,
                        status: 'DRAFT',
                        calculationTrace: calculation.calculationTrace as any,
                        lines: {
                            create: payslipLines
                        }
                    }
                });
            }

            const runWithPayslips = await tx.payrollRun.findUnique({
                where: { id: run.id },
                include: {
                    payslips: { select: { id: true } },
                    period: true
                }
            });

            return {
                ...runWithPayslips,
                payslipsCount: runWithPayslips?.payslips?.length || employees.length
            };
        });

        await this.auditService.logPayrollChange(
            userId,
            result.id!,
            AuditAction.CREATE,
            null,
            { runId: result.id, periodId: dto.periodId, employeeCount: result.payslipsCount },
            `إنشاء دورة رواتب جديدة لـ ${result.payslipsCount} موظف`,
        );

        return result;
    }

    async preview(dto: CreatePayrollRunDto, companyId: string) {
        const period = await this.prisma.payrollPeriod.findFirst({ where: { id: dto.periodId, companyId } });
        if (!period) throw new NotFoundException('فترة الرواتب غير موجودة');

        const gosiConfig = await this.prisma.gosiConfig.findFirst({
            where: { isActive: true, companyId },
            orderBy: { createdAt: 'desc' }
        });

        const employees = await this.prisma.user.findMany({
            where: {
                companyId,
                branchId: dto.branchId || undefined,
                status: 'ACTIVE',
                salaryAssignments: { some: { isActive: true } }
            } as any,
            include: {
                branch: true,
                department: true,
                jobTitle: true,
                salaryAssignments: {
                    where: { isActive: true },
                    include: { structure: true }
                },
                advanceRequests: {
                    where: {
                        status: 'APPROVED',
                        startDate: { lte: period.endDate },
                        endDate: { gte: period.startDate }
                    }
                }
            } as any
        });

        let totalGross = new Decimal(0);
        let totalDeductions = new Decimal(0);
        let totalNet = new Decimal(0);
        let totalGosi = new Decimal(0);
        let totalAdvances = new Decimal(0);
        let totalBaseSalary = new Decimal(0);

        const byBranch: Record<string, { count: number; gross: number; net: number }> = {};
        const byDepartment: Record<string, { count: number; gross: number; net: number }> = {};
        const employeePreviews: any[] = [];

        for (const employee of employees) {
            const assignment = (employee as any).salaryAssignments?.[0];
            if (!assignment) continue;

            totalBaseSalary = totalBaseSalary.add(Number(assignment.baseSalary));

            const calculation = await this.calculationService.calculateForEmployee(
                employee.id,
                companyId,
                period.year,
                period.month
            );

            const earnings = (calculation.policyLines || [])
                .filter(pl => pl.sign === 'EARNING')
                .map(pl => ({ name: pl.componentName, code: pl.componentCode, amount: pl.amount }));

            const deductionItems = (calculation.policyLines || [])
                .filter(pl => pl.sign === 'DEDUCTION')
                .map(pl => ({ name: pl.componentName, code: pl.componentCode, amount: pl.amount }));

            // إضافة السلف للمعاينة
            let employeeAdvanceAmount = 0;
            const advanceDetails: { id: string; amount: number }[] = [];
            for (const adv of (employee as any).advanceRequests || []) {
                const amount = Number(adv.approvedMonthlyDeduction || adv.monthlyDeduction);
                employeeAdvanceAmount += amount;
                advanceDetails.push({ id: adv.id, amount });
                deductionItems.push({ name: 'خصم سلفة', code: 'ADVANCE', amount });
            }

            const finalGross = calculation.grossSalary;
            const finalDeductions = calculation.totalDeductions + employeeAdvanceAmount;
            const finalNet = finalGross - finalDeductions;

            totalGross = totalGross.add(finalGross);
            totalDeductions = totalDeductions.add(finalDeductions);
            totalNet = totalNet.add(finalNet);
            totalAdvances = totalAdvances.add(employeeAdvanceAmount);

            const gosiLine = (calculation.policyLines || []).find(pl => pl.componentCode === 'GOSI');
            const gosiAmount = gosiLine?.amount || 0;
            totalGosi = totalGosi.add(gosiAmount);

            const branchName = (employee as any).branch?.name || 'غير محدد';
            const deptName = (employee as any).department?.name || 'غير محدد';

            if (!byBranch[branchName]) byBranch[branchName] = { count: 0, gross: 0, net: 0 };
            byBranch[branchName].count++;
            byBranch[branchName].gross += finalGross;
            byBranch[branchName].net += finalNet;

            if (!byDepartment[deptName]) byDepartment[deptName] = { count: 0, gross: 0, net: 0 };
            byDepartment[deptName].count++;
            byDepartment[deptName].gross += finalGross;
            byDepartment[deptName].net += finalNet;

            employeePreviews.push({
                id: employee.id,
                employeeCode: employee.employeeCode,
                name: `${employee.firstName} ${employee.lastName}`,
                firstName: employee.firstName,
                lastName: employee.lastName,
                branch: branchName,
                department: deptName,
                jobTitle: (employee as any).jobTitle?.titleAr || 'غير محدد',
                isSaudi: employee.isSaudi || false,
                baseSalary: Number(assignment.baseSalary),
                gross: finalGross,
                deductions: finalDeductions,
                gosi: gosiAmount,
                advances: employeeAdvanceAmount,
                net: finalNet,
                earnings,
                deductionItems,
                advanceDetails,
                adjustments: [],
                excluded: false,
            });
        }

        // Previous month comparison
        let previousMonth = null;
        try {
            const prevPeriod = await this.prisma.payrollPeriod.findFirst({
                where: {
                    companyId,
                    year: period.month === 1 ? period.year - 1 : period.year,
                    month: period.month === 1 ? 12 : period.month - 1,
                },
            });
            if (prevPeriod) {
                const prevRun = await this.prisma.payrollRun.findFirst({
                    where: { periodId: prevPeriod.id, companyId },
                    include: { payslips: true, _count: { select: { payslips: true } } },
                });
                if (prevRun) {
                    const prevTotals = prevRun.payslips.reduce((acc, p) => ({
                        gross: acc.gross + Number(p.grossSalary),
                        net: acc.net + Number(p.netSalary),
                        deductions: acc.deductions + Number(p.totalDeductions),
                    }), { gross: 0, net: 0, deductions: 0 });
                    previousMonth = {
                        headcount: prevRun._count.payslips,
                        gross: prevTotals.gross,
                        net: prevTotals.net,
                        deductions: prevTotals.deductions,
                    };
                }
            }
        } catch { }

        return {
            period: {
                id: period.id,
                month: period.month,
                year: period.year,
                name: `${period.month}/${period.year}`,
            },
            summary: {
                totalEmployees: employees.length,
                totalBaseSalary: Number(totalBaseSalary),
                totalGross: Number(totalGross),
                totalDeductions: Number(totalDeductions),
                totalNet: Number(totalNet),
                totalGosi: Number(totalGosi),
                totalAdvances: Number(totalAdvances),
            },
            comparison: previousMonth ? {
                previousMonth,
                grossChange: Number(totalGross) - previousMonth.gross,
                grossChangePercent: previousMonth.gross > 0 ? ((Number(totalGross) - previousMonth.gross) / previousMonth.gross * 100) : 0,
                netChange: Number(totalNet) - previousMonth.net,
                netChangePercent: previousMonth.net > 0 ? ((Number(totalNet) - previousMonth.net) / previousMonth.net * 100) : 0,
                headcountChange: employees.length - previousMonth.headcount,
            } : null,
            byBranch: Object.entries(byBranch).map(([name, data]) => ({ name, ...data })),
            byDepartment: Object.entries(byDepartment).map(([name, data]) => ({ name, ...data })),
            employees: employeePreviews,
            gosiEnabled: !!gosiConfig,
        };
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
            const updated = await tx.payrollRun.update({
                where: { id, companyId },
                data: { status: 'FINANCE_APPROVED' },
            });

            await tx.payslip.updateMany({
                where: { runId: id, companyId },
                data: { status: 'FINANCE_APPROVED' }
            });

            // 🔥 Generate Ledger (DRAFT)
            await this.ledgerService.generateLedger(id, companyId);

            return updated;
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

            // 🔥 Post Ledger (Mark as POSTED)
            await tx.payrollLedger.update({
                where: { runId: id },
                data: { status: 'POSTED' }
            });

            return run;
        });
    }
}
