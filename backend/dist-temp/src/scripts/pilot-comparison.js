"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fs = require("fs");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('📊 Generating Pilot Comparison Report...\n');
    const company = await prisma.company.findFirst();
    if (!company)
        throw new Error('No company found');
    const run = await prisma.payrollRun.findFirst({
        where: { companyId: company.id, isAdjustment: false },
        orderBy: { createdAt: 'desc' },
        include: {
            period: true,
            payslips: {
                include: {
                    employee: { select: { employeeCode: true, firstName: true, lastName: true, isSaudi: true } },
                    lines: { include: { component: true } }
                }
            }
        }
    });
    if (!run)
        throw new Error('No PayrollRun found');
    console.log(`Period: ${run.period.year}-${run.period.month}`);
    console.log(`Run ID: ${run.id}`);
    console.log(`Payslips: ${run.payslips.length}\n`);
    const csvRows = [
        [
            'Employee Code',
            'Employee Name',
            'isSaudi',
            'Old Gross',
            'New Gross',
            'Old Deductions',
            'New Deductions',
            'GOSI Old',
            'GOSI New',
            'Old Net',
            'New Net',
            'Difference',
            'Notes'
        ].join(',')
    ];
    for (const payslip of run.payslips) {
        const emp = payslip.employee;
        const name = `${emp.firstName} ${emp.lastName}`;
        const gosiLine = payslip.lines.find(l => l.component.code === 'GOSI_DED');
        const gosiNew = gosiLine ? Number(gosiLine.amount) : 0;
        const oldGross = 0;
        const oldDeductions = 0;
        const gosiOld = 0;
        const oldNet = 0;
        const newGross = Number(payslip.grossSalary);
        const newDeductions = Number(payslip.totalDeductions);
        const newNet = Number(payslip.netSalary);
        const difference = newNet - oldNet;
        const notes = [];
        if (gosiNew > 0 && gosiOld === 0)
            notes.push('GOSI applied');
        if (difference !== 0)
            notes.push(`Diff: ${difference > 0 ? '+' : ''}${difference.toFixed(2)}`);
        csvRows.push([
            emp.employeeCode || '',
            `"${name}"`,
            emp.isSaudi ? 'Yes' : 'No',
            oldGross.toFixed(2),
            newGross.toFixed(2),
            oldDeductions.toFixed(2),
            newDeductions.toFixed(2),
            gosiOld.toFixed(2),
            gosiNew.toFixed(2),
            oldNet.toFixed(2),
            newNet.toFixed(2),
            difference.toFixed(2),
            `"${notes.join('; ')}"`
        ].join(','));
    }
    const totals = run.payslips.reduce((acc, p) => ({
        gross: acc.gross + Number(p.grossSalary),
        deductions: acc.deductions + Number(p.totalDeductions),
        net: acc.net + Number(p.netSalary),
        gosi: acc.gosi + (p.lines.find(l => l.component.code === 'GOSI_DED')?.amount ? Number(p.lines.find(l => l.component.code === 'GOSI_DED').amount) : 0)
    }), { gross: 0, deductions: 0, net: 0, gosi: 0 });
    csvRows.push([
        'TOTAL',
        '',
        '',
        '0.00',
        totals.gross.toFixed(2),
        '0.00',
        totals.deductions.toFixed(2),
        '0.00',
        totals.gosi.toFixed(2),
        '0.00',
        totals.net.toFixed(2),
        totals.net.toFixed(2),
        '"New System Totals"'
    ].join(','));
    const filename = `pilot_comparison_${run.period.year}_${String(run.period.month).padStart(2, '0')}.csv`;
    fs.writeFileSync(filename, csvRows.join('\n'), 'utf-8');
    console.log('='.repeat(50));
    console.log('📊 PILOT COMPARISON SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Employees: ${run.payslips.length}`);
    console.log(`Total Gross:     ${totals.gross.toLocaleString()} SAR`);
    console.log(`Total GOSI:      ${totals.gosi.toLocaleString()} SAR`);
    console.log(`Total Net:       ${totals.net.toLocaleString()} SAR`);
    console.log('');
    console.log(`✅ CSV saved: ${filename}`);
    console.log('');
    console.log('📌 Next: Fill "Old" columns with legacy data for comparison');
    await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
//# sourceMappingURL=pilot-comparison.js.map