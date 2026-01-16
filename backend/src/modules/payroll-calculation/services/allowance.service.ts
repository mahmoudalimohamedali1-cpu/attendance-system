import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { FormulaEngineService } from './formula-engine.service';

/**
 * خدمة البدلات المتقدمة
 */
@Injectable()
export class AllowanceService {
  private readonly logger = new Logger(AllowanceService.name);

  constructor(
    private prisma: PrismaService,
    private formulaEngine: FormulaEngineService,
  ) {}

  /**
   * إنشاء تعريف بدل جديد
   */
  async createAllowanceDefinition(dto: any, companyId: string): Promise<any> {
    const code = dto.code?.startsWith('ALW_') ? dto.code : `ALW_${dto.code || 'DEFAULT'}`;

    const existing = await this.prisma.salaryComponent.findFirst({
      where: { code, companyId },
    });

    if (existing) {
      throw new BadRequestException('كود البدل مستخدم مسبقاً');
    }

    const metadata = JSON.stringify({
      allowanceType: dto.allowanceType,
      calculationMethod: dto.calculationMethod,
      frequency: dto.frequency,
      fixedAmount: dto.fixedAmount,
      percentage: dto.percentage,
      maxAmount: dto.maxAmount,
      minAmount: dto.minAmount,
      conditions: dto.conditions,
    });

    const component = await this.prisma.salaryComponent.create({
      data: {
        companyId,
        code,
        nameAr: dto.nameAr || 'بدل',
        nameEn: dto.nameEn,
        type: 'EARNING',
        nature: dto.formula ? 'FORMULA' : 'FIXED',
        formula: dto.formula,
        gosiEligible: dto.isGosiEligible || false,
        eosEligible: dto.isEosEligible || false,
        taxable: dto.isTaxable || false,
        isProrated: dto.isProrated ?? true,
        description: metadata,
      },
    });

    this.logger.log(`Created allowance definition: ${code}`);
    return this.transformDefinition(component);
  }

  /**
   * جلب تعريفات البدلات
   */
  async getAllowanceDefinitions(companyId: string, type?: string): Promise<any[]> {
    const components = await this.prisma.salaryComponent.findMany({
      where: {
        companyId,
        code: { startsWith: 'ALW_' },
        isActive: true,
      },
      orderBy: { priority: 'asc' },
    });

    const definitions = components.map(c => this.transformDefinition(c));

    if (type) {
      return definitions.filter(d => d.metadata?.allowanceType === type);
    }

    return definitions;
  }

  /**
   * تخصيص بدل لموظف
   */
  async assignAllowanceToEmployee(dto: any, companyId: string): Promise<any> {
    const allowance = await this.prisma.salaryComponent.findFirst({
      where: { id: dto.componentId, companyId },
    });

    if (!allowance) {
      throw new NotFoundException('تعريف البدل غير موجود');
    }

    const assignment = await this.prisma.employeeSalaryAssignment.findFirst({
      where: { employeeId: dto.employeeId, isActive: true },
    });

    if (!assignment) {
      throw new BadRequestException('الموظف ليس لديه هيكل راتب نشط');
    }

    const existingLine = await this.prisma.salaryStructureLine.findFirst({
      where: {
        structureId: assignment.structureId,
        componentId: dto.componentId,
      },
    });

    if (existingLine) {
      return this.prisma.salaryStructureLine.update({
        where: { id: existingLine.id },
        data: {
          percentage: dto.percentage,
        },
      });
    }

    return this.prisma.salaryStructureLine.create({
      data: {
        structureId: assignment.structureId,
        componentId: dto.componentId,
        percentage: dto.percentage,
      },
    });
  }

  /**
   * تخصيص بدل لمجموعة موظفين
   */
  async bulkAssignAllowance(dto: any, companyId: string): Promise<any> {
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const employeeId of (dto.employeeIds || [])) {
      try {
        const result = await this.assignAllowanceToEmployee({
          employeeId,
          componentId: dto.componentId,
          percentage: dto.percentage,
        }, companyId);
        results.push({ employeeId, success: true });
        successCount++;
      } catch (error) {
        results.push({ employeeId, success: false, error: error.message });
        failCount++;
      }
    }

    return {
      totalProcessed: dto.employeeIds?.length || 0,
      successCount,
      failCount,
      results,
    };
  }

  /**
   * حساب بدلات موظف
   */
  async calculateEmployeeAllowances(
    employeeId: string,
    companyId: string,
    year: number,
    month: number,
  ): Promise<any[]> {
    const employee = await this.prisma.user.findFirst({
      where: { id: employeeId, companyId },
    });

    if (!employee) {
      throw new NotFoundException('الموظف غير موجود');
    }

    const assignment = await this.prisma.employeeSalaryAssignment.findFirst({
      where: { employeeId, isActive: true },
      include: {
        structure: {
          include: {
            lines: {
              include: { component: true },
            },
          },
        },
      },
    });

    if (!assignment) {
      return [];
    }

    const baseSalary = assignment.baseSalary?.toNumber() || 0;
    const results: any[] = [];

    for (const line of assignment.structure?.lines || []) {
      if (!line.component.code.startsWith('ALW_')) continue;

      const metadata = this.parseMetadata(line.component.description);
      let calculatedAmount = 0;

      if (line.percentage) {
        calculatedAmount = baseSalary * line.percentage.toNumber() / 100;
      } else if (metadata.fixedAmount) {
        calculatedAmount = metadata.fixedAmount;
      } else if (metadata.percentage) {
        calculatedAmount = baseSalary * metadata.percentage / 100;
      }

      if (metadata.maxAmount && calculatedAmount > metadata.maxAmount) {
        calculatedAmount = metadata.maxAmount;
      }
      if (metadata.minAmount && calculatedAmount < metadata.minAmount) {
        calculatedAmount = metadata.minAmount;
      }

      results.push({
        id: line.component.id,
        code: line.component.code,
        name: line.component.nameAr,
        calculatedAmount,
        isGosiEligible: line.component.gosiEligible,
        isEosEligible: line.component.eosEligible,
        isTaxable: line.component.taxable,
        isProrated: line.component.isProrated,
      });
    }

    return results;
  }

  /**
   * ملخص البدلات للشركة
   */
  async getAllowanceSummary(companyId: string, year: number, month: number): Promise<any> {
    const employees = await this.prisma.user.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        role: { in: ['EMPLOYEE', 'MANAGER', 'HR'] },
      },
    });

    const byType = new Map<string, { total: number; count: number; name: string }>();
    let grandTotal = 0;

    for (const employee of employees) {
      try {
        const allowances = await this.calculateEmployeeAllowances(
          employee.id,
          companyId,
          year,
          month,
        );

        for (const allowance of allowances) {
          grandTotal += allowance.calculatedAmount;

          const existing = byType.get(allowance.code) || {
            total: 0,
            count: 0,
            name: allowance.name,
          };
          existing.total += allowance.calculatedAmount;
          existing.count++;
          byType.set(allowance.code, existing);
        }
      } catch (error) {
        this.logger.warn(`Error calculating allowances for employee ${employee.id}`);
      }
    }

    return {
      period: { year, month },
      grandTotal,
      employeeCount: employees.length,
      averagePerEmployee: employees.length > 0 ? grandTotal / employees.length : 0,
      byType: Array.from(byType.entries()).map(([code, data]) => ({
        code,
        name: data.name,
        total: data.total,
        employeeCount: data.count,
      })),
    };
  }

  private transformDefinition(component: any): any {
    const metadata = this.parseMetadata(component.description);
    return {
      id: component.id,
      code: component.code,
      nameAr: component.nameAr,
      nameEn: component.nameEn,
      isActive: component.isActive,
      gosiEligible: component.gosiEligible,
      eosEligible: component.eosEligible,
      taxable: component.taxable,
      isProrated: component.isProrated,
      formula: component.formula,
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
