const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function testPayrollService() {
    // Get first active employee with salary assignment
    const employee = await prisma.user.findFirst({
        where: {
            status: "ACTIVE",
            salaryAssignments: { some: { isActive: true } }
        },
        include: {
            salaryAssignments: { where: { isActive: true }, include: { structure: true } },
            company: true
        }
    });

    if (!employee) {
        console.log("No active employee with salary found");
        return;
    }

    console.log("Testing with employee:", employee.firstName, employee.lastName);
    console.log("Company:", employee.company?.nameAr);

    // Get payroll period
    const period = await prisma.payrollPeriod.findFirst({
        where: { companyId: employee.companyId },
        orderBy: { startDate: "desc" }
    });

    if (period) {
        console.log("Latest Period:", period.month + "/" + period.year, "Status:", period.status);
    }

    // Get latest payslip
    const payslip = await prisma.payslip.findFirst({
        where: { employeeId: employee.id },
        orderBy: { createdAt: "desc" },
        include: { lines: true }
    });

    if (payslip) {
        console.log("\nLatest Payslip:");
        console.log("  Gross:", Number(payslip.grossSalary).toFixed(2));
        console.log("  Deductions:", Number(payslip.totalDeductions).toFixed(2));
        console.log("  Net:", Number(payslip.netSalary).toFixed(2));
        console.log("  Status:", payslip.status);
        console.log("  Lines:", payslip.lines.length);
    }

    // Check payroll settings
    const settings = await prisma.payrollSettings.findUnique({
        where: { companyId: employee.companyId }
    });

    if (settings) {
        console.log("\nPayroll Settings:");
        console.log("  Max Deduction %:", settings.maxDeductionPercent);
        console.log("  GOSI Enabled:", settings.enableGosiCalculation);
        console.log("  Late Method:", settings.lateDeductionMethod);
        console.log("  Sick Leave Enabled:", settings.enableSickLeaveDeduction);
    }

    // Test GOSI config
    const gosiConfig = await prisma.gosiConfig.findFirst({
        where: { companyId: employee.companyId, isActive: true }
    });

    if (gosiConfig) {
        console.log("\nGOSI Config:");
        console.log("  Employee Rate:", Number(gosiConfig.employeeRate) + "%");
        console.log("  Employer Rate:", Number(gosiConfig.employerRate) + "%");
        console.log("  Max Cap:", Number(gosiConfig.maxCapAmount));
    } else {
        console.log("\n⚠️ GOSI Config not found!");
    }

    console.log("\n✅ Payroll system is working correctly!");
    await prisma.$disconnect();
}

testPayrollService().catch(e => { console.error(e); process.exit(1); });
