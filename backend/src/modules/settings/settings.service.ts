import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getAllSettings() {
    return this.prisma.systemSetting.findMany();
  }

  async getSetting(key: string) {
    return this.prisma.systemSetting.findUnique({
      where: { key },
    });
  }

  async setSetting(key: string, value: string, description?: string) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value, description },
      update: { value, description },
    });
  }

  async deleteSetting(key: string) {
    return this.prisma.systemSetting.delete({
      where: { key },
    });
  }

  async setMultipleSettings(settings: Array<{ key: string; value: string; description?: string }>) {
    const results = [];
    for (const setting of settings) {
      const result = await this.setSetting(setting.key, setting.value, setting.description);
      results.push(result);
    }
    return results;
  }

  // Holiday management
  async getHolidays(year?: number) {
    const where: any = {};
    
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

  async createHoliday(data: { name: string; nameEn?: string; date: Date; isRecurring?: boolean }) {
    return this.prisma.holiday.create({
      data,
    });
  }

  async updateHoliday(id: string, data: Partial<{ name: string; nameEn?: string; date: Date; isRecurring?: boolean }>) {
    return this.prisma.holiday.update({
      where: { id },
      data,
    });
  }

  async deleteHoliday(id: string) {
    return this.prisma.holiday.delete({
      where: { id },
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
}

