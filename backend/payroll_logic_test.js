
// Logic Verifier in Plain JS
console.log("Starting Payroll Logic Verification (Randomized Test)...");

function calculateTestPayroll(name, salary, attendance, settings) {
    console.log(`\n=== Testing for Employee: ${name} ===`);
    console.log(`Settings Applied: 
    1. lateDeductionMethod: ${settings.lateDeductionMethod}
    2. lateThresholdMinutes: ${settings.lateThresholdMinutes}
    3. gracePeriodMinutes: ${settings.gracePeriodMinutes}
    4. dailyWorkingHours: ${settings.dailyWorkingHours}
    5. overtimeMultiplier: ${settings.overtimeMultiplier}
    6. enableCumulativeLateDeduction: ${settings.enableCumulativeLateDeduction}
    7. lateCountForDayDeduction: ${settings.lateCountForDayDeduction}
    8. enableOvertimeCap: ${settings.enableOvertimeCap}
    9. maxOvertimeHoursPerMonth: ${settings.maxOvertimeHoursPerMonth}
    10. calculationMethod: ${settings.calculationMethod}`);

    const baseSalary = salary;
    const dailyWorkingHours = settings.dailyWorkingHours || 8;
    const daysInPeriod = settings.calculationMethod === 'FIXED_30_DAYS' ? 30 : 31;

    const dailyRate = baseSalary / daysInPeriod;
    const hourlyRate = baseSalary / (daysInPeriod * dailyWorkingHours);

    console.log(`Financials: Base=${salary}, DailyRate=${dailyRate.toFixed(2)}, HourlyRate=${hourlyRate.toFixed(2)}`);

    // 1. Late Deduction
    let lateDeduction = 0;
    let lateMinutes = attendance.lateMinutes || 0;
    let effectiveLate = Math.max(0, lateMinutes - (settings.gracePeriodMinutes || 15));

    if (settings.lateDeductionMethod === 'DAILY_RATE') {
        if (attendance.lateDaysOverThreshold > 0) {
            lateDeduction = dailyRate * attendance.lateDaysOverThreshold;
            console.log(`[ACTION] Late Deduction (DAILY_RATE): ${attendance.lateDaysOverThreshold} days x ${dailyRate.toFixed(2)} = ${lateDeduction.toFixed(2)}`);
        } else if (effectiveLate > 0) {
            lateDeduction = (effectiveLate / 60) * hourlyRate;
            console.log(`[ACTION] Late Deduction (Fallback to PER_MINUTE): ${effectiveLate} min = ${lateDeduction.toFixed(2)}`);
        }
    }

    // 2. Cumulative Late
    if (settings.enableCumulativeLateDeduction && (attendance.lateCount || 0) >= (settings.lateCountForDayDeduction || 3)) {
        const fullDays = Math.floor(attendance.lateCount / settings.lateCountForDayDeduction);
        const cumulativeDed = dailyRate * fullDays;
        console.log(`[ACTION] Cumulative Late (Triggered): ${fullDays} days ded. = ${cumulativeDed.toFixed(2)}`);
        if (cumulativeDed > lateDeduction) {
            lateDeduction = cumulativeDed;
            console.log(`   --> Result: Using Cumulative deduction (higher): ${lateDeduction.toFixed(2)}`);
        }
    }

    // 3. Overtime with Cap (Fixed Logic)
    let regOT = attendance.otHours || 0;
    let weekendOT = attendance.weekendOT || 0;
    let holidayOT = attendance.holidayOT || 0;

    let totalSumOT = regOT + weekendOT + holidayOT;
    let totalCappedOT = totalSumOT;
    if (settings.enableOvertimeCap && totalSumOT > settings.maxOvertimeHoursPerMonth) {
        totalCappedOT = settings.maxOvertimeHoursPerMonth;
        console.log(`[ACTION] Overtime Capped: ${totalSumOT.toFixed(2)}h total -> ${totalCappedOT.toFixed(2)}h cap`);
    }

    let holidayFinal = Math.min(holidayOT, totalCappedOT);
    let weekendFinal = Math.min(weekendOT, totalCappedOT - holidayFinal);
    let regularFinal = Math.max(0, totalCappedOT - holidayFinal - weekendFinal);

    const otAmount = (regularFinal * hourlyRate * settings.overtimeMultiplier)
        + (weekendFinal * hourlyRate * settings.weekendOvertimeMultiplier)
        + (holidayFinal * hourlyRate * settings.holidayOvertimeMultiplier);

    console.log(`[ACTION] Overtime Calculated: ${otAmount.toFixed(2)} SAR (Reg:${regularFinal}, Wknd:${weekendFinal}, Hol:${holidayFinal})`);

    const net = baseSalary + otAmount - lateDeduction;
    console.log(`\nFINAL NET SALARY: ${net.toFixed(2)} SAR`);
    console.log("--------------------------------------------------");
}

const commonSettings = {
    lateDeductionMethod: 'DAILY_RATE',
    lateThresholdMinutes: 60,
    gracePeriodMinutes: 15,
    dailyWorkingHours: 9,
    overtimeMultiplier: 1.5,
    weekendOvertimeMultiplier: 2.0, // Fixed default
    holidayOvertimeMultiplier: 2.0, // Fixed default
    enableCumulativeLateDeduction: true,
    lateCountForDayDeduction: 2,
    enableOvertimeCap: true,
    maxOvertimeHoursPerMonth: 5,
    calculationMethod: 'FIXED_30_DAYS'
};

// Simulation Case 1: Mohamed (Late + Over Cap)
calculateTestPayroll("محمد أحمد", 9000, {
    lateMinutes: 140, // 2 times x 70 min
    lateDaysOverThreshold: 2,
    lateCount: 2, // Triggers cumulative (2/2 = 1 day)
    otHours: 10,
    weekendOT: 0,
    holidayOT: 0
}, commonSettings);

// Simulation Case 2: علي حسن (OT Mix + Cap)
calculateTestPayroll("علي حسن", 12000, {
    lateMinutes: 30,
    lateDaysOverThreshold: 0,
    lateCount: 1,
    otHours: 4,
    weekendOT: 4, // Total 8 -> Caps to 5
    holidayOT: 0
}, commonSettings);
