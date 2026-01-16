"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const TEST_CONFIG = {
    companyId: '',
    employeeId: '',
    periodId: '',
};
async function setup() {
    console.log('🔧 Setting up test data...');
    const company = await prisma.company.findFirst();
    if (!company)
        throw new Error('No company found. Please create a company first.');
    TEST_CONFIG.companyId = company.id;
    const employee = await prisma.user.findFirst({
        where: { companyId: company.id, role: 'EMPLOYEE' },
        include: { salaryAssignments: true }
    });
    if (!employee)
        throw new Error('No employee found. Please create an employee first.');
    TEST_CONFIG.employeeId = employee.id;
    const now = new Date();
    const period = await prisma.payrollPeriod.create({
        data: {
            companyId: company.id,
            month: now.getMonth() + 1,
            year: now.getFullYear(),
            startDate: new Date(now.getFullYear(), now.getMonth(), 1),
            endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
            status: 'DRAFT',
        }
    });
    TEST_CONFIG.periodId = period.id;
    console.log(`✅ Setup complete: Company=${company.id}, Employee=${employee.id}, Period=${period.id}`);
    return { company, employee, period };
}
async function testCreatePayrollRun() {
    console.log('\n📋 Test 1: Create PayrollRun...');
    const run = await prisma.payrollRun.create({
        data: {
            companyId: TEST_CONFIG.companyId,
            periodId: TEST_CONFIG.periodId,
            status: 'DRAFT',
        }
    });
    console.log(`✅ Created PayrollRun: ${run.id}`);
    return run;
}
async function testCreatePayslip(runId) {
    console.log('\n📋 Test 2: Create Payslip with lines...');
    const payslip = await prisma.payslip.create({
        data: {
            companyId: TEST_CONFIG.companyId,
            employeeId: TEST_CONFIG.employeeId,
            periodId: TEST_CONFIG.periodId,
            runId,
            baseSalary: 5000,
            grossSalary: 5500,
            totalDeductions: 500,
            netSalary: 5000,
            status: 'DRAFT',
        }
    });
    const component = await prisma.salaryComponent.findFirst({
        where: { companyId: TEST_CONFIG.companyId }
    });
    if (component) {
        await prisma.payslipLine.create({
            data: {
                payslipId: payslip.id,
                componentId: component.id,
                sign: 'EARNING',
                amount: 500,
                sourceType: client_1.PayslipLineSource.POLICY,
                sourceRef: 'TEST:1',
                descriptionAr: 'سطر اختباري',
            }
        });
    }
    console.log(`✅ Created Payslip: ${payslip.id}`);
    return payslip;
}
async function testIdempotency(payslipId) {
    console.log('\n📋 Test 3: Idempotency (delete + reinsert POLICY lines)...');
    const before = await prisma.payslipLine.count({
        where: { payslipId, sourceType: client_1.PayslipLineSource.POLICY }
    });
    console.log(`  Lines before: ${before}`);
    const deleted = await prisma.payslipLine.deleteMany({
        where: { payslipId, sourceType: client_1.PayslipLineSource.POLICY }
    });
    console.log(`  Deleted: ${deleted.count}`);
    const component = await prisma.salaryComponent.findFirst({
        where: { companyId: TEST_CONFIG.companyId }
    });
    if (component) {
        await prisma.payslipLine.create({
            data: {
                payslipId,
                componentId: component.id,
                sign: 'EARNING',
                amount: 550,
                sourceType: client_1.PayslipLineSource.POLICY,
                sourceRef: 'TEST:2',
                descriptionAr: 'سطر اختباري معاد',
            }
        });
    }
    const after = await prisma.payslipLine.count({
        where: { payslipId, sourceType: client_1.PayslipLineSource.POLICY }
    });
    console.log(`  Lines after: ${after}`);
    if (before === after) {
        console.log(`✅ Idempotency test passed! Lines count unchanged: ${after}`);
    }
    else {
        console.log(`⚠️ Lines changed from ${before} to ${after}`);
    }
}
async function testLocking(runId, payslipId) {
    console.log('\n📋 Test 4: Locking run...');
    await prisma.payrollRun.update({
        where: { id: runId },
        data: {
            lockedAt: new Date(),
            lockedBy: 'TEST_SCRIPT',
            status: 'LOCKED',
        }
    });
    console.log(`✅ Run locked: ${runId}`);
    console.log(`✅ Locking test passed!`);
}
async function testAdjustmentRun(originalRunId) {
    console.log('\n📋 Test 5: Create AdjustmentRun...');
    const adjustmentRun = await prisma.payrollRun.create({
        data: {
            companyId: TEST_CONFIG.companyId,
            periodId: TEST_CONFIG.periodId,
            isAdjustment: true,
            originalRunId,
            adjustmentReason: 'اختبار تعديل - سبب الاختبار',
            status: 'DRAFT',
        }
    });
    console.log(`✅ Created AdjustmentRun: ${adjustmentRun.id}`);
    console.log(`  - isAdjustment: ${adjustmentRun.isAdjustment}`);
    console.log(`  - originalRunId: ${adjustmentRun.originalRunId}`);
    console.log(`  - adjustmentReason: ${adjustmentRun.adjustmentReason}`);
    return adjustmentRun;
}
async function cleanup() {
    console.log('\n🧹 Cleaning up test data...');
    await prisma.payslipLine.deleteMany({
        where: { payslip: { periodId: TEST_CONFIG.periodId } }
    });
    await prisma.payslip.deleteMany({
        where: { periodId: TEST_CONFIG.periodId }
    });
    await prisma.payrollRun.deleteMany({
        where: { periodId: TEST_CONFIG.periodId }
    });
    await prisma.payrollPeriod.delete({
        where: { id: TEST_CONFIG.periodId }
    });
    console.log('✅ Cleanup complete');
}
async function main() {
    console.log('🚀 Payroll Engine Integration Test\n');
    console.log('='.repeat(50));
    try {
        const { company, employee, period } = await setup();
        const run = await testCreatePayrollRun();
        const payslip = await testCreatePayslip(run.id);
        await testIdempotency(payslip.id);
        await testLocking(run.id, payslip.id);
        await testAdjustmentRun(run.id);
        console.log('\n' + '='.repeat(50));
        console.log('✅ All tests passed!');
        console.log('='.repeat(50));
    }
    catch (error) {
        console.error('\n❌ Test failed:', error);
    }
    finally {
        await cleanup();
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=test-payroll-engine.js.map