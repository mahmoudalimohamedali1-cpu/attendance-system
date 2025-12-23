import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) { }

  async getAllSettings(companyId: string) {
    return this.prisma.systemSetting.findMany({
      where: { companyId },
    });
  }

  async getSetting(key: string, companyId: string) {
    return this.prisma.systemSetting.findFirst({
      where: { key, companyId },
    });
  }

  async setSetting(key: string, value: string, companyId: string, description?: string, userId?: string) {
    const oldSetting = await this.getSetting(key, companyId);

    const setting = await this.prisma.systemSetting.upsert({
      where: {
        key_companyId: { key, companyId }
      },
      create: { key, value, companyId, description },
      update: { value, description },
    });

    // Log audit
    await this.auditService.log(
      oldSetting ? 'UPDATE' : 'CREATE',
      'Settings',
      key,
      userId,
      oldSetting ? { value: oldSetting.value } : null,
      { value },
      `تعديل إعداد: ${key}`,
    );

    return setting;
  }

  async deleteSetting(key: string, companyId: string, userId?: string) {
    const oldSetting = await this.getSetting(key, companyId);

    const result = await this.prisma.systemSetting.delete({
      where: {
        key_companyId: { key, companyId }
      },
    });

    // Log audit
    await this.auditService.log(
      'DELETE',
      'Settings',
      key,
      userId,
      oldSetting ? { value: oldSetting.value } : null,
      null,
      `حذف إعداد: ${key}`,
    );

    return result;
  }

  async setMultipleSettings(settings: Array<{ key: string; value: string; description?: string }>, companyId: string) {
    const results = [];
    for (const setting of settings) {
      const result = await this.setSetting(setting.key, setting.value, companyId, setting.description);
      results.push(result);
    }
    return results;
  }

  // Holiday management
  async getHolidays(companyId: string, year?: number) {
    const where: any = { companyId };

    if (year) {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31);
      where.date = {
        gte: startOfYear,
        lte: endOfYear,
      };
    }

    return this.prisma.holiday.findMany({
      where,
      orderBy: { date: 'asc' },
    });
  }

  async createHoliday(data: { name: string; nameEn?: string; date: Date; isRecurring?: boolean }, companyId: string) {
    return this.prisma.holiday.create({
      data: { ...data, companyId },
    });
  }

  async updateHoliday(id: string, companyId: string, data: Partial<{ name: string; nameEn?: string; date: Date; isRecurring?: boolean }>) {
    return this.prisma.holiday.update({
      where: { id, companyId },
      data,
    });
  }

  async deleteHoliday(id: string, companyId: string) {
    return this.prisma.holiday.delete({
      where: { id, companyId },
    });
  }

  async isHoliday(date: Date): Promise<boolean> {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const holiday = await this.prisma.holiday.findFirst({
      where: {
        OR: [
          { date: targetDate },
          {
            isRecurring: true,
            date: {
              // Check if same day and month (ignoring year)
              gte: new Date(0, targetDate.getMonth(), targetDate.getDate()),
              lte: new Date(0, targetDate.getMonth(), targetDate.getDate()),
            },
          },
        ],
      },
    });

    return !!holiday;
  }

  /**
   * التحقق مما إذا كانت الشركة لا ترحل الإجازات
   * @returns true إذا كانت الشركة لا ترحل الإجازات (السنة تبدأ من الصفر)
   */
  async isLeaveCarryoverDisabled(companyId: string): Promise<boolean> {
    const setting = await this.getSetting('disableLeaveCarryover', companyId);
    return setting?.value === 'true';
  }
}

