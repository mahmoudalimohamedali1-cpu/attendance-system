import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { FormulaEngineService } from './formula-engine.service';

/**
 * خدمة العمولات المتقدمة
 */
@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  constructor(
    private prisma: PrismaService,
    private formulaEngine: FormulaEngineService,
  ) {}

  /**
   * إنشاء خطة عمولات جديدة
   */
  async createCommissionPlan(dto: any, companyId: string): Promise<any> {
    const code = dto.code?.startsWith('COMM_') ? dto.code : `COMM_${dto.code || 'DEFAULT'}`;

    const existing = await this.prisma.salaryComponent.findFirst({
      where: { code, companyId },
    });

    if (existing) {
      throw new BadRequestException('كود الخطة مستخدم مسبقاً');
    }

    const metadata = JSON.stringify({
      commissionType: dto.commissionType,
      calculationMethod: dto.calculationMethod,
      baseRate: dto.baseRate,
      tiers: dto.tiers,
      targetAmount: dto.targetAmount,
      cappedAmount: dto.cappedAmount,
      clawbackDays: dto.clawbackDays,
      requiresApproval: dto.requiresApproval ?? true,
    });

    const component = await this.prisma.salaryComponent.create({
      data: {
        companyId,
        code,
        nameAr: dto.nameAr || 'عمولة',
        nameEn: dto.nameEn,
        type: 'EARNING',
        nature: dto.formula ? 'FORMULA' : 'VARIABLE',
        formula: dto.formula,
        gosiEligible: dto.isGosiEligible || false,
        taxable: dto.isTaxable || false,
        description: metadata,
      },
    });

    this.logger.log(`Created commission plan: ${code}`);
    return this.transformPlan(component);
  }

  /**
   * جلب خطط العمولات
   */
  async getCommissionPlans(companyId: string): Promise<any[]> {
    const components = await this.prisma.salaryComponent.findMany({
      where: {
        companyId,
        code: { startsWith: 'COMM_' },
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return components.map(c => this.transformPlan(c));
  }

  /**
   * تسجيل عمولة لموظف
   */
  async recordCommission(dto: any, companyId: string, recordedById: string): Promise<any> {
    const plan = await this.prisma.salaryComponent.findFirst({
      where: { id: dto.planId, companyId },
    });

    if (!plan) {
      throw new NotFoundException('خطة العمولات غير موجودة');
    }

    const metadata = this.parseMetadata(plan.description);
    const transactionAmount = dto.transactionAmount || 0;

    let calculatedAmount = 0;

    switch (metadata.calculationMethod) {
      case 'FLAT_RATE':
        calculatedAmount = metadata.baseRate || 0;
        break;
      case 'PERCENTAGE':
        calculatedAmount = transactionAmount * (metadata.baseRate || 0) / 100;
        break;
      case 'PER_UNIT':
        calculatedAmount = (dto.quantity || 1) * (metadata.baseRate || 0);
        break;
    }

    if (metadata.cappedAmount && calculatedAmount > metadata.cappedAmount) {
      calculatedAmount = metadata.cappedAmount;
    }

    const now = new Date();

    const commission = await this.prisma.retroPay.create({
      data: {
        companyId,
        employeeId: dto.employeeId,
        reason: `عمولة: ${plan.nameAr}`,
        effectiveFrom: now,
        effectiveTo: now,
        oldAmount: 0,
        newAmount: calculatedAmount,
        difference: calculatedAmount,
        monthsCount: 1,
        totalAmount: calculatedAmount,
        status: metadata.requiresApproval ? 'PENDING' : 'APPROVED',
        notes: JSON.stringify({
          planId: dto.planId,
          transactionAmount,
          transactionReference: dto.transactionReference,
          quantity: dto.quantity,
        }),
        createdById: recordedById,
      },
    });

    return {
      ...commission,
      calculatedAmount,
      planName: plan.nameAr,
    };
  }

  /**
   * تسجيل عمولات متعددة
   */
  async bulkRecordCommissions(dto: any, companyId: string, recordedById: string): Promise<any> {
    const results = [];
    let totalAmount = 0;

    for (const record of (dto.records || [])) {
      try {
        const result = await this.recordCommission(record, companyId, recordedById);
        results.push(result);
        totalAmount += result.calculatedAmount;
      } catch (error) {
        this.logger.error(`Error recording commission: ${error.message}`);
      }
    }

    return {
      processedCount: results.length,
      totalAmount,
      results,
    };
  }

  /**
   * الموافقة على عمولة
   */
  async approveCommission(dto: any, companyId: string, approvedById: string): Promise<any> {
    const commission = await this.prisma.retroPay.findFirst({
      where: { id: dto.transactionId, companyId },
    });

    if (!commission) {
      throw new NotFoundException('معاملة العمولة غير موجودة');
    }

    return this.prisma.retroPay.update({
      where: { id: dto.transactionId },
      data: {
        status: 'APPROVED',
        approvedById,
        approvedAt: new Date(),
        totalAmount: dto.adjustedAmount || commission.totalAmount,
      },
    });
  }

  /**
   * استرجاع عمولة
   */
  async clawbackCommission(dto: any, companyId: string, processedById: string): Promise<any> {
    const commission = await this.prisma.retroPay.findFirst({
      where: { id: dto.transactionId, companyId },
    });

    if (!commission) {
      throw new NotFoundException('معاملة العمولة غير موجودة');
    }

    const clawbackAmount = dto.amount || commission.totalAmount.toNumber();
    const now = new Date();

    return this.prisma.retroPay.create({
      data: {
        companyId,
        employeeId: commission.employeeId,
        reason: `استرجاع عمولة: ${dto.reason}`,
        effectiveFrom: now,
        effectiveTo: now,
        oldAmount: commission.totalAmount,
        newAmount: 0,
        difference: -clawbackAmount,
        monthsCount: 1,
        totalAmount: -clawbackAmount,
        status: 'APPROVED',
        notes: JSON.stringify({
          originalId: dto.transactionId,
          clawbackReason: dto.reason,
        }),
        approvedById: processedById,
        approvedAt: now,
      },
    });
  }

  /**
   * جلب العمولات المعلقة
   */
  async getPendingCommissions(companyId: string): Promise<any[]> {
    return this.prisma.retroPay.findMany({
      where: {
        companyId,
        status: 'PENDING',
        reason: { startsWith: 'عمولة:' },
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * تقرير العمولات
   */
  async getCommissionReport(companyId: string, startDate: Date, endDate: Date): Promise<any> {
    const commissions = await this.prisma.retroPay.findMany({
      where: {
        companyId,
        reason: { startsWith: 'عمولة:' },
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        employee: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            employeeCode: true,
          },
        },
      },
    });

    const byEmployee = new Map<string, any>();
    let totalAmount = 0;

    for (const comm of commissions) {
      if (comm.totalAmount.toNumber() > 0) {
        const amount = comm.totalAmount.toNumber();
        totalAmount += amount;

        const emp = byEmployee.get(comm.employeeId) || {
          employee: comm.employee,
          total: 0,
          count: 0,
        };
        emp.total += amount;
        emp.count++;
        byEmployee.set(comm.employeeId, emp);
      }
    }

    const employeeSummary = Array.from(byEmployee.values())
      .map(e => ({
        employeeId: e.employee?.id,
        employeeName: `${e.employee?.firstName} ${e.employee?.lastName}`,
        totalCommission: e.total,
        transactionCount: e.count,
      }))
      .sort((a, b) => b.totalCommission - a.totalCommission);

    return {
      period: { startDate, endDate },
      totalAmount,
      totalTransactions: commissions.length,
      uniqueEmployees: byEmployee.size,
      employeeSummary,
      topPerformers: employeeSummary.slice(0, 10),
    };
  }

  private transformPlan(component: any): any {
    const metadata = this.parseMetadata(component.description);
    return {
      id: component.id,
      code: component.code,
      nameAr: component.nameAr,
      nameEn: component.nameEn,
      isActive: component.isActive,
      metadata,
      createdAt: component.createdAt,
    };
  }

  private parseMetadata(value: string | null): any {
    if (!value) return {};
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
}
