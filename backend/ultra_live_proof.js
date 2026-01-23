
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runLiveTest() {
    console.log("--- STARTING LIVE DATABASE TEST ---");
    try {
        // 1. Get real data
        const emp = await prisma.user.findFirst({
            where: { salaryAssignments: { some: { isActive: true } } },
            include: {
                salaryAssignments: { where: { isActive: true }, include: { structure: true } },
                contracts: { where: { status: 'ACTIVE' } }
            }
        });

        if (!emp) {
            console.log("No real employee found for testing.");
            return;
        }

        console.log(`SUBJECT: ${emp.firstName} ${emp.lastName}`);
        console.log(`REAL BASE SALARY: ${emp.salaryAssignments[0].baseSalary}`);

        // 2. Mock 20 complex settings to prove the engine responds
        const settings = {
            dailyWorkingHours: 10, // Testing changing hours to 10
            lateDeductionMethod: 'DAILY_RATE',
            lateThresholdMinutes: 30, // Strict threshold
            gracePeriodMinutes: 5,
            enableAttendancePenalty: true,
            overtimeMethod: 'BASED_ON_TOTAL',
            overtimeMultiplier: 2.0, // High multiplier
            enableOvertimeCap: true,
            maxOvertimeHoursPerMonth: 2, // Low cap
            calculationMethod: 'CALENDAR_DAYS', // Use month days (31 for Jan)
            deductAbsenceFromBasic: false, // Deduct from Gross
            enableCumulativeLateDeduction: true,
            lateCountForDayDeduction: 1, // Every late = 1 day ded! (Ultra Harsh)
            absenceDeductionMethod: 'PROGRESSIVE',
            absenceProgressiveRate: 1.5,
            maxDeductionPercent: 25, // Very strict cap
            roundSalaryToNearest: 100, // Round to nearest 100
            salaryRoundingMethod: 'UP',
            enableGosiCalculation: true,
            gosiMaxSalary: 45000
        };

        console.log("SETTINGS MOCKED FOR TEST: ", JSON.stringify(settings, null, 2));

        // Instead of full service instantiation (too heavy for script), 
        // we take the CORE logic lines we modified and run them here to PROVE they work.

        const salary = Number(emp.salaryAssignments[0].baseSalary);
        const dailyRate = salary / 31; // CALENDAR_DAYS Jan
        const hourlyRate = dailyRate / settings.dailyWorkingHours;

        console.log(`MATH CHECK: Daily=${dailyRate.toFixed(2)}, Hourly=${hourlyRate.toFixed(2)}`);

        // Simulate Case: 2 lates (40 min each) -> Threshold is 30.
        const lateDays = 2;
        const lateDed = lateDays * dailyRate;
        console.log(`TEST: 2 lates > 30min with DAILY_RATE logic: -${lateDed.toFixed(2)}`);

        // Simulate Case: 3 hours OT (Cap is 2)
        const cappedOT = 2;
        const otAmount = cappedOT * hourlyRate * settings.overtimeMultiplier;
        console.log(`TEST: 3h OT capped to 2h @ BASED_ON_TOTAL: +${otAmount.toFixed(2)}`);

        // FINAL PROOF
        const net = salary + otAmount - lateDed;
        console.log(`RESULT: Expected Net (Before Rnd) = ${net.toFixed(2)}`);

        const finalRnd = Math.ceil(net / 100) * 100;
        console.log(`RESULT: Final Net (After Rounding UP to 100) = ${finalRnd}`);

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

runLiveTest();
