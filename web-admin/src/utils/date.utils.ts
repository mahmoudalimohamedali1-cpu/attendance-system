/**
 * Date formatting utilities using dayjs
 * Replaces date-fns to reduce bundle size
 */
import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import relativeTime from 'dayjs/plugin/relativeTime';

// Extend dayjs with plugins
dayjs.extend(relativeTime);

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

// Re-export dayjs for advanced usage
export { dayjs };
