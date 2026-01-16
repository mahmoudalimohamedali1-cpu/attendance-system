import { Decimal } from '@prisma/client/runtime/library';
import {
    toDecimal,
    toNumber,
    toFixed,
    add,
    sub,
    mul,
    div,
    percent,
    sum,
    avg,
    round,
    roundToNearest,
    min,
    max,
    abs,
    isPositive,
    isNegative,
    isZero,
    clamp,
    dailyRate,
    hourlyRate,
    proRata,
    applyDeductionCap,
    calculateNetSalary,
    isValidDecimal,
    formatCurrency,
    ZERO,
    ONE,
    HUNDRED,
} from './decimal.util';

describe('Decimal Utility Module', () => {
    describe('toDecimal', () => {
        it('should convert number to Decimal', () => {
            const result = toDecimal(100.50);
            expect(result).toBeInstanceOf(Decimal);
            expect(result.toNumber()).toBe(100.5);
        });

        it('should convert string to Decimal', () => {
            const result = toDecimal('100.50');
            expect(result.toNumber()).toBe(100.5);
        });

        it('should return Decimal unchanged', () => {
            const input = new Decimal(100);
            const result = toDecimal(input);
            expect(result).toBe(input);
        });

        it('should return ZERO for null/undefined', () => {
            expect(toDecimal(null).isZero()).toBe(true);
            expect(toDecimal(undefined).isZero()).toBe(true);
        });

        it('should return default value for invalid input', () => {
            expect(toDecimal('invalid', 50).toNumber()).toBe(50);
        });
    });

    describe('Arithmetic Operations', () => {
        it('should add correctly', () => {
            expect(add(100, 50).toNumber()).toBe(150);
            expect(add('100.25', '50.75').toNumber()).toBe(151);
        });

        it('should subtract correctly', () => {
            expect(sub(100, 30).toNumber()).toBe(70);
        });

        it('should multiply correctly', () => {
            expect(mul(100, 0.15).toNumber()).toBe(15);
        });

        it('should divide correctly', () => {
            expect(div(100, 4).toNumber()).toBe(25);
        });

        it('should return 0 on division by zero', () => {
            expect(div(100, 0).toNumber()).toBe(0);
        });

        it('should calculate percentage correctly', () => {
            expect(percent(1000, 15).toNumber()).toBe(150);
            expect(percent(5000, 9.75).toNumber()).toBe(487.5);
        });

        it('should sum correctly', () => {
            expect(sum(100, 200, 300).toNumber()).toBe(600);
        });

        it('should average correctly', () => {
            expect(avg(100, 200, 300).toNumber()).toBe(200);
        });
    });

    describe('Rounding', () => {
        it('should round to 2 decimal places by default', () => {
            expect(round(100.456).toNumber()).toBe(100.46);
            expect(round(100.454).toNumber()).toBe(100.45);
        });

        it('should round UP correctly', () => {
            expect(round(100.451, 2, 'UP').toNumber()).toBe(100.46);
        });

        it('should round DOWN correctly', () => {
            expect(round(100.459, 2, 'DOWN').toNumber()).toBe(100.45);
        });

        it('should round to nearest value correctly', () => {
            expect(roundToNearest(123, 5).toNumber()).toBe(125);
            expect(roundToNearest(122, 5).toNumber()).toBe(120);
            expect(roundToNearest(1234.56, 10).toNumber()).toBe(1230);
        });
    });

    describe('Comparisons', () => {
        it('should detect positive values', () => {
            expect(isPositive(100)).toBe(true);
            expect(isPositive(-100)).toBe(false);
            expect(isPositive(0)).toBe(false);
        });

        it('should detect negative values', () => {
            expect(isNegative(-100)).toBe(true);
            expect(isNegative(100)).toBe(false);
        });

        it('should detect zero', () => {
            expect(isZero(0)).toBe(true);
            expect(isZero('0')).toBe(true);
            expect(isZero(0.001)).toBe(false);
        });

        it('should find min correctly', () => {
            expect(min(100, 50, 75).toNumber()).toBe(50);
        });

        it('should find max correctly', () => {
            expect(max(100, 50, 75).toNumber()).toBe(100);
        });

        it('should clamp values correctly', () => {
            expect(clamp(150, 0, 100).toNumber()).toBe(100);
            expect(clamp(-50, 0, 100).toNumber()).toBe(0);
            expect(clamp(50, 0, 100).toNumber()).toBe(50);
        });
    });

    describe('Payroll Functions', () => {
        it('should calculate daily rate correctly', () => {
            expect(dailyRate(3000, 30).toNumber()).toBe(100);
            expect(dailyRate(6000, 30).toNumber()).toBe(200);
        });

        it('should calculate hourly rate correctly', () => {
            expect(hourlyRate(2400, 30, 8).toNumber()).toBe(10);
        });

        it('should calculate pro-rata correctly', () => {
            const result = proRata(3000, 15, 30);
            expect(result.toNumber()).toBe(1500);
        });

        describe('applyDeductionCap', () => {
            it('should not cap when under limit', () => {
                const result = applyDeductionCap(10000, 4000, 50);
                expect(result.wasCapped).toBe(false);
                expect(result.cappedDeductions.toNumber()).toBe(4000);
                expect(result.excessAmount.toNumber()).toBe(0);
            });

            it('should cap when over limit', () => {
                const result = applyDeductionCap(10000, 6000, 50);
                expect(result.wasCapped).toBe(true);
                expect(result.cappedDeductions.toNumber()).toBe(5000);
                expect(result.excessAmount.toNumber()).toBe(1000);
            });
        });

        describe('calculateNetSalary', () => {
            it('should calculate positive net correctly', () => {
                const result = calculateNetSalary(10000, 3000);
                expect(result.netSalary.toNumber()).toBe(7000);
                expect(result.hasNegativeBalance).toBe(false);
            });

            it('should handle negative net correctly', () => {
                const result = calculateNetSalary(3000, 5000);
                expect(result.netSalary.toNumber()).toBe(0);
                expect(result.hasNegativeBalance).toBe(true);
                expect(result.negativeBalance.toNumber()).toBe(2000);
            });
        });
    });

    describe('Validation', () => {
        it('should validate correct decimals', () => {
            expect(isValidDecimal(100)).toBe(true);
            expect(isValidDecimal('100.50')).toBe(true);
            expect(isValidDecimal(new Decimal(100))).toBe(true);
        });

        it('should reject invalid decimals', () => {
            expect(isValidDecimal('invalid')).toBe(false);
            expect(isValidDecimal(NaN)).toBe(false);
            expect(isValidDecimal(Infinity)).toBe(false);
        });
    });

    describe('Formatting', () => {
        it('should format currency correctly', () => {
            const formatted = formatCurrency(1000, 'SAR', 'en-SA');
            expect(formatted).toContain('1,000');
        });
    });

    describe('Precision Tests', () => {
        it('should handle large numbers without precision loss', () => {
            const a = toDecimal('99999999999.99');
            const b = toDecimal('0.01');
            const result = add(a, b);
            expect(result.toString()).toBe('100000000000');
        });

        it('should handle small decimal differences', () => {
            const result = sub(toDecimal('0.3'), toDecimal('0.1'));
            expect(result.toNumber()).toBeCloseTo(0.2, 10);
        });

        it('should accumulate without floating point errors', () => {
            let total = ZERO;
            for (let i = 0; i < 1000; i++) {
                total = add(total, toDecimal('0.001'));
            }
            expect(total.toNumber()).toBe(1);
        });
    });
});
