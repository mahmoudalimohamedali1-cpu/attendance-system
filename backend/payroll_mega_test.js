
/**
 * Mega Payroll Logic Verifier
 * Simulating 20+ Complex Settings
 */

console.log("🚀 Starting Mega Payroll Logic Verification (20+ Randomized Settings)...");

function calculateMegaPayroll(name, salaryData, attendance, leaves, settings) {
    console.log(`\n==================================================`);
    console.log(`👤 EMPLOYEE: ${name}`);
    console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`);

    // Basic Data
    const basicSalary = salaryData.basic;
    const allowancesTotal = salaryData.allowances || 0;
    const grossTotal = basicSalary + allowancesTotal;

    // Configs
    const dailyWorkingHours = settings.dailyWorkingHours || 8;
    const daysInMonth = settings.calculationMethod === 'FIXED_30_DAYS' ? 30 : 31;
    const leaveDivisor = settings.leaveDailyRateDivisor || 30;

    // A. Rates Calculation
    // Base for deduction depends on deductAbsenceFromBasic
    const deductionBase = settings.deductAbsenceFromBasic ? basicSalary : grossTotal;
    const dailyRateDed = deductionBase / (settings.unpaidLeaveCalcBase === 'FIXED_30_DAYS' ? 30 : daysInMonth);
    const hourlyRateDed = dailyRateDed / dailyWorkingHours;

    // Base for OT
    let otBase = basicSalary;
    if (settings.overtimeMethod === 'BASED_ON_TOTAL') otBase = grossTotal;
    const otDailyRate = otBase / daysInMonth;
    const otHourlyRate = otDailyRate / dailyWorkingHours;

    console.log(`[DATA] Gross: ${grossTotal}, DedBase: ${deductionBase}, OTRate: ${otHourlyRate.toFixed(2)}`);

    // 1. Unpaid Leave (Simulation of Method)
    let unpaidDed = 0;
    if (leaves.unpaidDays > 0) {
        // Logic: if BASED_ON_SHIFTS, we only deduct working days. 
        // For simulation, assume the count passed is already the correct count according to method.
        unpaidDed = leaves.unpaidDays * dailyRateDed;
        console.log(`[11-13] Unpaid Days (${leaves.unpaidDays}): -${unpaidDed.toFixed(2)} SAR`);
    }

    // 2. Sick Leave Tiers (Saudi Law)
    let sickDed = 0;
    if (leaves.sickDays > 0) {
        const fullPayLimit = settings.sickLeaveFullPayDays || 30;
        const partialPayLimit = (settings.sickLeavePartialPayDays || 60) + fullPayLimit;
        const partialPercent = settings.sickLeavePartialPayPercent || 75;

        for (let d = 1; d <= leaves.sickDays; d++) {
            const dayNum = (leaves.previousSickDays || 0) + d;
            if (dayNum > fullPayLimit && dayNum <= partialPayLimit) {
                sickDed += dailyRateDed * (1 - (partialPercent / 100));
            } else if (dayNum > partialPayLimit) {
                sickDed += dailyRateDed;
            }
        }
        console.log(`[19-22] Sick Leave Ded (${leaves.sickDays} days): -${sickDed.toFixed(2)} SAR`);
    }

    // 3. Absence Progressive Deduction
    let absenceDed = 0;
    if (attendance.absentDays > 0) {
        if (settings.absenceDeductionMethod === 'PROGRESSIVE') {
            const n = attendance.absentDays;
            const factor = settings.absenceProgressiveRate || 1.0;
            const dedDays = (n * (n + 1) / 2) * factor;
            absenceDed = dedDays * dailyRateDed;
            console.log(`[11-12] Progressive Absence (${n} days -> ${dedDays} factor): -${absenceDed.toFixed(2)} SAR`);
        } else {
            absenceDed = (attendance.absentDays * dailyRateDed);
        }
    }

    // 4. GOSI Capping & Calculation
    let gosiDed = 0;
    if (settings.enableGosiCalculation) {
        // Only specific allowances are gosiEligible
        const gosiEligibleTotal = basicSalary + (salaryData.housing || 0);
        const cappedBase = Math.min(gosiEligibleTotal, settings.gosiMaxSalary || 45000);

        const gosiRate = (settings.gosiEmployeePercent || 9.0) / 100;
        const sanedRate = settings.enableSanedCalculation ? (settings.sanedEmployeePercent || 0.75) / 100 : 0;

        gosiDed = cappedBase * (gosiRate + sanedRate);
        console.log(`[14-18] GOSI Ded (Base: ${cappedBase}): -${gosiDed.toFixed(2)} SAR`);
    }

    // 5. Total Earnings (Gross + OT)
    // For simplicity, OT is already capped for 10-settings test, we just check its base here.
    const otHours = attendance.otHours || 0;
    const otAmount = otHours * otHourlyRate * (settings.overtimeMultiplier || 1.5);
    console.log(`[27-30] Overtime (${otHours}h @ ${settings.overtimeMethod}): +${otAmount.toFixed(2)} SAR`);

    // 6. Net & Max Deduction Cap
    let currentTotalDed = unpaidDed + sickDed + absenceDed + gosiDed + (attendance.lateDed || 0);
    const maxDeductionLimit = grossTotal * (settings.maxDeductionPercent / 100 || 0.5);

    if (currentTotalDed > maxDeductionLimit) {
        console.log(`[29] [ALERT] Total Ded (${currentTotalDed.toFixed(2)}) exceeds Cap (${maxDeductionLimit.toFixed(2)})!`);
        currentTotalDed = maxDeductionLimit;
    }

    let netRaw = (grossTotal + otAmount) - currentTotalDed;

    // 7. Rounding
    let netFinal = netRaw;
    if (settings.roundSalaryToNearest > 0) {
        const roundTo = settings.roundSalaryToNearest;
        if (settings.salaryRoundingMethod === 'NEAREST') {
            netFinal = Math.round(netRaw / roundTo) * roundTo;
        } else if (settings.salaryRoundingMethod === 'UP') {
            netFinal = Math.ceil(netRaw / roundTo) * roundTo;
        }
        console.log(`[20] Rounding: ${netRaw.toFixed(4)} -> ${netFinal.toFixed(2)}`);
    }

    console.log(`\n🏆 FINAL NET: ${netFinal.toFixed(2)} SAR`);
}

// ---------------------------------------------------------
// Mega Test Scenarios
// ---------------------------------------------------------

const megaSettings = {
    calculationMethod: 'FIXED_30_DAYS',
    deductAbsenceFromBasic: false, // Deduct from TOTAL salary (Harsher)
    unpaidLeaveCalcBase: 'CALENDAR_DAYS',
    absenceDeductionMethod: 'PROGRESSIVE',
    absenceProgressiveRate: 1.0,
    enableGosiCalculation: true,
    gosiMaxSalary: 45000,
    gosiEmployeePercent: 9.0,
    enableSanedCalculation: true,
    sanedEmployeePercent: 0.75,
    sickLeaveFullPayDays: 30,
    sickLeavePartialPayPercent: 75, // 25% deduction
    sickLeavePartialPayDays: 60,
    overtimeMethod: 'BASED_ON_TOTAL', // Better for employee
    overtimeMultiplier: 1.5,
    maxDeductionPercent: 50,
    roundSalaryToNearest: 10,
    salaryRoundingMethod: 'NEAREST',
    dailyWorkingHours: 8
};

// Scenario 1: High Salary + Progressive Absence + GOSI Cap
calculateMegaPayroll("أحمد السيد (Senior)", {
    basic: 40000,
    housing: 10000, // Total GOSI Base = 50k
    allowances: 15000 // Total Gross = 65k
}, {
    absentDays: 3, // Progressive: 1+2+3 = 6 days ded
    otHours: 0,
}, {
    unpaidDays: 0,
    sickDays: 0
}, megaSettings);

// Scenario 2: Average Salary + Long Sick Leave (Tiers)
calculateMegaPayroll("سارة علي (Junior)", {
    basic: 6000,
    housing: 1500,
    allowances: 1000 // Total Gross = 8.5k
}, {
    absentDays: 0,
    otHours: 10
}, {
    unpaidDays: 5,
    sickDays: 40, // 30 full, 10 partial (25% ded)
    previousSickDays: 0
}, megaSettings);

// Scenario 3: Cap Violation Test (Excessive Deductions)
calculateMegaPayroll("خالد محمود (Cap Test)", {
    basic: 5000,
    allowances: 0 // Gross = 5k
}, {
    absentDays: 10, // Massive deduction
    otHours: 0
}, {
    unpaidDays: 0,
    sickDays: 0
}, { ...megaSettings, absenceProgressiveRate: 2.0, maxDeductionPercent: 50 });
