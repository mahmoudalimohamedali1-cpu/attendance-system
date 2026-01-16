/**
 * Decimal Utility Module for Payroll Engine
 *
 * هذا الملف يوفر أدوات التعامل مع الأرقام العشرية بدقة عالية
 * لضمان عدم فقدان الدقة في الحسابات المالية
 *
 * القواعد:
 * 1. جميع الحسابات المالية تستخدم Decimal فقط
 * 2. التحويل من Number يحدث فقط عند حدود الإدخال
 * 3. التحويل إلى Number يحدث فقط للعرض في UI
 * 4. جميع العمليات الحسابية تتم بـ Decimal
 */

import { Decimal } from '@prisma/client/runtime/library';

// ============================================
// Constants
// ============================================

/** القيمة صفر - لتجنب إنشاء كائنات متكررة */
export const ZERO = new Decimal(0);

/** القيمة واحد */
export const ONE = new Decimal(1);

/** القيمة مائة - للنسب المئوية */
export const HUNDRED = new Decimal(100);

/** عدد المنازل العشرية الافتراضي للتقريب النهائي */
export const DEFAULT_DECIMAL_PLACES = 2;

/** عدد المنازل العشرية للحسابات الوسيطة (دقة أعلى) */
export const INTERMEDIATE_DECIMAL_PLACES = 6;

// ============================================
// Type Definitions
// ============================================

/** أنواع الإدخال المقبولة للتحويل إلى Decimal */
export type DecimalInput = number | string | Decimal | null | undefined;

/** طرق التقريب المدعومة */
export type RoundingMode = 'UP' | 'DOWN' | 'NEAREST' | 'HALF_UP' | 'HALF_DOWN';

// ============================================
// Conversion Functions (Entry Points)
// ============================================

/**
 * تحويل قيمة إلى Decimal بشكل آمن
 * هذه الدالة هي نقطة الدخول الوحيدة لتحويل الأرقام
 *
 * @param value - القيمة المراد تحويلها
 * @param defaultValue - القيمة الافتراضية إذا كان الإدخال غير صالح
 * @returns Decimal
 *
 * @example
 * toDecimal(100)           // Decimal(100)
 * toDecimal("100.50")      // Decimal(100.50)
 * toDecimal(null)          // Decimal(0)
 * toDecimal(undefined, 10) // Decimal(10)
 */
export function toDecimal(value: DecimalInput, defaultValue: DecimalInput = 0): Decimal {
    if (value === null || value === undefined) {
        return toDecimal(defaultValue, 0);
    }

    if (value instanceof Decimal) {
        return value;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '' || isNaN(Number(trimmed))) {
            return toDecimal(defaultValue, 0);
        }
        return new Decimal(trimmed);
    }

    if (typeof value === 'number') {
        if (!isFinite(value) || isNaN(value)) {
            return toDecimal(defaultValue, 0);
        }
        // تحويل Number إلى String أولاً لتجنب مشاكل الدقة
        return new Decimal(value.toString());
    }

    return toDecimal(defaultValue, 0);
}

/**
 * تحويل Decimal إلى Number للعرض في UI فقط
 * تحذير: لا تستخدم هذه الدالة في الحسابات!
 *
 * @param value - قيمة Decimal
 * @param decimalPlaces - عدد المنازل العشرية (افتراضي 2)
 * @returns number
 */
export function toNumber(value: Decimal, decimalPlaces: number = DEFAULT_DECIMAL_PLACES): number {
    return Number(value.toFixed(decimalPlaces));
}

/**
 * تحويل Decimal إلى String للتخزين أو العرض
 *
 * @param value - قيمة Decimal
 * @param decimalPlaces - عدد المنازل العشرية
 * @returns string
 */
export function toFixed(value: Decimal, decimalPlaces: number = DEFAULT_DECIMAL_PLACES): string {
    return value.toFixed(decimalPlaces);
}

// ============================================
// Arithmetic Operations
// ============================================

/**
 * جمع قيمتين
 */
export function add(a: DecimalInput, b: DecimalInput): Decimal {
    return toDecimal(a).add(toDecimal(b));
}

/**
 * طرح قيمتين
 */
export function sub(a: DecimalInput, b: DecimalInput): Decimal {
    return toDecimal(a).sub(toDecimal(b));
}

/**
 * ضرب قيمتين
 */
export function mul(a: DecimalInput, b: DecimalInput): Decimal {
    return toDecimal(a).mul(toDecimal(b));
}

/**
 * قسمة قيمتين (مع حماية من القسمة على صفر)
 */
export function div(a: DecimalInput, b: DecimalInput, onZero: DecimalInput = 0): Decimal {
    const divisor = toDecimal(b);
    if (divisor.isZero()) {
        return toDecimal(onZero);
    }
    return toDecimal(a).div(divisor);
}

/**
 * حساب النسبة المئوية
 * @example percent(1000, 15) // 150 (15% من 1000)
 */
export function percent(value: DecimalInput, percentage: DecimalInput): Decimal {
    return mul(toDecimal(value), div(toDecimal(percentage), HUNDRED));
}

/**
 * حساب المجموع لمصفوفة من القيم
 */
export function sum(...values: DecimalInput[]): Decimal {
    let result = ZERO;
    for (const val of values) {
        result = result.add(toDecimal(val));
    }
    return result;
}

/**
 * حساب المتوسط لمصفوفة من القيم
 */
export function avg(...values: DecimalInput[]): Decimal {
    if (values.length === 0) return ZERO;
    return div(sum(...values), values.length);
}

// ============================================
// Rounding Functions
// ============================================

/**
 * تقريب قيمة إلى عدد معين من المنازل العشرية
 *
 * @param value - القيمة المراد تقريبها
 * @param decimalPlaces - عدد المنازل العشرية
 * @param mode - طريقة التقريب
 * @returns Decimal
 */
export function round(
    value: DecimalInput,
    decimalPlaces: number = DEFAULT_DECIMAL_PLACES,
    mode: RoundingMode = 'HALF_UP'
): Decimal {
    const d = toDecimal(value);

    switch (mode) {
        case 'UP':
            // تقريب لأعلى دائماً
            return d.toDecimalPlaces(decimalPlaces, Decimal.ROUND_CEIL);
        case 'DOWN':
            // تقريب لأسفل دائماً
            return d.toDecimalPlaces(decimalPlaces, Decimal.ROUND_FLOOR);
        case 'NEAREST':
        case 'HALF_UP':
            // تقريب عادي (0.5 لأعلى)
            return d.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP);
        case 'HALF_DOWN':
            // تقريب (0.5 لأسفل)
            return d.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_DOWN);
        default:
            return d.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP);
    }
}

/**
 * تقريب لأقرب قيمة معينة (مثل أقرب 5 أو 10)
 * @example roundToNearest(123.45, 5) // 125
 */
export function roundToNearest(value: DecimalInput, nearest: DecimalInput, mode: RoundingMode = 'NEAREST'): Decimal {
    const n = toDecimal(nearest);
    if (n.isZero()) return toDecimal(value);

    const d = toDecimal(value);
    const divided = d.div(n);
    const rounded = round(divided, 0, mode);
    return rounded.mul(n);
}

// ============================================
// Comparison Functions
// ============================================

/**
 * هل القيمة أكبر من صفر؟
 */
export function isPositive(value: DecimalInput): boolean {
    return toDecimal(value).gt(ZERO);
}

/**
 * هل القيمة أقل من صفر؟
 */
export function isNegative(value: DecimalInput): boolean {
    return toDecimal(value).lt(ZERO);
}

/**
 * هل القيمة تساوي صفر؟
 */
export function isZero(value: DecimalInput): boolean {
    return toDecimal(value).isZero();
}

/**
 * الحصول على القيمة المطلقة
 */
export function abs(value: DecimalInput): Decimal {
    return toDecimal(value).abs();
}

/**
 * الحصول على القيمة الأصغر
 */
export function min(...values: DecimalInput[]): Decimal {
    if (values.length === 0) return ZERO;
    let result = toDecimal(values[0]);
    for (let i = 1; i < values.length; i++) {
        const d = toDecimal(values[i]);
        if (d.lt(result)) result = d;
    }
    return result;
}

/**
 * الحصول على القيمة الأكبر
 */
export function max(...values: DecimalInput[]): Decimal {
    if (values.length === 0) return ZERO;
    let result = toDecimal(values[0]);
    for (let i = 1; i < values.length; i++) {
        const d = toDecimal(values[i]);
        if (d.gt(result)) result = d;
    }
    return result;
}

/**
 * التأكد من أن القيمة ضمن نطاق معين
 */
export function clamp(value: DecimalInput, minVal: DecimalInput, maxVal: DecimalInput): Decimal {
    const v = toDecimal(value);
    const minD = toDecimal(minVal);
    const maxD = toDecimal(maxVal);
    if (v.lt(minD)) return minD;
    if (v.gt(maxD)) return maxD;
    return v;
}

// ============================================
// Payroll-Specific Functions
// ============================================

/**
 * حساب المعدل اليومي من الراتب الشهري
 * @param monthlySalary - الراتب الشهري
 * @param daysInMonth - عدد أيام الشهر (افتراضي 30)
 */
export function dailyRate(monthlySalary: DecimalInput, daysInMonth: DecimalInput = 30): Decimal {
    return div(toDecimal(monthlySalary), toDecimal(daysInMonth));
}

/**
 * حساب المعدل بالساعة من الراتب الشهري
 * @param monthlySalary - الراتب الشهري
 * @param daysInMonth - عدد أيام الشهر (افتراضي 30)
 * @param hoursPerDay - ساعات العمل اليومية (افتراضي 8)
 */
export function hourlyRate(
    monthlySalary: DecimalInput,
    daysInMonth: DecimalInput = 30,
    hoursPerDay: DecimalInput = 8
): Decimal {
    return div(dailyRate(monthlySalary, daysInMonth), toDecimal(hoursPerDay));
}

/**
 * حساب Pro-rata (التناسب) للراتب
 * @param salary - الراتب الكامل
 * @param workedDays - أيام العمل الفعلية
 * @param totalDays - إجمالي أيام الفترة
 */
export function proRata(salary: DecimalInput, workedDays: DecimalInput, totalDays: DecimalInput): Decimal {
    const total = toDecimal(totalDays);
    if (total.isZero()) return ZERO;

    const factor = div(toDecimal(workedDays), total);
    // استخدام دقة عالية للحساب الوسيط
    const result = mul(toDecimal(salary), factor);
    return round(result, INTERMEDIATE_DECIMAL_PLACES);
}

/**
 * تطبيق الحد الأقصى للخصومات (نظام العمل السعودي - المادة 91)
 * @param grossSalary - الراتب الإجمالي
 * @param totalDeductions - إجمالي الخصومات
 * @param maxPercent - الحد الأقصى كنسبة مئوية (افتراضي 50%)
 * @returns { cappedDeductions, excessAmount }
 */
export function applyDeductionCap(
    grossSalary: DecimalInput,
    totalDeductions: DecimalInput,
    maxPercent: DecimalInput = 50
): { cappedDeductions: Decimal; excessAmount: Decimal; wasCapped: boolean } {
    const gross = toDecimal(grossSalary);
    const deductions = toDecimal(totalDeductions);
    const maxAllowed = percent(gross, maxPercent);

    if (deductions.gt(maxAllowed)) {
        return {
            cappedDeductions: maxAllowed,
            excessAmount: deductions.sub(maxAllowed),
            wasCapped: true,
        };
    }

    return {
        cappedDeductions: deductions,
        excessAmount: ZERO,
        wasCapped: false,
    };
}

/**
 * حساب صافي الراتب مع التأكد من عدم السالب
 * @param grossSalary - الراتب الإجمالي
 * @param totalDeductions - إجمالي الخصومات
 * @returns { netSalary, negativeBalance, hasNegativeBalance }
 */
export function calculateNetSalary(
    grossSalary: DecimalInput,
    totalDeductions: DecimalInput
): { netSalary: Decimal; negativeBalance: Decimal; hasNegativeBalance: boolean } {
    const gross = toDecimal(grossSalary);
    const deductions = toDecimal(totalDeductions);
    const net = gross.sub(deductions);

    if (net.isNegative()) {
        return {
            netSalary: ZERO,
            negativeBalance: net.abs(),
            hasNegativeBalance: true,
        };
    }

    return {
        netSalary: net,
        negativeBalance: ZERO,
        hasNegativeBalance: false,
    };
}

// ============================================
// Validation Functions
// ============================================

/**
 * التحقق من صحة قيمة Decimal
 */
export function isValidDecimal(value: any): boolean {
    try {
        if (value === null || value === undefined) {
            return false;
        }

        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed === '' || isNaN(Number(trimmed))) {
                return false;
            }
        }

        if (typeof value === 'number') {
            if (!isFinite(value) || isNaN(value)) {
                return false;
            }
        }

        const d = new Decimal(value.toString());
        return d.isFinite() && !d.isNaN();
    } catch {
        return false;
    }
}

/**
 * التحقق من أن القيمة موجبة وغير صفرية
 */
export function isPositiveNonZero(value: DecimalInput): boolean {
    const d = toDecimal(value);
    return d.gt(ZERO);
}

// ============================================
// Formatting Functions (For Display Only)
// ============================================

/**
 * تنسيق القيمة كعملة للعرض
 * @param value - القيمة
 * @param currency - رمز العملة (افتراضي SAR)
 * @param locale - اللغة (افتراضي ar-SA)
 */
export function formatCurrency(
    value: DecimalInput,
    currency: string = 'SAR',
    locale: string = 'ar-SA'
): string {
    const num = toNumber(toDecimal(value));
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(num);
}

/**
 * تنسيق القيمة كنسبة مئوية للعرض
 */
export function formatPercent(
    value: DecimalInput,
    decimalPlaces: number = 2,
    locale: string = 'ar-SA'
): string {
    const num = toNumber(div(toDecimal(value), HUNDRED), decimalPlaces + 2);
    return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
    }).format(num);
}

// ============================================
// Export Decimal class for type annotations
// ============================================
export { Decimal };
