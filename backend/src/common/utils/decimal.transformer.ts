/**
 * Decimal Transformer for DTOs
 *
 * يستخدم لتحويل القيم بين Decimal و Number في DTOs
 * للتعامل مع البيانات الواردة من API والمُرسلة إلى API
 */

import { Transform, Type } from 'class-transformer';
import { Decimal } from '@prisma/client/runtime/library';
import { toDecimal, toNumber, ZERO } from './decimal.util';

/**
 * Decorator لتحويل القيمة الواردة إلى Decimal
 * يستخدم في DTOs لضمان أن القيم المالية تكون Decimal
 *
 * @example
 * class CreatePayrollDto {
 *   @ToDecimal()
 *   baseSalary: Decimal;
 * }
 */
export function ToDecimal() {
    return Transform(({ value }) => {
        if (value === null || value === undefined) {
            return ZERO;
        }
        return toDecimal(value);
    });
}

/**
 * Decorator لتحويل Decimal إلى Number للإرسال
 * يستخدم في Response DTOs
 *
 * @example
 * class PayrollResponseDto {
 *   @FromDecimal()
 *   netSalary: number;
 * }
 */
export function FromDecimal(decimalPlaces: number = 2) {
    return Transform(({ value }) => {
        if (value === null || value === undefined) {
            return 0;
        }
        if (value instanceof Decimal) {
            return toNumber(value, decimalPlaces);
        }
        return Number(value) || 0;
    });
}

/**
 * Decorator لتحويل مصفوفة من القيم إلى Decimal
 *
 * @example
 * class BulkPayrollDto {
 *   @ToDecimalArray()
 *   amounts: Decimal[];
 * }
 */
export function ToDecimalArray() {
    return Transform(({ value }) => {
        if (!Array.isArray(value)) {
            return [];
        }
        return value.map(v => toDecimal(v));
    });
}

/**
 * Decorator لتحويل كائن يحتوي على قيم مالية
 * يحول جميع الحقول الرقمية إلى Decimal
 *
 * @param fields - أسماء الحقول المراد تحويلها
 *
 * @example
 * class PayrollLineDto {
 *   @ToDecimalFields(['amount', 'rate'])
 *   data: { amount: Decimal; rate: Decimal; name: string };
 * }
 */
export function ToDecimalFields(fields: string[]) {
    return Transform(({ value }) => {
        if (!value || typeof value !== 'object') {
            return value;
        }

        const result = { ...value };
        for (const field of fields) {
            if (field in result) {
                result[field] = toDecimal(result[field]);
            }
        }
        return result;
    });
}

/**
 * دالة مساعدة لتحويل كائن Response إلى أرقام
 * تستخدم في Controllers قبل إرسال البيانات
 *
 * @param obj - الكائن المراد تحويله
 * @param decimalFields - أسماء الحقول التي تحتوي على Decimal
 * @param decimalPlaces - عدد المنازل العشرية
 */
export function convertDecimalsToNumbers<T extends object>(
    obj: T,
    decimalFields: (keyof T)[],
    decimalPlaces: number = 2
): T {
    const result = { ...obj } as any;

    for (const field of decimalFields) {
        if (field in result && result[field] instanceof Decimal) {
            result[field] = toNumber(result[field], decimalPlaces);
        }
    }

    return result as T;
}

/**
 * دالة مساعدة لتحويل مصفوفة من الكائنات
 */
export function convertArrayDecimalsToNumbers<T extends object>(
    arr: T[],
    decimalFields: (keyof T)[],
    decimalPlaces: number = 2
): T[] {
    return arr.map(item => convertDecimalsToNumbers(item, decimalFields, decimalPlaces));
}

/**
 * Pipe لتحويل Decimal في NestJS
 * يمكن استخدامه كـ Global Pipe أو على مستوى Controller
 */
export class DecimalTransformPipe {
    transform(value: any): any {
        if (value instanceof Decimal) {
            return toNumber(value);
        }

        if (Array.isArray(value)) {
            return value.map(v => this.transform(v));
        }

        if (value && typeof value === 'object') {
            const result: any = {};
            for (const [key, val] of Object.entries(value)) {
                result[key] = this.transform(val);
            }
            return result;
        }

        return value;
    }
}
