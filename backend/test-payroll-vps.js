const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function test() {
    const employeeId = "9173f0b6-a656-4f78-aa38-568c67c987d2";
    const emp = await p.user.findUnique({ where: { id: employeeId } });
    const companyId = emp.companyId;

    const atts = await p.attendance.findMany({ where: { userId: employeeId } });

    let presentDays = 0, absentDays = 0, lateMinutes = 0, lateCount = 0, overtimeMinutes = 0;

    for (const a of atts) {
        if (a.status === "PRESENT" || a.status === "LATE") presentDays++;
        else if (a.status === "ABSENT") absentDays++;
        const l = a.lateMinutes || 0;
        lateMinutes += l;
        if (l > 0) lateCount++;
        overtimeMinutes += a.overtimeMinutes || 0;
    }

    const assignment = await p.employeeSalaryAssignment.findFirst({
        where: { employeeId: employeeId, isActive: true }
    });

    const baseSalary = Number(assignment?.baseSalary || 5000);
    const dailyRate = baseSalary / 30;
    const hourlyRate = dailyRate / 8;

    const settings = await p.payrollSettings.findUnique({ where: { companyId } });

    console.log("Employee:", emp.firstName, emp.lastName);
    console.log("Base Salary:", baseSalary, "SAR");
    console.log("Present Days:", presentDays, "| Absent:", absentDays);
    console.log("Late Minutes:", lateMinutes, "| Late Count:", lateCount);
    console.log("Overtime Hours:", (overtimeMinutes / 60).toFixed(1));

    // Calculate late deduction
    const lateDeduction = (lateMinutes / 60) * hourlyRate;
    const absenceDeduction = absentDays * dailyRate;
    const overtimeAmount = (overtimeMinutes / 60) * hourlyRate * (settings?.overtimeMultiplier || 1.5);

    // GOSI with cap
    let gosiBase = baseSalary;
    if (settings?.gosiMaxSalary && gosiBase > settings.gosiMaxSalary) {
        gosiBase = settings.gosiMaxSalary;
    }
    const gosiEmployee = gosiBase * ((settings?.gosiEmployeePercent || 9.75) / 100);
    const sanedEmployee = settings?.enableSanedCalculation
        ? gosiBase * ((settings?.sanedEmployeePercent || 0.75) / 100)
        : 0;

    const totalDeductions = lateDeduction + absenceDeduction + gosiEmployee + sanedEmployee;
    const grossSalary = baseSalary + overtimeAmount;
    const netSalary = grossSalary - totalDeductions;

    console.log("\n--- Calculation ---");
    console.log("Gross Salary:", grossSalary.toFixed(2));
    console.log("+Overtime:", overtimeAmount.toFixed(2));
    console.log("-Late Deduction:", lateDeduction.toFixed(2));
    console.log("-Absence Deduction:", absenceDeduction.toFixed(2));
    console.log("-GOSI:", gosiEmployee.toFixed(2));
    console.log("-SANED:", sanedEmployee.toFixed(2));
    console.log("=Total Deductions:", totalDeductions.toFixed(2));
    console.log("\n=== NET SALARY:", netSalary.toFixed(2), "SAR ===");

    console.log("\n--- Settings Used ---");
    console.log("Late Method:", settings?.lateDeductionMethod);
    console.log("OT Multiplier:", settings?.overtimeMultiplier);
    console.log("GOSI Max Salary:", settings?.gosiMaxSalary);
    console.log("SANED Enabled:", settings?.enableSanedCalculation);

    await p.$disconnect();
}

test().catch(console.error);
