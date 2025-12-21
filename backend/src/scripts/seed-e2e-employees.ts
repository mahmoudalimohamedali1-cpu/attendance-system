/**
 * E2E Test Data Seed Script (Simplified)
 * Creates 5 test employees for payroll testing
 * 
 * Usage: npx ts-node src/scripts/seed-e2e-employees.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const CONFIG = {
    testYear: 2025,
    testMonth: 1,
    gosiEmployeeRate: 9.75,
    gosiMaxCap: 45000,
    gosiMinBase: 1500,
};

const testEmployees = [
    { code: 'E2E-01', firstName: 'أحمد', lastName: 'MinCap', isSaudi: true, basicSalary: 1000 },
    { code: 'E2E-02', firstName: 'محمد', lastName: 'Normal', isSaudi: true, basicSalary: 5000 },
    { code: 'E2E-03', firstName: 'خالد', lastName: 'MaxCap', isSaudi: true, basicSalary: 50000 },
    { code: 'E2E-04', firstName: 'John', lastName: 'NonSaudi', isSaudi: false, basicSalary: 4000 },
    { code: 'E2E-05', firstName: 'سعد', lastName: 'Allowance', isSaudi: true, basicSalary: 6000 },
];

async function main() {
    console.log('🚀 E2E Payroll Test Data Seed\n');

    const company = await prisma.company.findFirst();
    if (!company) throw new Error('No company found');
    console.log(`✅ Company: ${company.name} (${company.id})`);

    const branch = await prisma.branch.findFirst({ where: { companyId: company.id } });
    if (!branch) throw new Error('No branch found');

    let structure = await prisma.salaryStructure.findFirst({
        where: { companyId: company.id, isActive: true }
    });
    if (!structure) {
        structure = await prisma.salaryStructure.create({
            data: {
                companyId: company.id,
                name: 'E2E Test Structure',
                isActive: true,
                effectiveDate: new Date(CONFIG.testYear, 0, 1),
            }
        });
        console.log(`✅ Created Structure: ${structure.name}`);
    } else {
        console.log(`✅ Structure: ${structure.name} (${structure.id})`);
    }

    // Create/update period
    let period = await prisma.payrollPeriod.findFirst({
        where: { companyId: company.id, year: CONFIG.testYear, month: CONFIG.testMonth }
    });
    if (!period) {
        period = await prisma.payrollPeriod.create({
            data: {
                companyId: company.id,
                year: CONFIG.testYear,
                month: CONFIG.testMonth,
                startDate: new Date(CONFIG.testYear, CONFIG.testMonth - 1, 1),
                endDate: new Date(CONFIG.testYear, CONFIG.testMonth, 0),
                status: 'DRAFT'
            }
        });
    }
    console.log(`✅ Period: ${CONFIG.testYear}-${CONFIG.testMonth}\n`);

    const hashedPassword = await bcrypt.hash('Test@123', 10);
    const createdEmployees = [];

    for (const emp of testEmployees) {
        let user = await prisma.user.findFirst({
            where: { companyId: company.id, employeeCode: emp.code }
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    companyId: company.id,
                    branchId: branch.id,
                    email: `${emp.code.toLowerCase()}@test.com`,
                    password: hashedPassword,
                    firstName: emp.firstName,
                    lastName: emp.lastName,
                    employeeCode: emp.code,
                    role: 'EMPLOYEE',
                    status: 'ACTIVE',
                    isSaudi: emp.isSaudi,
                    nationality: emp.isSaudi ? 'Saudi' : 'Egyptian',
                    phone: `050000000${testEmployees.indexOf(emp)}`,
                }
            });
            console.log(`  ✅ Created: ${emp.code} - ${emp.firstName} ${emp.lastName}`);

        } else {
            await prisma.user.update({
                where: { id: user.id },
                data: { isSaudi: emp.isSaudi }
            });
            console.log(`  ℹ️ Exists: ${emp.code} - ${emp.firstName} ${emp.lastName}`);
        }

        // Check if salary assignment exists
        const assignment = await prisma.employeeSalaryAssignment.findFirst({
            where: { employeeId: user.id }
        });

        if (!assignment) {
            await prisma.employeeSalaryAssignment.create({
                data: {
                    employeeId: user.id,
                    structureId: structure.id,
                    baseSalary: emp.basicSalary,
                    effectiveDate: new Date(CONFIG.testYear, 0, 1),
                }
            });
            console.log(`    → Salary: ${emp.basicSalary} SAR`);
        }

        createdEmployees.push({ ...emp, id: user.id });
    }

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📋 E2E EMPLOYEES');
    console.log('='.repeat(50));
    console.log('| Code    | isSaudi | Salary  | GOSI Expected    |');
    console.log('|---------|---------|---------|------------------|');

    for (const emp of createdEmployees) {
        const saudi = emp.isSaudi ? '✅' : '❌';
        let gosiExpected = '0';
        if (emp.isSaudi) {
            let base = emp.basicSalary;
            if (base < CONFIG.gosiMinBase) base = CONFIG.gosiMinBase;
            if (base > CONFIG.gosiMaxCap) base = CONFIG.gosiMaxCap;
            gosiExpected = (base * CONFIG.gosiEmployeeRate / 100).toFixed(2);
        }
        console.log(`| ${emp.code} | ${saudi}      | ${String(emp.basicSalary).padStart(7)} | ${gosiExpected.padStart(16)} |`);
    }

    console.log('\n✅ Done! Run: npx ts-node src/scripts/run-e2e-payroll.ts');
    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
