/**
 * Date formatting utilities using dayjs
 * Replaces date-fns to reduce bundle size
 */
import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Extend dayjs with plugins
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

// Set Arabic locale
dayjs.locale('ar');

/**
 * Format a date using dayjs
 * @param date - Date to format (string, Date, or dayjs object)
 * @param formatStr - Format string (uses dayjs format tokens)
 * @returns Formatted date string
 * 
 * Common format tokens:
 * - YYYY: 4-digit year
 * - MM: 2-digit month
 * - DD: 2-digit day
 * - HH: 2-digit hour (24h)
 * - mm: 2-digit minute
 * - ss: 2-digit second
 * - ddd: Day name short
 * - MMM: Month name short
 */
export function formatDate(date: string | Date | null | undefined, formatStr: string = 'YYYY-MM-DD'): string {
    if (!date) return '';
    return dayjs(date).format(formatStr);
}

/**
 * Format date for display (Arabic friendly)
 */
export function formatDisplayDate(date: string | Date | null | undefined): string {
    if (!date) return '-';
    return dayjs(date).format('YYYY/MM/DD');
}

/**
 * Format datetime for display
 */
export function formatDateTime(date: string | Date | null | undefined): string {
    if (!date) return '-';
    return dayjs(date).format('YYYY/MM/DD HH:mm');
}

/**
 * Format time only
 */
export function formatTime(date: string | Date | null | undefined): string {
    if (!date) return '-';
    return dayjs(date).format('HH:mm');
}

/**
 * Check if date is valid
 */
export function isValidDate(date: string | Date | null | undefined): boolean {
    if (!date) return false;
    return dayjs(date).isValid();
}

/**
 * Get relative time (e.g., "منذ 3 ساعات")
 */
export function getRelativeTime(date: string | Date | null | undefined): string {
    if (!date) return '';
    return dayjs(date).fromNow();
}

/**
 * Format a date with timezone conversion
 * @param date - Date to format (string, Date, or dayjs object)
 * @param formatStr - Format string (uses dayjs format tokens)
 * @param tz - IANA timezone string (e.g., 'Asia/Riyadh', 'America/New_York')
 * @returns Formatted date string in the specified timezone
 */
export function formatDateWithTimezone(
    date: string | Date | null | undefined,
    formatStr: string = 'YYYY-MM-DD',
    tz?: string
): string {
    if (!date) return '';
    if (!tz) return dayjs(date).format(formatStr);
    return dayjs(date).tz(tz).format(formatStr);
}

/**
 * Format datetime with timezone conversion
 * @param date - Date to format (string, Date, or dayjs object)
 * @param tz - IANA timezone string (e.g., 'Asia/Riyadh', 'America/New_York')
 * @returns Formatted datetime string in the specified timezone
 */
export function formatDateTimeWithTimezone(
    date: string | Date | null | undefined,
    tz?: string
): string {
    if (!date) return '-';
    if (!tz) return dayjs(date).format('YYYY/MM/DD HH:mm');
    return dayjs(date).tz(tz).format('YYYY/MM/DD HH:mm');
}

/**
 * Format time with timezone conversion
 * @param date - Date to format (string, Date, or dayjs object)
 * @param tz - IANA timezone string (e.g., 'Asia/Riyadh', 'America/New_York')
 * @returns Formatted time string in the specified timezone
 */
export function formatTimeWithTimezone(
    date: string | Date | null | undefined,
    tz?: string
): string {
    if (!date) return '-';
    if (!tz) return dayjs(date).format('HH:mm');
    return dayjs(date).tz(tz).format('HH:mm');
}

/**
 * Format display date with timezone conversion
 * @param date - Date to format (string, Date, or dayjs object)
 * @param tz - IANA timezone string (e.g., 'Asia/Riyadh', 'America/New_York')
 * @returns Formatted display date string in the specified timezone
 */
export function formatDisplayDateWithTimezone(
    date: string | Date | null | undefined,
    tz?: string
): string {
    if (!date) return '-';
    if (!tz) return dayjs(date).format('YYYY/MM/DD');
    return dayjs(date).tz(tz).format('YYYY/MM/DD');
}

/**
 * Get timezone offset in hours
 * @param tz - IANA timezone string (e.g., 'Asia/Riyadh', 'America/New_York')
 * @returns Offset string (e.g., 'UTC+3', 'UTC-5')
 */
export function getTimezoneOffset(tz?: string): string {
    if (!tz) return '';
    const offset = dayjs().tz(tz).utcOffset() / 60;
    const sign = offset >= 0 ? '+' : '';
    return `UTC${sign}${offset}`;
}

// Re-export dayjs for advanced usage
export { dayjs };
