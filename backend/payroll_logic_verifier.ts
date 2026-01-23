
// @ts-nocheck
import { Decimal } from 'decimal.js';

// --- Recreating the FIXED Logic for Verification ---
const ZERO = new Decimal(0);
const ONE = new Decimal(1);

function calcDailyRate(salary: Decimal, days: number): Decimal {
    return salary.div(days || 30);
}

function calcHourlyRate(salary: Decimal, days: number, hours: number): Decimal {
    return salary.div((days || 30) * (hours || 8));
}

function calculateTestPayroll(name: string, salary: number, attendance: any, settings: any) {
    console.log(`\n=== Testing for Employee: ${name} ===`);
    console.log(`Settings: LateMethod=${settings.lateDeductionMethod}, Threshold=${settings.lateThresholdMinutes}, Grace=${settings.gracePeriodMinutes}, OT_Cap=${settings.maxOvertimeHoursPerMonth}`);

    const baseSalary = new Decimal(salary);
    const dailyWorkingHours = settings.dailyWorkingHours || 8;
    const daysInPeriod = settings.calculationMethod === 'FIXED_30_DAYS' ? 30 : 31;

    const dailyRate = calcDailyRate(baseSalary, daysInPeriod);
    const hourlyRate = calcHourlyRate(baseSalary, daysInPeriod, dailyWorkingHours);

    console.log(`Base: ${salary}, DailyRate: ${dailyRate.toFixed(2)}, HourlyRate: ${hourlyRate.toFixed(2)}`);

    // 1. Late Deduction
    let lateDeduction = ZERO;
    let lateMinutes = attendance.lateMinutes || 0;
    let effectiveLate = Math.max(0, lateMinutes - (settings.gracePeriodMinutes || 15));

    if (settings.lateDeductionMethod === 'DAILY_RATE') {
        if (attendance.lateDaysOverThreshold > 0) {
            lateDeduction = dailyRate.mul(attendance.lateDaysOverThreshold);
            console.log(`-> Late Deduction (DAILY_RATE): ${attendance.lateDaysOverThreshold} days x ${dailyRate.toFixed(2)} = ${lateDeduction.toFixed(2)}`);
        } else if (effectiveLate > 0) {
            lateDeduction = new Decimal(effectiveLate).div(60).mul(hourlyRate);
            console.log(`-> Late Deduction (Fallback to PER_MINUTE): ${effectiveLate} min = ${lateDeduction.toFixed(2)}`);
        }
    }

    // 2. Cumulative Late
    if (settings.enableCumulativeLateDeduction && (attendance.lateCount || 0) >= (settings.lateCountForDayDeduction || 3)) {
        const fullDays = Math.floor(attendance.lateCount / settings.lateCountForDayDeduction);
        const cumulativeDed = dailyRate.mul(fullDays);
        console.log(`-> Cumulative Late (Triggered): ${fullDays} extra days = ${cumulativeDed.toFixed(2)}`);
        if (cumulativeDed.gt(lateDeduction)) {
            lateDeduction = cumulativeDed;
            console.log(`   (Cumulative is higher, using it: ${lateDeduction.toFixed(2)})`);
        }
    }

    // 3. Overtime
    let otHours = new Decimal(attendance.otHours || 0);
    let weekendOT = new Decimal(attendance.weekendOT || 0);
    let holidayOT = new Decimal(attendance.holidayOT || 0);

    // THE BUG FIX TEST: Summing all before capping
    let totalSumOT = otHours.plus(weekendOT).plus(holidayOT);
    let totalCappedOT = totalSumOT;
    if (settings.enableOvertimeCap && totalSumOT.gt(settings.maxOvertimeHoursPerMonth)) {
        totalCappedOT = new Decimal(settings.maxOvertimeHoursPerMonth);
        console.log(`-> Overtime Capped: ${totalSumOT.toFixed(2)}h -> ${totalCappedOT.toFixed(2)}h`);
    }

    const holidayFinal = Decimal.min(holidayOT, totalCappedOT);
    const weekendFinal = Decimal.min(weekendOT, totalCappedOT.minus(holidayFinal));
    const regularFinal = Decimal.max(ZERO, totalCappedOT.minus(holidayFinal).minus(weekendFinal));

    const otAmount = regularFinal.mul(hourlyRate).mul(settings.overtimeMultiplier || 1.5)
        .plus(weekendFinal.mul(hourlyRate).mul(settings.weekendOvertimeMultiplier || 2.0))
        .plus(holidayFinal.mul(hourlyRate).mul(settings.holidayOvertimeMultiplier || 2.0));

    console.log(`-> Overtime Amount: ${otAmount.toFixed(2)} (Reg: ${regularFinal}, Wknd: ${weekendFinal}, Hol: ${holidayFinal})`);

    const net = baseSalary.plus(otAmount).minus(lateDeduction);
    console.log(`FINAL NET (Simulated): ${net.toFixed(2)}`);
}

const commonSettings = {
    lateDeductionMethod: 'DAILY_RATE',
    lateThresholdMinutes: 60,
    gracePeriodMinutes: 15,
    dailyWorkingHours: 9,
    overtimeMultiplier: 1.5,
    weekendOvertimeMultiplier: 2.0,
    holidayOvertimeMultiplier: 2.0,
    enableCumulativeLateDeduction: true,
    lateCountForDayDeduction: 2,
    enableOvertimeCap: true,
    maxOvertimeHoursPerMonth: 5,
    calculationMethod: 'FIXED_30_DAYS'
};

// Test Case 1: Mohamed (Late daily rate + OT Cap)
calculateTestPayroll("محمد أحمد", 9000, {
    lateMinutes: 140, // 70 + 70
    lateDaysOverThreshold: 2, // 2 days > 60 min
    lateCount: 2,
    otHours: 10, // Exceeds cap of 5
    weekendOT: 0,
    holidayOT: 0
}, commonSettings);

// Test Case 2: علي حسن (OT Mix + Cap)
calculateTestPayroll("علي حسن", 12000, {
    lateMinutes: 30, // Within threshold
    lateDaysOverThreshold: 0,
    lateCount: 1,
    otHours: 4,
    weekendOT: 4, // Total 8 -> should be capped to 5
    holidayOT: 0
}, commonSettings);
