import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * خدمة تقارير الرواتب المتقدمة
 */
@Injectable()
export class PayrollReportsService {
  private readonly logger = new Logger(PayrollReportsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * تقرير ملخص الرواتب
   */
  async generatePayrollSummary(companyId: string, year: number, month: number): Promise<any> {
    const period = await this.prisma.payrollPeriod.findFirst({
      where: { companyId, year, month },
    });

    if (!period) {
      return {
        error: 'الفترة غير موجودة',
        period: { year, month },
      };
    }

    const payslips = await this.prisma.payslip.findMany({
      where: {
        companyId,
        periodId: period.id,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            departmentId: true,
          },
        },
      },
    });

    let totalGross = 0;
    let totalNet = 0;
    let totalDeductions = 0;
    let totalBasic = 0;

    const byDepartment = new Map<string, {
      departmentId: string;
      departmentName: string;
      totalGross: number;
      totalNet: number;
      employeeCount: number;
    }>();

    for (const payslip of payslips) {
      const gross = payslip.grossSalary.toNumber();
      const net = payslip.netSalary.toNumber();
      const deductions = payslip.totalDeductions.toNumber();
      const basic = payslip.baseSalary.toNumber();

      totalGross += gross;
      totalNet += net;
      totalDeductions += deductions;
      totalBasic += basic;

      const deptId = payslip.employee?.departmentId || 'unknown';
      const existing = byDepartment.get(deptId) || {
        departmentId: deptId,
        departmentName: deptId,
        totalGross: 0,
        totalNet: 0,
        employeeCount: 0,
      };
      existing.totalGross += gross;
      existing.totalNet += net;
      existing.employeeCount++;
      byDepartment.set(deptId, existing);
    }

    return {
      period: { year, month },
      totalEmployees: payslips.length,
      totalBasicSalary: totalBasic,
      totalGrossSalary: totalGross,
      totalDeductions,
      totalNetSalary: totalNet,
      averageGross: payslips.length > 0 ? totalGross / payslips.length : 0,
      averageNet: payslips.length > 0 ? totalNet / payslips.length : 0,
      byDepartment: Array.from(byDepartment.values()),
    };
  }

  /**
   * تقرير تفصيلي
   */
  async generatePayrollDetailed(
    companyId: string,
    year: number,
    month: number,
    departmentId?: string,
  ): Promise<any> {
    const period = await this.prisma.payrollPeriod.findFirst({
      where: { companyId, year, month },
    });

    if (!period) {
      return { error: 'الفترة غير موجودة' };
    }

    const payslips = await this.prisma.payslip.findMany({
      where: {
        companyId,
        periodId: period.id,
        ...(departmentId && {
          employee: { departmentId },
        }),
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            jobTitle: true,
            department: { select: { name: true } },
            branch: { select: { name: true } },
          },
        },
        lines: {
          include: { component: true },
        },
      },
    });

    const employees = payslips.map(p => ({
      employeeId: p.employeeId,
      employeeCode: p.employee?.employeeCode || '',
      employeeName: `${p.employee?.firstName} ${p.employee?.lastName}`,
      department: p.employee?.department?.name || '-',
      branch: p.employee?.branch?.name || '-',
      jobTitle: p.employee?.jobTitle || '-',
      basicSalary: p.baseSalary.toNumber(),
      grossSalary: p.grossSalary.toNumber(),
      totalDeductions: p.totalDeductions.toNumber(),
      netSalary: p.netSalary.toNumber(),
      earnings: p.lines
        .filter(l => l.sign === 'EARNING')
        .map(l => ({
          code: l.component.code,
          name: l.component.nameAr,
          amount: l.amount.toNumber(),
        })),
      deductions: p.lines
        .filter(l => l.sign === 'DEDUCTION')
        .map(l => ({
          code: l.component.code,
          name: l.component.nameAr,
          amount: l.amount.toNumber(),
        })),
    }));

    return {
      period: { year, month },
      totalEmployees: employees.length,
      employees,
    };
  }

  /**
   * تقرير تحليل الأقسام
   */
  async generateDepartmentAnalysis(companyId: string, year: number, month: number): Promise<any> {
    const period = await this.prisma.payrollPeriod.findFirst({
      where: { companyId, year, month },
    });

    if (!period) {
      return { error: 'الفترة غير موجودة' };
    }

    const payslips = await this.prisma.payslip.findMany({
      where: {
        companyId,
        periodId: period.id,
      },
      include: {
        employee: {
          select: {
            departmentId: true,
            department: { select: { id: true, name: true } },
          },
        },
        lines: {
          include: { component: true },
        },
      },
    });

    const departments = new Map<string, any>();

    for (const payslip of payslips) {
      const deptId = payslip.employee?.departmentId || 'unknown';
      const deptName = payslip.employee?.department?.name || 'غير محدد';

      const existing = departments.get(deptId) || {
        departmentId: deptId,
        departmentName: deptName,
        totalEmployees: 0,
        basicSalaryTotal: 0,
        allowancesTotal: 0,
        deductionsTotal: 0,
        gosiTotal: 0,
        totalCost: 0,
      };

      existing.totalEmployees++;
      existing.basicSalaryTotal += payslip.baseSalary.toNumber();
      existing.totalCost += payslip.grossSalary.toNumber();
      existing.deductionsTotal += payslip.totalDeductions.toNumber();

      // حساب البدلات والتأمينات من السطور
      for (const line of payslip.lines) {
        if (line.sign === 'EARNING') {
          existing.allowancesTotal += line.amount.toNumber();
        }
        if (line.component.code === 'GOSI_EMP' || line.component.code.includes('GOSI')) {
          existing.gosiTotal += line.amount.toNumber();
        }
      }

      departments.set(deptId, existing);
    }

    const departmentList = Array.from(departments.values()).map(d => ({
      ...d,
      avgCostPerEmployee: d.totalEmployees > 0 ? d.totalCost / d.totalEmployees : 0,
    }));

    const totals = departmentList.reduce(
      (acc, d) => ({
        totalEmployees: acc.totalEmployees + d.totalEmployees,
        totalCost: acc.totalCost + d.totalCost,
      }),
      { totalEmployees: 0, totalCost: 0 },
    );

    return {
      period: { year, month },
      departments: departmentList,
      totals: {
        ...totals,
        avgCostPerEmployee: totals.totalEmployees > 0 ? totals.totalCost / totals.totalEmployees : 0,
      },
    };
  }

  /**
   * تقرير التأمينات الاجتماعية (GOSI)
   */
  async generateGosiReport(companyId: string, year: number, month: number): Promise<any> {
    const period = await this.prisma.payrollPeriod.findFirst({
      where: { companyId, year, month },
    });

    if (!period) {
      return { error: 'الفترة غير موجودة' };
    }

    const payslips = await this.prisma.payslip.findMany({
      where: {
        companyId,
        periodId: period.id,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            nationalId: true,
            nationality: true,
          },
        },
        lines: {
          where: {
            component: {
              code: { contains: 'GOSI' },
            },
          },
          include: { component: true },
        },
      },
    });

    let totalEmployeeContribution = 0;
    let totalEmployerContribution = 0;
    let saudiCount = 0;
    let nonSaudiCount = 0;

    const employees = payslips.map(p => {
      const isSaudi = p.employee?.nationality === 'SAUDI' || p.employee?.nationality === 'سعودي';
      if (isSaudi) saudiCount++;
      else nonSaudiCount++;

      let employeeContribution = 0;
      let employerContribution = 0;

      for (const line of p.lines) {
        if (line.component.code.includes('EMP')) {
          employeeContribution += line.amount.toNumber();
        } else {
          employerContribution += line.amount.toNumber();
        }
      }

      totalEmployeeContribution += employeeContribution;
      totalEmployerContribution += employerContribution;

      return {
        employeeId: p.employeeId,
        employeeName: `${p.employee?.firstName} ${p.employee?.lastName}`,
        nationalId: p.employee?.nationalId,
        isSaudi,
        gosiEligibleSalary: p.baseSalary.toNumber(),
        employeeContribution,
        employerContribution,
        totalContribution: employeeContribution + employerContribution,
      };
    });

    return {
      period: { year, month },
      summary: {
        totalSaudiEmployees: saudiCount,
        totalNonSaudiEmployees: nonSaudiCount,
        totalEmployeeContribution,
        totalEmployerContribution,
        grandTotal: totalEmployeeContribution + totalEmployerContribution,
        totalSanedContribution: 0, // TODO: حساب ساند
        totalHazardContribution: 0, // TODO: حساب الأخطار المهنية
      },
      employees,
    };
  }

  /**
   * تقرير التحويلات البنكية
   */
  async generateBankTransferReport(companyId: string, year: number, month: number): Promise<any> {
    const period = await this.prisma.payrollPeriod.findFirst({
      where: { companyId, year, month },
    });

    if (!period) {
      return { error: 'الفترة غير موجودة' };
    }

    const payslips = await this.prisma.payslip.findMany({
      where: {
        companyId,
        periodId: period.id,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            bankAccounts: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
      },
    });

    const byBank = new Map<string, { bankName: string; count: number; amount: number }>();
    let totalAmount = 0;

    const transfers = payslips.map((p, index) => {
      const bankAccount = p.employee?.bankAccounts?.[0];
      const bankName = bankAccount?.bankName || 'غير محدد';
      const amount = p.netSalary.toNumber();

      totalAmount += amount;

      const existing = byBank.get(bankName) || { bankName, count: 0, amount: 0 };
      existing.count++;
      existing.amount += amount;
      byBank.set(bankName, existing);

      return {
        employeeCode: p.employee?.employeeCode,
        employeeName: `${p.employee?.firstName} ${p.employee?.lastName}`,
        bankName,
        iban: bankAccount?.iban || '-',
        amount,
        reference: `SAL-${year}${String(month).padStart(2, '0')}-${String(index + 1).padStart(4, '0')}`,
      };
    });

    return {
      period: { year, month },
      summary: {
        totalTransfers: transfers.length,
        totalAmount,
        byBank: Array.from(byBank.values()),
      },
      transfers,
    };
  }

  /**
   * تقرير تحليل الاتجاهات
   */
  async generateTrendAnalysis(
    companyId: string,
    startYear: number,
    startMonth: number,
    endYear: number,
    endMonth: number,
  ): Promise<any> {
    const periods = await this.prisma.payrollPeriod.findMany({
      where: {
        companyId,
        OR: [
          {
            year: startYear,
            month: { gte: startMonth },
          },
          {
            year: { gt: startYear, lt: endYear },
          },
          {
            year: endYear,
            month: { lte: endMonth },
          },
        ],
      },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });

    const monthlyData: any[] = [];
    let previousGross = 0;
    let previousHeadcount = 0;

    for (const period of periods) {
      const payslips = await this.prisma.payslip.findMany({
        where: {
          companyId,
          periodId: period.id,
        },
      });

      const totalGross = payslips.reduce((sum, p) => sum + p.grossSalary.toNumber(), 0);
      const totalNet = payslips.reduce((sum, p) => sum + p.netSalary.toNumber(), 0);
      const headcount = payslips.length;

      monthlyData.push({
        period: `${period.year}/${String(period.month).padStart(2, '0')}`,
        year: period.year,
        month: period.month,
        totalGross,
        totalNet,
        headcount,
        avgGross: headcount > 0 ? totalGross / headcount : 0,
        grossChange: previousGross > 0 ? ((totalGross - previousGross) / previousGross) * 100 : 0,
        headcountChange: previousHeadcount > 0 ? ((headcount - previousHeadcount) / previousHeadcount) * 100 : 0,
      });

      previousGross = totalGross;
      previousHeadcount = headcount;
    }

    // حساب معدلات النمو
    const firstMonth = monthlyData[0];
    const lastMonth = monthlyData[monthlyData.length - 1];

    const payrollGrowthRate = firstMonth && lastMonth && firstMonth.totalGross > 0
      ? ((lastMonth.totalGross - firstMonth.totalGross) / firstMonth.totalGross) * 100
      : 0;

    const headcountGrowthRate = firstMonth && lastMonth && firstMonth.headcount > 0
      ? ((lastMonth.headcount - firstMonth.headcount) / firstMonth.headcount) * 100
      : 0;

    const avgSalaryGrowthRate = firstMonth && lastMonth && firstMonth.avgGross > 0
      ? ((lastMonth.avgGross - firstMonth.avgGross) / firstMonth.avgGross) * 100
      : 0;

    return {
      period: {
        start: `${startYear}/${startMonth}`,
        end: `${endYear}/${endMonth}`,
      },
      monthlyData,
      trends: {
        payrollGrowthRate,
        headcountGrowthRate,
        avgSalaryGrowthRate,
      },
      predictions: {
        yearEndEstimate: lastMonth ? lastMonth.totalGross * 12 : 0,
      },
    };
  }
}
