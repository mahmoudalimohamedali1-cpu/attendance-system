import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * خدمة السلف المتقدمة
 */
@Injectable()
export class SalaryAdvanceService {
  private readonly logger = new Logger(SalaryAdvanceService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * إنشاء سياسة سلف جديدة
   */
  async createAdvancePolicy(dto: any, companyId: string): Promise<any> {
    const key = `ADVANCE_POLICY_${dto.code || 'DEFAULT'}`;
    
    // البحث عن إعداد موجود
    const existing = await this.prisma.systemSetting.findFirst({
      where: { companyId, key },
    });

    const config = JSON.stringify({
      name: dto.name,
      advanceType: dto.advanceType,
      maxPercentageOfSalary: dto.maxPercentageOfSalary || 50,
      maxAmount: dto.maxAmount,
      minServiceMonths: dto.minServiceMonths || 3,
      maxInstallments: dto.maxInstallments || 12,
      interestRate: dto.interestRate || 0,
      requiresApproval: dto.requiresApproval ?? true,
      approvalLevels: dto.approvalLevels || ['HR'],
      cooldownDays: dto.cooldownDays || 30,
      eligibleEmployeeTypes: dto.eligibleEmployeeTypes,
    });

    let policy;
    if (existing) {
      policy = await this.prisma.systemSetting.update({
        where: { id: existing.id },
        data: { value: config },
      });
    } else {
      policy = await this.prisma.systemSetting.create({
        data: {
          companyId,
          key,
          value: config,
        },
      });
    }

    return {
      id: policy.id,
      code: dto.code,
      ...JSON.parse(policy.value),
    };
  }

  /**
   * جلب سياسات السلف
   */
  async getAdvancePolicies(companyId: string, type?: string): Promise<any[]> {
    const settings = await this.prisma.systemSetting.findMany({
      where: {
        companyId,
        key: { startsWith: 'ADVANCE_POLICY_' },
      },
    });

    const policies = settings.map(s => {
      const value = JSON.parse(s.value);
      return {
        id: s.id,
        code: s.key.replace('ADVANCE_POLICY_', ''),
        ...value,
      };
    });

    if (type) {
      return policies.filter(p => p.advanceType === type);
    }

    return policies;
  }

  /**
   * تقديم طلب سلفة
   */
  async createAdvanceRequest(dto: any, userId: string, companyId: string): Promise<any> {
    // جلب بيانات الموظف
    const employee = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
    });

    if (!employee) {
      throw new NotFoundException('الموظف غير موجود');
    }

    // جلب آخر assignment للموظف
    const assignment = await this.prisma.employeeSalaryAssignment.findFirst({
      where: { employeeId: userId, isActive: true },
    });

    const baseSalary = assignment?.baseSalary?.toNumber() || 0;

    // التحقق من السياسة
    const policySetting = await this.prisma.systemSetting.findFirst({
      where: {
        companyId,
        key: { startsWith: 'ADVANCE_POLICY_' },
      },
    });

    const policy = policySetting ? JSON.parse(policySetting.value) : {
      maxPercentageOfSalary: 50,
      maxInstallments: 12,
    };

    const maxAllowed = baseSalary * (policy.maxPercentageOfSalary / 100);
    if (dto.amount > maxAllowed) {
      throw new BadRequestException(`المبلغ المطلوب يتجاوز الحد الأقصى المسموح (${maxAllowed})`);
    }

    const periodMonths = dto.installments || 1;
    const monthlyDeduction = dto.amount / periodMonths;

    const advance = await this.prisma.advanceRequest.create({
      data: {
        companyId,
        userId,
        type: dto.type || 'SALARY_ADVANCE',
        amount: dto.amount,
        startDate: new Date(dto.startDate || new Date()),
        endDate: new Date(dto.endDate || new Date()),
        periodMonths,
        monthlyDeduction,
        status: 'PENDING',
        notes: dto.notes,
      },
    });

    return advance;
  }

  /**
   * الموافقة على سلفة
   */
  async approveAdvance(dto: any, approverId: string, companyId: string): Promise<any> {
    const advance = await this.prisma.advanceRequest.findFirst({
      where: { id: dto.advanceId, companyId },
    });

    if (!advance) {
      throw new NotFoundException('طلب السلفة غير موجود');
    }

    // تحديد المرحلة التالية بناءً على currentStep
    const currentStep = advance.currentStep;
    let updateData: any = {};

    if (currentStep === 'MANAGER') {
      updateData = {
        managerApproverId: approverId,
        managerDecision: 'APPROVED',
        managerDecisionAt: new Date(),
        currentStep: 'HR',
      };
    } else if (currentStep === 'HR') {
      updateData = {
        hrApproverId: approverId,
        hrDecision: 'APPROVED',
        hrDecisionAt: new Date(),
        approvedAmount: dto.approvedAmount || advance.amount,
        approvedMonthlyDeduction: dto.approvedMonthlyDeduction || advance.monthlyDeduction,
        currentStep: 'FINANCE',
      };
    } else if (currentStep === 'FINANCE') {
      updateData = {
        financeApproverId: approverId,
        financeDecision: 'APPROVED',
        status: 'APPROVED',
      };
    }

    return this.prisma.advanceRequest.update({
      where: { id: dto.advanceId },
      data: updateData,
    });
  }

  /**
   * رفض سلفة
   */
  async rejectAdvance(advanceId: string, rejectedById: string, reason: string, companyId: string): Promise<any> {
    const advance = await this.prisma.advanceRequest.findFirst({
      where: { id: advanceId, companyId },
    });

    if (!advance) {
      throw new NotFoundException('طلب السلفة غير موجود');
    }

    const currentStep = advance.currentStep;
    let updateData: any = { status: 'REJECTED' };

    if (currentStep === 'MANAGER') {
      updateData.managerApproverId = rejectedById;
      updateData.managerDecision = 'REJECTED';
      updateData.managerNotes = reason;
    } else if (currentStep === 'HR') {
      updateData.hrApproverId = rejectedById;
      updateData.hrDecision = 'REJECTED';
      updateData.hrDecisionNotes = reason;
    } else if (currentStep === 'FINANCE') {
      updateData.financeApproverId = rejectedById;
      updateData.financeDecision = 'REJECTED';
    }

    return this.prisma.advanceRequest.update({
      where: { id: advanceId },
      data: updateData,
    });
  }

  /**
   * تسجيل دفعة على سلفة
   */
  async recordPayment(dto: any, processedById: string, companyId: string): Promise<any> {
    const advance = await this.prisma.advanceRequest.findFirst({
      where: { id: dto.advanceId, companyId },
    });

    if (!advance) {
      throw new NotFoundException('طلب السلفة غير موجود');
    }

    // جلب الدفعات السابقة
    const existingPayments = await this.prisma.loanPayment.findMany({
      where: { advanceId: dto.advanceId },
    });

    const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount.toNumber(), 0);
    const approvedAmount = (advance.approvedAmount || advance.amount).toNumber();
    const remaining = approvedAmount - totalPaid;

    if (dto.amount > remaining) {
      throw new BadRequestException('مبلغ الدفعة يتجاوز المتبقي');
    }

    const payment = await this.prisma.loanPayment.create({
      data: {
        advanceId: dto.advanceId,
        amount: dto.amount,
        paymentDate: new Date(dto.paymentDate || new Date()),
        paymentType: dto.paymentType || 'MANUAL',
        notes: dto.notes,
        createdById: processedById,
      },
    });

    // تحديث حالة السلفة إذا تم السداد بالكامل
    const newTotalPaid = totalPaid + dto.amount;
    if (newTotalPaid >= approvedAmount) {
      await this.prisma.advanceRequest.update({
        where: { id: dto.advanceId },
        data: { status: 'PAID' },
      });
    }

    return payment;
  }

  /**
   * إنشاء جدول سداد
   */
  async generateRepaymentSchedule(advanceId: string, companyId: string): Promise<any[]> {
    const advance = await this.prisma.advanceRequest.findFirst({
      where: { id: advanceId, companyId },
    });

    if (!advance) {
      throw new NotFoundException('طلب السلفة غير موجود');
    }

    const payments = await this.prisma.loanPayment.findMany({
      where: { advanceId },
    });

    const schedule: any[] = [];
    const monthlyAmount = (advance.approvedMonthlyDeduction || advance.monthlyDeduction).toNumber();
    const totalPaid = payments.reduce((sum, p) => sum + p.amount.toNumber(), 0);
    const startDate = new Date(advance.startDate);

    for (let i = 0; i < advance.periodMonths; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      const paidSoFar = payments
        .filter(p => new Date(p.paymentDate) <= dueDate)
        .reduce((sum, p) => sum + p.amount.toNumber(), 0);

      schedule.push({
        installmentNumber: i + 1,
        dueDate,
        amount: monthlyAmount,
        status: paidSoFar >= monthlyAmount * (i + 1) ? 'PAID' : 'PENDING',
      });
    }

    return schedule;
  }

  /**
   * جلب السلف المعلقة
   */
  async getPendingAdvances(companyId: string): Promise<any[]> {
    return this.prisma.advanceRequest.findMany({
      where: {
        companyId,
        status: 'PENDING',
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * جلب سلف موظف
   */
  async getEmployeeAdvances(userId: string, companyId: string): Promise<any[]> {
    return this.prisma.advanceRequest.findMany({
      where: { userId, companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * ملخص سلف موظف
   */
  async getEmployeeAdvanceSummary(userId: string, companyId: string): Promise<any> {
    const advances = await this.prisma.advanceRequest.findMany({
      where: { userId, companyId },
    });

    let totalRequested = 0;
    let totalApproved = 0;
    let activeCount = 0;

    for (const advance of advances) {
      totalRequested += advance.amount.toNumber();
      if (advance.status === 'APPROVED' || advance.status === 'PAID') {
        totalApproved += (advance.approvedAmount || advance.amount).toNumber();
      }
      if (advance.status === 'APPROVED') {
        activeCount++;
      }
    }

    // جلب إجمالي المدفوع
    const payments = await this.prisma.loanPayment.findMany({
      where: {
        advance: { userId, companyId },
      },
    });

    const totalPaid = payments.reduce((sum, p) => sum + p.amount.toNumber(), 0);

    return {
      totalRequested,
      totalApproved,
      totalPaid,
      totalOutstanding: totalApproved - totalPaid,
      activeAdvances: activeCount,
      totalAdvances: advances.length,
    };
  }
}
