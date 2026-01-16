import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TimezoneService {
  private readonly DEFAULT_TIMEZONE = 'Asia/Riyadh';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * جلب المنطقة الزمنية للفرع من قاعدة البيانات
   * Get branch timezone from database
   */
  async getBranchTimezone(branchId: string): Promise<string> {
    try {
      const branch = await this.prisma.branch.findUnique({
        where: { id: branchId },
        select: { timezone: true },
      });

      if (!branch) {
        return this.DEFAULT_TIMEZONE;
      }

      return branch.timezone || this.DEFAULT_TIMEZONE;
    } catch (error) {
      // في حالة حدوث خطأ، نعيد المنطقة الزمنية الافتراضية
      // In case of error, return default timezone
      return this.DEFAULT_TIMEZONE;
    }
  }

  /**
   * جلب المنطقة الزمنية للشركة عبر معرف الموظف
   * Get company timezone by user ID (through user's branch)
   */
  async getCompanyTimezoneByUserId(userId: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          branchId: true,
          branch: {
            select: { timezone: true },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('الموظف غير موجود');
      }

      // إذا لم يكن للموظف فرع أو لم يكن للفرع منطقة زمنية، نعيد الافتراضية
      // If user has no branch or branch has no timezone, return default
      if (!user.branch || !user.branch.timezone) {
        return this.DEFAULT_TIMEZONE;
      }

      return user.branch.timezone;
    } catch (error) {
      // في حالة حدوث خطأ، نعيد المنطقة الزمنية الافتراضية
      // In case of error, return default timezone
      if (error instanceof NotFoundException) {
        throw error;
      }
      return this.DEFAULT_TIMEZONE;
    }
  }

  /**
   * الحصول على المنطقة الزمنية الافتراضية
   * Get default timezone
   */
  getDefaultTimezone(): string {
    return this.DEFAULT_TIMEZONE;
  }
}
