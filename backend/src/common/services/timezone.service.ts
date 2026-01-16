import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * خدمة إدارة التوقيت والمناطق الزمنية
 * تحل مشكلة الـ hardcoded UTC+2 وتوفر تاريخ موحد للنظام
 */
@Injectable()
export class TimezoneService {
  // Default timezone - should be configurable per company
  private readonly DEFAULT_TIMEZONE = 'Asia/Riyadh'; // UTC+3

  constructor(private readonly prisma: PrismaService) { }

  /**
   * الحصول على تاريخ اليوم في التوقيت المحلي (بدون وقت)
   * يُستخدم لـ attendance date و leave date
   */
  getLocalToday(timezone?: string): Date {
    const tz = timezone || this.DEFAULT_TIMEZONE;
    const now = new Date();

    // Get the date parts in the target timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const parts = formatter.formatToParts(now);
    const year = parseInt(parts.find(p => p.type === 'year')?.value || '2024');
    const month = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1;
    const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');

    // Return UTC date at midnight (for consistent DB storage)
    return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  }

  /**
   * الحصول على الوقت الحالي بالدقائق (من منتصف الليل)
   * يُستخدم لحساب التأخير والمغادرة المبكرة
   */
  getCurrentTimeMinutes(timezone?: string): number {
    const tz = timezone || this.DEFAULT_TIMEZONE;
    const now = new Date();

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const timeStr = formatter.format(now);
    const [hours, minutes] = timeStr.split(':').map(Number);

    return hours * 60 + minutes;
  }

  /**
   * تحويل تاريخ من string إلى Date مع مراعاة الـ timezone
   */
  parseDate(dateStr: string, timezone?: string): Date {
    const tz = timezone || this.DEFAULT_TIMEZONE;

    // Parse the date string (expected format: YYYY-MM-DD)
    const [year, month, day] = dateStr.split('-').map(Number);

    // Return UTC date at midnight
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }

  /**
   * الحصول على بداية ونهاية السنة
   */
  getYearRange(year: number): { startOfYear: Date; endOfYear: Date } {
    return {
      startOfYear: new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)),
      endOfYear: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)),
    };
  }

  /**
   * الحصول على بداية ونهاية الشهر
   */
  getMonthRange(year: number, month: number): { startDate: Date; endDate: Date } {
    // month is 1-indexed (1 = January)
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    // Get last day of month
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    return { startDate, endDate };
  }

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
      if (!user.branch || !user.branch.timezone) {
        return this.DEFAULT_TIMEZONE;
      }

      return user.branch.timezone;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      return this.DEFAULT_TIMEZONE;
    }
  }

  /**
   * الحصول على الـ timezone من إعدادات الشركة
   */
  async getCompanyTimezone(companyId: string): Promise<string> {
    // Try to get from branch or return default
    return this.DEFAULT_TIMEZONE;
  }

  /**
   * الحصول على المنطقة الزمنية الافتراضية
   * Get default timezone
   */
  getDefaultTimezone(): string {
    return this.DEFAULT_TIMEZONE;
  }

  /**
   * تحقق من صحة الـ timezone
   */
  isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * قائمة المناطق الزمنية المدعومة
   */
  getSupportedTimezones(): string[] {
    return [
      'Asia/Riyadh',      // Saudi Arabia UTC+3
      'Asia/Dubai',       // UAE UTC+4
      'Africa/Cairo',     // Egypt UTC+2
      'Asia/Kuwait',      // Kuwait UTC+3
      'Asia/Bahrain',     // Bahrain UTC+3
      'Asia/Qatar',       // Qatar UTC+3
      'Asia/Muscat',      // Oman UTC+4
      'Asia/Amman',       // Jordan UTC+2/+3
      'Asia/Beirut',      // Lebanon UTC+2/+3
      'Europe/London',    // UK UTC+0/+1
      'America/New_York', // US Eastern UTC-5/-4
    ];
  }
}
