/**
 * Pilot Comparison Report Generator
 * Generates CSV comparing Old vs New payroll calculations
 * 
 * Usage: npx ts-node src/scripts/pilot-comparison.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    console.log('📊 Generating Pilot Comparison Report...\n');

    const company = await prisma.company.findFirst();
    if (!company) throw new Error('No company found');

    // Get latest PayrollRun
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

    if (!run) throw new Error('No PayrollRun found');

    console.log(`Period: ${run.period.year}-${run.period.month}`);
    console.log(`Run ID: ${run.id}`);
    console.log(`Payslips: ${run.payslips.length}\n`);

    // CSV Header
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

    // Process each payslip
    for (const payslip of run.payslips) {
        const emp = payslip.employee;
        const name = `${emp.firstName} ${emp.lastName}`;

        // Calculate GOSI from lines
        const gosiLine = payslip.lines.find(l => l.component.code === 'GOSI_DED');
        const gosiNew = gosiLine ? Number(gosiLine.amount) : 0;

        // For comparison, assume Old values are 0 (since this is new system)
        // In real scenario, you'd pull from legacy system
        const oldGross = 0;
        const oldDeductions = 0;
        const gosiOld = 0;
        const oldNet = 0;

        const newGross = Number(payslip.grossSalary);
        const newDeductions = Number(payslip.totalDeductions);
        const newNet = Number(payslip.netSalary);

        const difference = newNet - oldNet;

        // Generate notes
        const notes: string[] = [];
        if (gosiNew > 0 && gosiOld === 0) notes.push('GOSI applied');
        if (difference !== 0) notes.push(`Diff: ${difference > 0 ? '+' : ''}${difference.toFixed(2)}`);

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

    // Calculate totals
    const totals = run.payslips.reduce((acc, p) => ({
        gross: acc.gross + Number(p.grossSalary),
        deductions: acc.deductions + Number(p.totalDeductions),
        net: acc.net + Number(p.netSalary),
        gosi: acc.gosi + (p.lines.find(l => l.component.code === 'GOSI_DED')?.amount ? Number(p.lines.find(l => l.component.code === 'GOSI_DED')!.amount) : 0)
    }), { gross: 0, deductions: 0, net: 0, gosi: 0 });

    // Add totals row
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

    // Write CSV file
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
