import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { FormulaEngineService } from './formula-engine.service';

/**
 * أنواع المكافآت
 */
export enum BonusType {
  ANNUAL = 'ANNUAL',
  QUARTERLY = 'QUARTERLY',
  MONTHLY = 'MONTHLY',
  PERFORMANCE = 'PERFORMANCE',
  EID = 'EID',
  RAMADAN = 'RAMADAN',
  SPOT = 'SPOT',
  PROJECT = 'PROJECT',
  ATTENDANCE = 'ATTENDANCE',
  CUSTOM = 'CUSTOM',
}

/**
 * طرق حساب المكافأة
 */
export enum BonusCalculationMethod {
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  PERCENTAGE_OF_BASIC = 'PERCENTAGE_OF_BASIC',
  PERCENTAGE_OF_GROSS = 'PERCENTAGE_OF_GROSS',
  SALARY_MULTIPLIER = 'SALARY_MULTIPLIER',
  TIERED = 'TIERED',
  FORMULA = 'FORMULA',
}

/**
 * خدمة المكافآت المتقدمة
 */
@Injectable()
export class BonusService {
  private readonly logger = new Logger(BonusService.name);

  constructor(
    private prisma: PrismaService,
    private formulaEngine: FormulaEngineService,
  ) {}

  /**
   * إنشاء برنامج مكافآت جديد
   */
  async createBonusProgram(dto: any, companyId: string): Promise<any> {
    const code = dto.code?.startsWith('BONUS_') ? dto.code : `BONUS_${dto.code || 'DEFAULT'}`;
    
    const existing = await this.prisma.salaryComponent.findFirst({
      where: { code, companyId },
    });

    if (existing) {
      throw new BadRequestException('كود البرنامج مستخدم مسبقاً');
    }

    const metadata = JSON.stringify({
      bonusType: dto.bonusType,
      calculationMethod: dto.calculationMethod,
      fixedAmount: dto.fixedAmount,
      percentage: dto.percentage,
      multiplier: dto.multiplier,
      tiers: dto.tiers,
      frequency: dto.frequency,
      requiresApproval: dto.requiresApproval ?? true,
      maxPerEmployee: dto.maxPerEmployee,
    });

    const component = await this.prisma.salaryComponent.create({
      data: {
        companyId,
        code,
        nameAr: dto.nameAr || 'مكافأة',
        nameEn: dto.nameEn,
        type: 'EARNING',
        nature: dto.formula ? 'FORMULA' : 'FIXED',
        formula: dto.formula,
        gosiEligible: dto.isGosiEligible || false,
        taxable: dto.isTaxable || false,
        description: metadata,
      },
    });

    this.logger.log(`Created bonus program: ${code}`);
    return this.transformProgram(component);
  }

  /**
   * جلب برامج المكافآت
   */
  async getBonusPrograms(companyId: string): Promise<any[]> {
    const components = await this.prisma.salaryComponent.findMany({
      where: {
        companyId,
        code: { startsWith: 'BONUS_' },
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return components.map(c => this.transformProgram(c));
  }

  /**
   * حساب مكافأة لموظف
   */
  async calculateBonusForEmployee(
    employeeId: string,
    companyId: string,
    programId: string,
    periodYear: number,
    periodMonth?: number,
  ): Promise<any> {
    const employee = await this.prisma.user.findFirst({
      where: { id: employeeId, companyId },
      include: {
        salaryAssignments: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('الموظف غير موجود');
    }

    const program = await this.prisma.salaryComponent.findFirst({
      where: { id: programId, companyId },
    });

    if (!program) {
      throw new NotFoundException('برنامج المكافآت غير موجود');
    }

    const metadata = this.parseMetadata(program.description);
    const baseSalary = employee.salaryAssignments[0]?.baseSalary?.toNumber() || 0;

    let calculatedAmount = 0;

    switch (metadata.calculationMethod) {
      case 'FIXED_AMOUNT':
        calculatedAmount = metadata.fixedAmount || 0;
        break;
      case 'PERCENTAGE_OF_BASIC':
        calculatedAmount = baseSalary * (metadata.percentage || 0) / 100;
        break;
      case 'SALARY_MULTIPLIER':
        calculatedAmount = baseSalary * (metadata.multiplier || 1);
        break;
    }

    if (metadata.maxPerEmployee && calculatedAmount > metadata.maxPerEmployee) {
      calculatedAmount = metadata.maxPerEmployee;
    }

    return {
      employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      programId,
      programName: program.nameAr,
      baseSalary,
      calculatedAmount,
      calculationMethod: metadata.calculationMethod,
      status: metadata.requiresApproval ? 'PENDING' : 'APPROVED',
    };
  }

  /**
   * توليد مكافآت جماعية
   */
  async generateBulkBonuses(dto: any, companyId: string): Promise<any> {
    const employees = await this.prisma.user.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        role: { in: ['EMPLOYEE', 'MANAGER', 'HR'] },
      },
      include: {
        salaryAssignments: { where: { isActive: true }, take: 1 },
      },
    });

    const results = [];
    let totalAmount = 0;

    for (const employee of employees) {
      try {
        const result = await this.calculateBonusForEmployee(
          employee.id,
          companyId,
          dto.programId,
          dto.periodYear,
          dto.periodMonth,
        );
        results.push(result);
        totalAmount += result.calculatedAmount;
      } catch (error) {
        this.logger.error(`Error for employee ${employee.id}: ${error.message}`);
      }
    }

    return {
      employeesProcessed: employees.length,
      successCount: results.length,
      totalAmount,
      results,
    };
  }

  /**
   * إنشاء مكافأة لموظف
   */
  async createEmployeeBonus(dto: any, companyId: string, createdById: string): Promise<any> {
    const now = new Date();
    
    return this.prisma.retroPay.create({
      data: {
        companyId,
        employeeId: dto.employeeId,
        reason: dto.reason || 'مكافأة',
        effectiveFrom: new Date(dto.effectiveFrom || now),
        effectiveTo: new Date(dto.effectiveTo || now),
        oldAmount: 0,
        newAmount: dto.amount,
        difference: dto.amount,
        monthsCount: 1,
        totalAmount: dto.amount,
        status: 'PENDING',
        notes: dto.notes,
        createdById,
      },
    });
  }

  /**
   * الموافقة على مكافأة
   */
  async approveBonus(dto: any, companyId: string, approvedById: string): Promise<any> {
    const bonus = await this.prisma.retroPay.findFirst({
      where: { id: dto.bonusId, companyId },
    });

    if (!bonus) {
      throw new NotFoundException('المكافأة غير موجودة');
    }

    return this.prisma.retroPay.update({
      where: { id: dto.bonusId },
      data: {
        status: 'APPROVED',
        approvedById,
        approvedAt: new Date(),
        totalAmount: dto.adjustedAmount || bonus.totalAmount,
      },
    });
  }

  /**
   * جلب المكافآت المعلقة
   */
  async getPendingBonuses(companyId: string): Promise<any[]> {
    return this.prisma.retroPay.findMany({
      where: {
        companyId,
        status: 'PENDING',
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
   * إحصائيات المكافآت
   */
  async getBonusStatistics(companyId: string, year?: number): Promise<any> {
    const currentYear = year || new Date().getFullYear();
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31);

    const paid = await this.prisma.retroPay.aggregate({
      where: {
        companyId,
        status: 'PAID',
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { totalAmount: true },
      _count: true,
    });

    const pending = await this.prisma.retroPay.aggregate({
      where: {
        companyId,
        status: 'PENDING',
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { totalAmount: true },
      _count: true,
    });

    const employeeCount = await this.prisma.user.count({
      where: { companyId, status: 'ACTIVE' },
    });

    const totalPaid = paid._sum.totalAmount?.toNumber() || 0;

    return {
      totalPaid,
      totalPending: pending._sum.totalAmount?.toNumber() || 0,
      paidCount: paid._count,
      pendingCount: pending._count,
      averagePerEmployee: employeeCount > 0 ? totalPaid / employeeCount : 0,
      year: currentYear,
    };
  }

  private transformProgram(component: any): any {
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
