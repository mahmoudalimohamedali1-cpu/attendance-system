import { Injectable } from '@nestjs/common';

/**
 * خدمة إدارة التوقيت والمناطق الزمنية
 * تحل مشكلة الـ hardcoded UTC+2 وتوفر تاريخ موحد للنظام
 */
@Injectable()
export class TimezoneService {
    // Default timezone - should be configurable per company
    private readonly DEFAULT_TIMEZONE = 'Asia/Riyadh'; // UTC+3

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
     * الحصول على الـ timezone من إعدادات الشركة
     * TODO: تحميل الـ timezone من جدول Company
     */
    async getCompanyTimezone(companyId: string): Promise<string> {
        // TODO: Fetch from database
        // const company = await this.prisma.company.findUnique({ where: { id: companyId } });
        // return company?.timezone || this.DEFAULT_TIMEZONE;
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
