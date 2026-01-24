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
  ) { }

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
    const salaryAssignment = employee.salaryAssignments[0];

    if (!salaryAssignment) {
      throw new BadRequestException('لم يتم ضبط راتب لهذا الموظف');
    }

    const baseSalary = salaryAssignment.baseSalary?.toNumber() || 0;

    // حساب إجمالي الراتب إذا كانت الطريقة تتطلب ذلك
    let grossSalary = baseSalary;
    if (metadata.calculationMethod === 'PERCENTAGE_OF_GROSS' || metadata.calculationMethod === 'FORMULA') {
      const assignment = await this.prisma.employeeSalaryAssignment.findFirst({
        where: { employeeId: employee.id, isActive: true },
        include: {
          structure: {
            include: {
              lines: {
                include: {
                  component: true,
                },
              },
            },
          },
        },
      });

      if (assignment) {
        const totalAllowances = assignment.structure.lines
          .filter(line => line.component.type === 'EARNING')
          .reduce((sum, line) => sum + (line.amount?.toNumber() || 0), 0);

        // إذا كان المكون 'BASIC' موجوداً في الخطوط، نستخدم مجموع الخطوط فقط
        // وإلا نستخدم baseSalary + البدلات
        const hasBasicComponent = assignment.structure.lines.some(l => l.component.code === 'BASIC');
        grossSalary = hasBasicComponent ? totalAllowances : (baseSalary + totalAllowances);
      }
    }

    let calculatedAmount = 0;

    switch (metadata.calculationMethod) {
      case 'FIXED_AMOUNT':
        calculatedAmount = metadata.fixedAmount || 0;
        break;
      case 'PERCENTAGE_OF_BASIC':
        calculatedAmount = baseSalary * (metadata.percentage || 0) / 100;
        break;
      case 'PERCENTAGE_OF_GROSS':
        calculatedAmount = grossSalary * (metadata.percentage || 0) / 100;
        break;
      case 'SALARY_MULTIPLIER':
        calculatedAmount = baseSalary * (metadata.multiplier || 1);
        break;
      case 'FORMULA':
        if (program.formula) {
          const context = this.formulaEngine.buildVariableContext({
            basicSalary: baseSalary,
            grossSalary: grossSalary,
          });
          const result = this.formulaEngine.evaluate(program.formula, context);
          calculatedAmount = result.value;
        }
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
      grossSalary,
      calculatedAmount,
      calculationMethod: metadata.calculationMethod,
      status: metadata.requiresApproval ? 'PENDING' : 'APPROVED',
    };
  }

  /**
   * توليد مكافآت جماعية وحفظها في قاعدة البيانات
   */
  async generateBulkBonuses(dto: any, companyId: string): Promise<any> {
    // جلب الموظفين المحددين فقط أو جميع الموظفين
    const whereClause: any = {
      companyId,
      status: 'ACTIVE',
      role: { in: ['EMPLOYEE', 'MANAGER', 'HR'] },
    };

    if (dto.employeeIds && dto.employeeIds.length > 0) {
      whereClause.id = { in: dto.employeeIds };
    }

    const employees = await this.prisma.user.findMany({
      where: whereClause,
      include: {
        salaryAssignments: { where: { isActive: true }, take: 1 },
      },
    });

    const results = [];
    let totalAmount = 0;
    let savedCount = 0;

    // جلب معلومات البرنامج
    const program = await this.prisma.salaryComponent.findFirst({
      where: { id: dto.programId, companyId },
    });

    const metadata = program?.description ? JSON.parse(program.description) : {};

    for (const employee of employees) {
      try {
        const result = await this.calculateBonusForEmployee(
          employee.id,
          companyId,
          dto.programId,
          dto.periodYear,
          dto.periodMonth,
        );

        // حفظ المكافأة في قاعدة البيانات (جدول retroPay)
        if (result.calculatedAmount > 0) {
          const effectiveDate = new Date(dto.periodYear, (dto.periodMonth || 1) - 1, 1);
          const effectiveEndDate = new Date(dto.periodYear, dto.periodMonth || 12, 0);

          await this.prisma.retroPay.create({
            data: {
              companyId,
              employeeId: employee.id,
              reason: `${program?.nameAr || 'مكافأة'} - ${metadata.bonusType || 'BONUS'}`,
              effectiveFrom: effectiveDate,
              effectiveTo: effectiveEndDate,
              oldAmount: 0,
              newAmount: result.calculatedAmount,
              difference: result.calculatedAmount,
              monthsCount: 1,
              totalAmount: result.calculatedAmount,
              status: metadata.requiresApproval === false ? 'APPROVED' : 'PENDING',
              notes: `برنامج: ${program?.code || dto.programId} | طريقة الحساب: ${result.calculationMethod}`,
            },
          });
          savedCount++;
        }

        results.push(result);
        totalAmount += result.calculatedAmount;
      } catch (error) {
        this.logger.error(`Error for employee ${employee.id}: ${error.message}`);
      }
    }

    this.logger.log(`✅ Generated ${savedCount} bonuses for ${employees.length} employees, total: ${totalAmount} SAR`);

    return {
      employeesProcessed: employees.length,
      successCount: results.length,
      generated: savedCount,
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
   * إلغاء / استرجاع مكافأة معتمدة
   */
  async revertBonus(bonusId: string, companyId: string, reason?: string): Promise<any> {
    const bonus = await this.prisma.retroPay.findFirst({
      where: { id: bonusId, companyId },
    });

    if (!bonus) {
      throw new NotFoundException('المكافأة غير موجودة');
    }

    if (bonus.status === 'PAID') {
      throw new BadRequestException('لا يمكن إلغاء مكافأة تم صرفها بالفعل');
    }

    return this.prisma.retroPay.update({
      where: { id: bonusId },
      data: {
        status: 'CANCELLED',
        notes: reason ? `${bonus.notes || ''} | إلغاء: ${reason}` : bonus.notes,
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
   * جلب المكافآت المعتمدة (يمكن إلغاؤها)
   */
  async getApprovedBonuses(companyId: string): Promise<any[]> {
    return this.prisma.retroPay.findMany({
      where: {
        companyId,
        status: 'APPROVED',
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

  /**
   * تشغيل توليد المكافآت يدوياً حسب النوع
   * يتم استدعاؤها من الـ API للتشغيل اليدوي
   */
  async triggerScheduledBonuses(bonusType: string): Promise<any> {
    this.logger.log(`🔧 Manual trigger for ${bonusType} bonuses...`);

    // جلب جميع برامج المكافآت النشطة من هذا النوع
    const bonusPrograms = await this.prisma.salaryComponent.findMany({
      where: {
        code: { startsWith: 'BONUS_' },
        isActive: true,
      },
    });

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    let totalGenerated = 0;
    const processedPrograms: string[] = [];

    for (const program of bonusPrograms) {
      try {
        const metadata = this.parseMetadata(program.description);

        // تحقق أن نوع المكافأة يطابق
        if (metadata.bonusType !== bonusType) {
          continue;
        }

        this.logger.log(`📋 Processing bonus program: ${program.code} for company ${program.companyId}`);

        // توليد المكافآت لجميع الموظفين في هذه الشركة
        const result = await this.generateBulkBonuses(
          {
            programId: program.id,
            periodYear: year,
            periodMonth: month,
          },
          program.companyId!,
        );

        totalGenerated += result.generated || 0;
        processedPrograms.push(program.code);
        this.logger.log(`✅ Generated ${result.generated || 0} bonuses for program ${program.code}`);
      } catch (err) {
        this.logger.error(`❌ Error processing program ${program.code}: ${err.message}`);
      }
    }

    return {
      success: true,
      bonusType,
      totalGenerated,
      processedPrograms,
      message: `تم توليد ${totalGenerated} مكافأة من نوع ${bonusType}`,
    };
  }
}
