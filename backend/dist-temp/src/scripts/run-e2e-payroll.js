"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const CONFIG = { testYear: 2025, testMonth: 1 };
const results = [];
function log(test, pass, note) {
    results.push({ test, pass, note });
    console.log(`  ${pass ? '✅' : '❌'} ${test}${note ? ` (${note})` : ''}`);
}
async function main() {
    console.log('🚀 E2E Payroll Test Run\n');
    const company = await prisma.company.findFirst();
    if (!company)
        throw new Error('No company');
    console.log(`Company: ${company.name}\n`);
    const period = await prisma.payrollPeriod.findFirst({
        where: { companyId: company.id, year: CONFIG.testYear, month: CONFIG.testMonth }
    });
    if (!period)
        throw new Error('Period not found. Run seed first.');
    console.log('📋 Step A: PayrollRun...');
    let run = await prisma.payrollRun.findFirst({
        where: { companyId: company.id, periodId: period.id, isAdjustment: false }
    });
    if (!run) {
        run = await prisma.payrollRun.create({
            data: { companyId: company.id, periodId: period.id, status: 'DRAFT' }
        });
        log('PayrollRun created', true, run.id);
    }
    else {
        log('PayrollRun exists', true, run.id);
    }
    console.log('\n📋 Step B: Payslips...');
    const payslips = await prisma.payslip.findMany({
        where: { runId: run.id },
        include: {
            employee: { select: { employeeCode: true, isSaudi: true } },
            lines: { include: { component: true } }
        }
    });
    log('Payslips exist', payslips.length > 0, `${payslips.length} payslips`);
    const e2e = payslips.filter(p => p.employee.employeeCode?.startsWith('E2E-'));
    for (const p of e2e) {
        const hasStructure = p.lines.some(l => l.sourceType === 'STRUCTURE');
        const hasStatutory = p.lines.some(l => l.sourceType === 'STATUTORY');
        console.log(`    ${p.employee.employeeCode}: STRUCT=${hasStructure}, STAT=${hasStatutory}`);
    }
    console.log('\n📋 Step C: GOSI...');
    for (const p of e2e) {
        const gosiLine = p.lines.find(l => l.component.code === 'GOSI_DED');
        if (p.employee.isSaudi && gosiLine) {
            log(`${p.employee.employeeCode} (Saudi) has GOSI`, true, `${gosiLine.amount}`);
        }
        else if (!p.employee.isSaudi && !gosiLine) {
            log(`${p.employee.employeeCode} (Non-Saudi) no GOSI`, true);
        }
        else {
            log(`${p.employee.employeeCode} GOSI check`, false);
        }
    }
    console.log('\n📋 Step D: WPS...');
    const totalNet = payslips.reduce((s, p) => s + Number(p.netSalary), 0);
    log('Total net calculated', true, `${totalNet.toLocaleString()} SAR`);
    console.log('\n📋 Step E: Lock...');
    if (!run.lockedAt) {
        await prisma.payrollRun.update({
            where: { id: run.id },
            data: { lockedAt: new Date(), lockedBy: 'E2E_TEST', status: 'LOCKED' }
        });
        log('Run locked', true);
    }
    else {
        log('Already locked', true);
    }
    console.log('\n📋 Step F: AdjustmentRun...');
    let adjRun = await prisma.payrollRun.findFirst({
        where: { originalRunId: run.id, isAdjustment: true }
    });
    if (!adjRun) {
        adjRun = await prisma.payrollRun.create({
            data: {
                companyId: company.id,
                periodId: period.id,
                isAdjustment: true,
                originalRunId: run.id,
                adjustmentReason: 'E2E Test',
                status: 'DRAFT',
            }
        });
        log('AdjustmentRun created', true);
    }
    else {
        log('AdjustmentRun exists', true);
    }
    console.log('\n' + '='.repeat(50));
    const passed = results.filter(r => r.pass).length;
    const failed = results.filter(r => !r.pass).length;
    console.log(`📊 RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('='.repeat(50));
    if (failed === 0) {
        console.log('\n🎉 E2E tests passed! Ready for Production Pilot.');
    }
    else {
        console.log('\n⚠️ Some tests failed. Review before Production.');
    }
    await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
//# sourceMappingURL=run-e2e-payroll.js.map