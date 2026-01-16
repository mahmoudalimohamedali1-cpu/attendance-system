import { Logger } from '@nestjs/common';
import {
    FIELD_SHORTCUTS,
    OPERATOR_MAPPINGS,
    TIME_CONSTANTS,
    VALIDATION_LIMITS,
    ACHIEVEMENT_LEVELS,
} from '../constants/smart-policy.constants';

const logger = new Logger('SmartPolicyHelpers');

// ============== Field Mapping Helpers ==============

/**
 * تحويل اختصار الحقل للمسار الكامل
 */
export function mapFieldPath(field: string): string {
    if (!field) return field;
    
    // إذا كان المسار كامل بالفعل
    if (field.includes('.') && !FIELD_SHORTCUTS[field]) {
        return field;
    }
    
    // البحث عن الاختصار
    const mapped = FIELD_SHORTCUTS[field];
    if (mapped) {
        logger.debug(`Field mapped: '${field}' → '${mapped}'`);
        return mapped;
    }
    
    return field;
}

/**
 * جلب قيمة متداخلة من كائن
 */
export function getNestedValue<T = any>(obj: any, path: string): T | undefined {
    if (!obj || !path) return undefined;
    
    // تحويل الاختصار للمسار الكامل
    const mappedPath = mapFieldPath(path);
    
    try {
        return mappedPath.split('.').reduce((current, key) => {
            if (current === null || current === undefined) {
                return undefined;
            }
            return current[key];
        }, obj) as T;
    } catch {
        return undefined;
    }
}

/**
 * تعيين قيمة متداخلة في كائن
 */
export function setNestedValue(obj: any, path: string, value: any): void {
    if (!obj || !path) return;
    
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (current[key] === undefined) {
            current[key] = {};
        }
        current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
}

// ============== Operator Helpers ==============

/**
 * تطبيع عامل المقارنة
 */
export function normalizeOperator(operator: string): string {
    const upperOp = operator.toUpperCase().trim();
    
    for (const [normalized, variants] of Object.entries(OPERATOR_MAPPINGS)) {
        if (variants.includes(upperOp) || variants.includes(operator)) {
            return normalized;
        }
    }
    
    return upperOp;
}

/**
 * تطبيق عامل المقارنة
 */
export function applyOperator(actual: any, operator: string, expected: any): boolean {
    const normalizedOp = normalizeOperator(operator);
    
    // التعامل مع القيم الفارغة
    if (actual === undefined || actual === null) {
        // إذا كان الشرط يتطلب قيمة صفر
        if (expected === 0 || expected === '0') {
            actual = 0;
        } else {
            return false;
        }
    }
    
    // تحويل للأرقام إذا أمكن
    const actualNum = typeof actual === 'number' ? actual : parseFloat(actual);
    const expectedNum = typeof expected === 'number' ? expected : parseFloat(expected);
    const useNumeric = !isNaN(actualNum) && !isNaN(expectedNum);
    
    switch (normalizedOp) {
        case 'GREATER_THAN':
            return useNumeric ? actualNum > expectedNum : actual > expected;
            
        case 'LESS_THAN':
            return useNumeric ? actualNum < expectedNum : actual < expected;
            
        case 'GREATER_THAN_OR_EQUAL':
            return useNumeric ? actualNum >= expectedNum : actual >= expected;
            
        case 'LESS_THAN_OR_EQUAL':
            return useNumeric ? actualNum <= expectedNum : actual <= expected;
            
        case 'EQUALS':
            if (useNumeric) {
                return actualNum === expectedNum;
            }
            return String(actual).toLowerCase() === String(expected).toLowerCase();
            
        case 'NOT_EQUALS':
            if (useNumeric) {
                return actualNum !== expectedNum;
            }
            return String(actual).toLowerCase() !== String(expected).toLowerCase();
            
        case 'CONTAINS':
            return String(actual).toLowerCase().includes(String(expected).toLowerCase());
            
        case 'IN':
            if (Array.isArray(expected)) {
                return expected.some(e => 
                    String(actual).toLowerCase() === String(e).toLowerCase()
                );
            }
            return String(expected).toLowerCase().includes(String(actual).toLowerCase());
            
        case 'BETWEEN':
            if (Array.isArray(expected) && expected.length === 2) {
                const [min, max] = expected.map(Number);
                return actualNum >= min && actualNum <= max;
            }
            return false;
            
        case 'IS_TRUE':
            return actual === true || actual === 'true' || actual === 1;
            
        case 'IS_FALSE':
            return actual === false || actual === 'false' || actual === 0;
            
        default:
            logger.warn(`Unknown operator: ${operator}`);
            return false;
    }
}

// ============== Date & Time Helpers ==============

/**
 * حساب مدة الخدمة
 */
export function calculateTenure(hireDate: Date): {
    years: number;
    months: number;
    days: number;
    totalMonths: number;
    totalDays: number;
} {
    const now = new Date();
    const hire = new Date(hireDate);
    
    // حساب الفرق بالأيام بدقة
    const diffMs = now.getTime() - hire.getTime();
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    // حساب السنوات والأشهر والأيام بدقة أكبر
    let years = now.getFullYear() - hire.getFullYear();
    let months = now.getMonth() - hire.getMonth();
    let days = now.getDate() - hire.getDate();
    
    // تعديل إذا كان اليوم سالب
    if (days < 0) {
        months--;
        const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += prevMonth.getDate();
    }
    
    // تعديل إذا كان الشهر سالب
    if (months < 0) {
        years--;
        months += 12;
    }
    
    const totalMonths = years * 12 + months;
    
    return {
        years,
        months,
        days,
        totalMonths,
        totalDays,
    };
}

/**
 * حساب تواريخ الفترة
 */
export function getPeriodDates(month: number, year: number): {
    startDate: Date;
    endDate: Date;
    daysInMonth: number;
} {
    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    const daysInMonth = endDate.getDate();
    
    return { startDate, endDate, daysInMonth };
}

/**
 * حساب أيام العمل في الشهر
 */
export function calculateWorkingDays(
    month: number,
    year: number,
    weekendDays: number[] = [5, 6], // الجمعة والسبت
    holidays: Date[] = [],
): number {
    const { daysInMonth } = getPeriodDates(month, year);
    let workingDays = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        
        // تخطي أيام العطلة الأسبوعية
        if (weekendDays.includes(dayOfWeek)) {
            continue;
        }
        
        // تخطي الإجازات الرسمية
        const isHoliday = holidays.some(h => 
            h.getDate() === day && 
            h.getMonth() === month - 1 && 
            h.getFullYear() === year
        );
        
        if (!isHoliday) {
            workingDays++;
        }
    }
    
    return workingDays;
}

/**
 * توليد قائمة الفترات بين تاريخين
 */
export function generatePeriods(startPeriod: string, endPeriod: string): string[] {
    const periods: string[] = [];
    
    const [startYear, startMonth] = startPeriod.split('-').map(Number);
    const [endYear, endMonth] = endPeriod.split('-').map(Number);
    
    // التحقق من صحة التواريخ
    if (isNaN(startYear) || isNaN(startMonth) || isNaN(endYear) || isNaN(endMonth)) {
        return periods;
    }
    
    // التحقق من أن البداية قبل النهاية
    const startDate = new Date(startYear, startMonth - 1);
    const endDate = new Date(endYear, endMonth - 1);
    
    if (startDate > endDate) {
        return periods;
    }
    
    // التحقق من عدم تجاوز الحد الأقصى
    const monthsDiff = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
    if (monthsDiff > VALIDATION_LIMITS.MAX_RETRO_MONTHS) {
        logger.warn(`Period too long: ${monthsDiff} months, max: ${VALIDATION_LIMITS.MAX_RETRO_MONTHS}`);
        return periods;
    }
    
    let currentYear = startYear;
    let currentMonth = startMonth;
    
    while (
        currentYear < endYear ||
        (currentYear === endYear && currentMonth <= endMonth)
    ) {
        periods.push(`${currentYear}-${currentMonth.toString().padStart(2, '0')}`);
        
        currentMonth++;
        if (currentMonth > 12) {
            currentMonth = 1;
            currentYear++;
        }
    }
    
    return periods;
}

/**
 * التحقق من صيغة الفترة
 */
export function isValidPeriodFormat(period: string): boolean {
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
}

/**
 * تحويل الفترة لتاريخ
 */
export function periodToDate(period: string, day: 'first' | 'last' = 'first'): Date | null {
    if (!isValidPeriodFormat(period)) return null;
    
    const [year, month] = period.split('-').map(Number);
    
    if (day === 'first') {
        return new Date(year, month - 1, 1);
    } else {
        return new Date(year, month, 0);
    }
}

// ============== Performance Helpers ==============

/**
 * حساب مستوى تحقيق الهدف
 */
export function calculateAchievementLevel(
    targetAchievement: number,
): 'BELOW' | 'MET' | 'EXCEEDED' | 'OUTSTANDING' {
    if (targetAchievement >= ACHIEVEMENT_LEVELS.OUTSTANDING_THRESHOLD) {
        return 'OUTSTANDING';
    } else if (targetAchievement >= ACHIEVEMENT_LEVELS.EXCEEDED_THRESHOLD) {
        return 'EXCEEDED';
    } else if (targetAchievement >= ACHIEVEMENT_LEVELS.MET_THRESHOLD) {
        return 'MET';
    }
    return 'BELOW';
}

/**
 * حساب نسبة تحقيق الهدف
 */
export function calculateTargetAchievement(
    actual: number,
    target: number,
): number {
    if (target <= 0) return 0;
    return Math.round((actual / target) * 100);
}

// ============== String Helpers ==============

/**
 * تحويل لـ camelCase
 */
export function toCamelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * تحويل لـ PascalCase
 */
export function toPascalCase(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * تحويل لـ snake_case
 */
export function toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

/**
 * تحويل لـ kebab-case
 */
export function toKebabCase(str: string): string {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
}

/**
 * تنظيف النص من الأحرف غير المرغوبة
 */
export function sanitizeText(text: string): string {
    if (!text) return '';
    
    return text
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[<>]/g, '');
}

/**
 * اقتطاع النص مع إضافة ...
 */
export function truncateText(text: string, maxLength: number = 100): string {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

// ============== Number Helpers ==============

/**
 * تقريب لعدد معين من الأرقام العشرية
 */
export function roundTo(value: number, decimals: number = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}

/**
 * التحقق من أن القيمة ضمن نطاق
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * حساب النسبة المئوية
 */
export function calculatePercentage(part: number, total: number): number {
    if (total === 0) return 0;
    return roundTo((part / total) * 100, 2);
}

// ============== Array Helpers ==============

/**
 * تقسيم مصفوفة لدفعات
 */
export function chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

/**
 * إزالة التكرار من مصفوفة
 */
export function unique<T>(array: T[]): T[] {
    return [...new Set(array)];
}

/**
 * ترتيب مصفوفة كائنات حسب حقل
 */
export function sortBy<T>(
    array: T[],
    key: keyof T,
    order: 'asc' | 'desc' = 'asc',
): T[] {
    return [...array].sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        
        if (aVal < bVal) return order === 'asc' ? -1 : 1;
        if (aVal > bVal) return order === 'asc' ? 1 : -1;
        return 0;
    });
}

// ============== Validation Helpers ==============

/**
 * التحقق من أن القيمة UUID صالح
 */
export function isValidUUID(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
}

/**
 * التحقق من أن القيمة email صالح
 */
export function isValidEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
}

/**
 * التحقق من أن القيمة رقم صالح
 */
export function isValidNumber(value: any): boolean {
    if (typeof value === 'number') {
        return isFinite(value) && !isNaN(value);
    }
    if (typeof value === 'string') {
        return !isNaN(parseFloat(value)) && isFinite(parseFloat(value));
    }
    return false;
}

// ============== Logging Helpers ==============

/**
 * تنسيق رسالة السجل
 */
export function formatLogMessage(
    action: string,
    details: Record<string, any>,
): string {
    const detailsStr = Object.entries(details)
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(', ');
    
    return `[${action}] ${detailsStr}`;
}

// ============== Export all ==============
export default {
    mapFieldPath,
    getNestedValue,
    setNestedValue,
    normalizeOperator,
    applyOperator,
    calculateTenure,
    getPeriodDates,
    calculateWorkingDays,
    generatePeriods,
    isValidPeriodFormat,
    periodToDate,
    calculateAchievementLevel,
    calculateTargetAchievement,
    toCamelCase,
    toPascalCase,
    toSnakeCase,
    toKebabCase,
    sanitizeText,
    truncateText,
    roundTo,
    clamp,
    calculatePercentage,
    chunk,
    unique,
    sortBy,
    isValidUUID,
    isValidEmail,
    isValidNumber,
    formatLogMessage,
};
