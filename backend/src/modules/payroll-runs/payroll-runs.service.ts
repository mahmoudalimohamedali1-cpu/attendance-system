import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { PayslipLineSource, AuditAction } from '@prisma/client';

import { PayrollCalculationService } from '../payroll-calculation/payroll-calculation.service';
import { AuditService } from '../audit/audit.service';


@Injectable()
export class PayrollRunsService {
    constructor(
        private prisma: PrismaService,
        private calculationService: PayrollCalculationService,
        private auditService: AuditService,
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
                        amount: lineAmount,
                        sourceType: PayslipLineSource.STRUCTURE,
                        sign: line.component.type === 'EARNING' ? 'EARNING' : 'DEDUCTION'
                    });
                }

                // 2. تطبيق نتائج الحضور (غياب، تأخير، إضافي)
                if (calculation.absenceDeduction > 0) {
                    const amount = new Decimal(calculation.absenceDeduction.toFixed(2));
                    totalDeductions = totalDeductions.add(amount);
                    payslipLines.push({ componentId: components['ABSENCE_DED'].id, amount, sourceType: PayslipLineSource.POLICY, sign: 'DEDUCTION' });
                }

                if (calculation.lateDeduction > 0) {
                    const amount = new Decimal(calculation.lateDeduction.toFixed(2));
                    totalDeductions = totalDeductions.add(amount);
                    payslipLines.push({ componentId: components['LATE_DED'].id, amount, sourceType: PayslipLineSource.POLICY, sign: 'DEDUCTION' });
                }

                if (calculation.overtimeAmount > 0) {
                    const amount = new Decimal(calculation.overtimeAmount.toFixed(2));
                    grossSalary = grossSalary.add(amount);
                    payslipLines.push({ componentId: components['OVERTIME_EARN'].id, amount, sourceType: PayslipLineSource.POLICY, sign: 'EARNING' });
                }

                // 3. إضافة خصومات السلف (Advances)
                for (const advance of employee.advanceRequests) {
                    const deduction = advance.approvedMonthlyDeduction || advance.monthlyDeduction;
                    const deductionAmount = new Decimal(deduction.toString());
                    totalDeductions = totalDeductions.add(deductionAmount);
                    payslipLines.push({ componentId: components['LOAN_DED'].id, amount: deductionAmount, sourceType: PayslipLineSource.POLICY, sign: 'DEDUCTION' });
                }

                // 4. حساب GOSI للسعوديين
                if (gosiConfig && (employee as any).isSaudi) {
                    const cappedGosiBase = Decimal.min(gosiBaseSalary, gosiConfig.maxCapAmount);
                    const totalGosiRate = new Decimal(gosiConfig.employeeRate.toString()).add(gosiConfig.sanedRate.toString());
                    const gosiDeduction = cappedGosiBase.mul(totalGosiRate).div(100);

                    if (gosiDeduction.gt(0)) {
                        totalDeductions = totalDeductions.add(gosiDeduction);
                        payslipLines.push({ componentId: components['GOSI_DED'].id, amount: gosiDeduction, sourceType: PayslipLineSource.STATUTORY, sign: 'DEDUCTION' });
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

            // Fetch run with payslips count
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

        // Log the payroll run creation
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

    /**
     * معاينة مسير الرواتب قبل التشغيل - حساب تقديري بدون حفظ
     */
    async preview(dto: CreatePayrollRunDto, companyId: string) {
        const period = await this.prisma.payrollPeriod.findFirst({ where: { id: dto.periodId, companyId } });
        if (!period) throw new NotFoundException('فترة الرواتب غير موجودة');

        // جلب إعدادات GOSI
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
            },
            include: {
                branch: true,
                department: true,
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

        // حساب الإجماليات
        let totalGross = new Decimal(0);
        let totalDeductions = new Decimal(0);
        let totalNet = new Decimal(0);
        let totalGosi = new Decimal(0);
        let totalAdvances = new Decimal(0);
        let totalBaseSalary = new Decimal(0);

        // توزيع حسب الفرع
        const byBranch: Record<string, { count: number; gross: number; net: number }> = {};
        // توزيع حسب القسم
        const byDepartment: Record<string, { count: number; gross: number; net: number }> = {};

        const employeePreviews: any[] = [];

        for (const employee of employees) {
            const assignment = employee.salaryAssignments[0];
            if (!assignment) continue;

            const structure = assignment.structure;
            const baseSalary = assignment.baseSalary;
            totalBaseSalary = totalBaseSalary.add(baseSalary);

            let grossSalary = new Decimal(baseSalary.toString());
            let deductions = new Decimal(0);
            let gosiBaseSalary = new Decimal(baseSalary.toString());

            // تفاصيل المكونات
            const earnings: { name: string; code: string; amount: number }[] = [];
            const deductionItems: { name: string; code: string; amount: number }[] = [];

            // إضافة الراتب الأساسي كأول عنصر
            earnings.push({ name: 'الراتب الأساسي', code: 'BASIC', amount: Number(baseSalary) });

            // حساب المكونات من الهيكل
            for (const line of structure.lines) {
                let lineAmount = new Decimal(0);

                if (line.component.nature === 'FIXED') {
                    lineAmount = new Decimal(line.amount.toString());
                } else if (line.percentage) {
                    lineAmount = baseSalary.mul(line.percentage.toString()).div(100);
                }

                if (line.component.type === 'EARNING') {
                    grossSalary = grossSalary.add(lineAmount);
                    if (line.component.gosiEligible) {
                        gosiBaseSalary = gosiBaseSalary.add(lineAmount);
                    }
                    earnings.push({
                        name: line.component.nameAr || line.component.nameEn || line.component.code,
                        code: line.component.code,
                        amount: Number(lineAmount),
                    });
                } else {
                    deductions = deductions.add(lineAmount);
                    deductionItems.push({
                        name: line.component.nameAr || line.component.nameEn || line.component.code,
                        code: line.component.code,
                        amount: Number(lineAmount),
                    });
                }
            }

            // خصومات السلف
            let advanceDeduction = new Decimal(0);
            const advanceDetails: { id: string; amount: number }[] = [];
            for (const advance of employee.advanceRequests) {
                const ded = advance.approvedMonthlyDeduction || advance.monthlyDeduction;
                advanceDeduction = advanceDeduction.add(ded);
                advanceDetails.push({
                    id: advance.id,
                    amount: Number(ded),
                });
            }
            deductions = deductions.add(advanceDeduction);
            totalAdvances = totalAdvances.add(advanceDeduction);

            if (advanceDeduction.gt(0)) {
                deductionItems.push({
                    name: 'خصم سلفة',
                    code: 'LOAN_DED',
                    amount: Number(advanceDeduction),
                });
            }

            // حساب GOSI للسعوديين
            let gosiDeduction = new Decimal(0);
            let gosiEmployer = new Decimal(0);
            if (gosiConfig && (employee as any).isSaudi) {
                const cappedGosiBase = Decimal.min(gosiBaseSalary, gosiConfig.maxCapAmount);
                const totalGosiRate = new Decimal(gosiConfig.employeeRate.toString()).add(gosiConfig.sanedRate.toString());
                gosiDeduction = cappedGosiBase.mul(totalGosiRate).div(100);
                gosiEmployer = cappedGosiBase.mul(gosiConfig.employerRate.toString()).add(gosiConfig.hazardRate.toString()).div(100);
                deductions = deductions.add(gosiDeduction);

                deductionItems.push({
                    name: 'تأمينات اجتماعية (GOSI)',
                    code: 'GOSI_DED',
                    amount: Number(gosiDeduction),
                });
            }
            totalGosi = totalGosi.add(gosiDeduction);

            const netSalary = grossSalary.sub(deductions);

            totalGross = totalGross.add(grossSalary);
            totalDeductions = totalDeductions.add(deductions);
            totalNet = totalNet.add(netSalary);

            // تجميع حسب الفرع
            const branchName = employee.branch?.name || 'غير محدد';
            if (!byBranch[branchName]) {
                byBranch[branchName] = { count: 0, gross: 0, net: 0 };
            }
            byBranch[branchName].count++;
            byBranch[branchName].gross += Number(grossSalary);
            byBranch[branchName].net += Number(netSalary);

            // تجميع حسب القسم
            const deptName = employee.department?.name || 'غير محدد';
            if (!byDepartment[deptName]) {
                byDepartment[deptName] = { count: 0, gross: 0, net: 0 };
            }
            byDepartment[deptName].count++;
            byDepartment[deptName].gross += Number(grossSalary);
            byDepartment[deptName].net += Number(netSalary);

            employeePreviews.push({
                id: employee.id,
                employeeCode: employee.employeeCode,
                name: `${employee.firstName} ${employee.lastName}`,
                firstName: employee.firstName,
                lastName: employee.lastName,
                branch: branchName,
                department: deptName,
                jobTitle: (employee as any).jobTitle?.name || 'غير محدد',
                isSaudi: (employee as any).isSaudi || false,
                baseSalary: Number(baseSalary),
                gross: Number(grossSalary),
                deductions: Number(deductions),
                gosi: Number(gosiDeduction),
                gosiEmployer: Number(gosiEmployer),
                advances: Number(advanceDeduction),
                net: Number(netSalary),
                // تفاصيل المكونات
                earnings,
                deductionItems,
                advanceDetails,
                // للتعديل لاحقاً
                adjustments: [],
                excluded: false,
            });
        }

        // Get previous month data for comparison
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
            const run = await tx.payrollRun.updateMany({
                where: { id, companyId },
                data: { status: 'FINANCE_APPROVED' },
            });

            await tx.payslip.updateMany({
                where: { runId: id, companyId },
                data: { status: 'FINANCE_APPROVED' }
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
