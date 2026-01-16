import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * أنظمة الضرائب المدعومة
 */
export enum TaxSystem {
  SAUDI_ARABIA = 'SAUDI_ARABIA', // لا ضريبة دخل
  UAE = 'UAE', // لا ضريبة دخل
  EGYPT = 'EGYPT', // ضريبة تصاعدية
  JORDAN = 'JORDAN', // ضريبة تصاعدية
  BAHRAIN = 'BAHRAIN', // لا ضريبة دخل
  KUWAIT = 'KUWAIT', // لا ضريبة دخل
  OMAN = 'OMAN', // لا ضريبة دخل
  QATAR = 'QATAR', // لا ضريبة دخل
  CUSTOM = 'CUSTOM', // مخصص
}

/**
 * خدمة حساب الضرائب
 */
@Injectable()
export class TaxCalculatorService {
  private readonly logger = new Logger(TaxCalculatorService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * حساب الضريبة
   */
  async calculateTax(dto: any, companyId: string): Promise<any> {
    const config = await this.getTaxConfiguration(companyId);

    if (!config || config.taxSystem === 'SAUDI_ARABIA' || !config.enabled) {
      return {
        grossSalary: dto.grossSalary,
        taxableAmount: 0,
        taxAmount: 0,
        netAfterTax: dto.grossSalary,
        taxSystem: config?.taxSystem || 'SAUDI_ARABIA',
        message: 'لا توجد ضريبة دخل مطبقة',
      };
    }

    const grossSalary = dto.grossSalary || 0;
    const exemptions = dto.exemptions || 0;
    const taxableAmount = Math.max(0, grossSalary - exemptions);

    let taxAmount = 0;
    const brackets: any[] = [];

    if (config.brackets && Array.isArray(config.brackets)) {
      let remainingAmount = taxableAmount;

      for (const bracket of config.brackets.sort((a: any, b: any) => a.min - b.min)) {
        const bracketMin = bracket.min || 0;
        const bracketMax = bracket.max || Infinity;
        const rate = bracket.rate || 0;

        if (remainingAmount <= 0) break;

        const bracketRange = bracketMax - bracketMin;
        const amountInBracket = Math.min(remainingAmount, bracketRange);
        const taxForBracket = amountInBracket * (rate / 100);

        taxAmount += taxForBracket;
        remainingAmount -= amountInBracket;

        brackets.push({
          min: bracketMin,
          max: bracketMax,
          rate,
          amountInBracket,
          taxForBracket,
        });
      }
    }

    return {
      grossSalary,
      exemptions,
      taxableAmount,
      taxAmount: Math.round(taxAmount * 100) / 100,
      netAfterTax: grossSalary - taxAmount,
      taxSystem: config.taxSystem,
      breakdown: brackets,
    };
  }

  /**
   * جلب إعدادات الضريبة
   */
  async getTaxConfiguration(companyId: string): Promise<any> {
    const setting = await this.prisma.systemSetting.findFirst({
      where: {
        companyId,
        key: 'TAX_CONFIGURATION',
      },
    });

    if (!setting) {
      return {
        taxSystem: 'SAUDI_ARABIA',
        enabled: false,
        brackets: [],
      };
    }

    return JSON.parse(setting.value);
  }

  /**
   * حفظ إعدادات الضريبة
   */
  async saveTaxConfiguration(dto: any, companyId: string): Promise<any> {
    const config = {
      taxSystem: dto.taxSystem || 'SAUDI_ARABIA',
      enabled: dto.enabled ?? false,
      brackets: dto.brackets || [],
      exemptions: dto.exemptions || {},
      effectiveDate: dto.effectiveDate || new Date(),
    };

    const key = 'TAX_CONFIGURATION';
    
    const existing = await this.prisma.systemSetting.findFirst({
      where: { companyId, key },
    });

    if (existing) {
      await this.prisma.systemSetting.update({
        where: { id: existing.id },
        data: { value: JSON.stringify(config) },
      });
    } else {
      await this.prisma.systemSetting.create({
        data: {
          companyId,
          key,
          value: JSON.stringify(config),
        },
      });
    }

    return config;
  }

  /**
   * جلب الأنظمة الضريبية المتاحة
   */
  getAvailableTaxSystems(): any[] {
    return [
      {
        code: 'SAUDI_ARABIA',
        name: 'المملكة العربية السعودية',
        nameEn: 'Saudi Arabia',
        hasIncomeTax: false,
        description: 'لا توجد ضريبة دخل على الأفراد',
      },
      {
        code: 'UAE',
        name: 'الإمارات العربية المتحدة',
        nameEn: 'UAE',
        hasIncomeTax: false,
        description: 'لا توجد ضريبة دخل على الأفراد',
      },
      {
        code: 'EGYPT',
        name: 'مصر',
        nameEn: 'Egypt',
        hasIncomeTax: true,
        description: 'نظام ضريبة تصاعدية',
        defaultBrackets: [
          { min: 0, max: 15000, rate: 0 },
          { min: 15001, max: 30000, rate: 2.5 },
          { min: 30001, max: 45000, rate: 10 },
          { min: 45001, max: 60000, rate: 15 },
          { min: 60001, max: 200000, rate: 20 },
          { min: 200001, max: 400000, rate: 22.5 },
          { min: 400001, max: Infinity, rate: 25 },
        ],
      },
      {
        code: 'JORDAN',
        name: 'الأردن',
        nameEn: 'Jordan',
        hasIncomeTax: true,
        description: 'نظام ضريبة تصاعدية',
        defaultBrackets: [
          { min: 0, max: 10000, rate: 5 },
          { min: 10001, max: 20000, rate: 10 },
          { min: 20001, max: 30000, rate: 15 },
          { min: 30001, max: 50000, rate: 20 },
          { min: 50001, max: Infinity, rate: 25 },
        ],
      },
      {
        code: 'BAHRAIN',
        name: 'البحرين',
        nameEn: 'Bahrain',
        hasIncomeTax: false,
        description: 'لا توجد ضريبة دخل على الأفراد',
      },
      {
        code: 'KUWAIT',
        name: 'الكويت',
        nameEn: 'Kuwait',
        hasIncomeTax: false,
        description: 'لا توجد ضريبة دخل على الأفراد',
      },
      {
        code: 'OMAN',
        name: 'سلطنة عُمان',
        nameEn: 'Oman',
        hasIncomeTax: false,
        description: 'لا توجد ضريبة دخل على الأفراد',
      },
      {
        code: 'QATAR',
        name: 'قطر',
        nameEn: 'Qatar',
        hasIncomeTax: false,
        description: 'لا توجد ضريبة دخل على الأفراد',
      },
      {
        code: 'CUSTOM',
        name: 'مخصص',
        nameEn: 'Custom',
        hasIncomeTax: true,
        description: 'إعدادات ضريبية مخصصة',
      },
    ];
  }

  /**
   * تحميل نظام ضريبي افتراضي
   */
  async loadDefaultTaxSystem(taxSystem: TaxSystem, companyId: string): Promise<any> {
    const systems = this.getAvailableTaxSystems();
    const system = systems.find(s => s.code === taxSystem);

    if (!system) {
      return { error: 'نظام ضريبي غير معروف' };
    }

    const config = {
      taxSystem,
      enabled: system.hasIncomeTax,
      brackets: system.defaultBrackets || [],
      exemptions: {},
      effectiveDate: new Date(),
    };

    return this.saveTaxConfiguration(config, companyId);
  }
}
