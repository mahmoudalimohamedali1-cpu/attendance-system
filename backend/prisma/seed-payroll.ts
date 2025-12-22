import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPayroll() {
    console.log('💰 Seeding sample payroll data...');

    // Get company
    const company = await prisma.company.findFirst();
    if (!company) {
        console.error('❌ No company found. Run main seed first.');
        return;
    }

    // Get active users
    const users = await prisma.user.findMany({
        where: { companyId: company.id, isActive: true },
        take: 10,
    });

    if (users.length === 0) {
        console.error('❌ No users found. Run main seed first.');
        return;
    }

    console.log(`📊 Found ${users.length} users to create payslips for`);

    // Create Payroll Periods and Runs for last 3 months
    const months = [
        { month: 10, year: 2024, status: 'LOCKED' as const },
        { month: 11, year: 2024, status: 'LOCKED' as const },
        { month: 12, year: 2024, status: 'LOCKED' as const },
        { month: 1, year: 2025, status: 'DRAFT' as const },
    ];

    for (const m of months) {
        // Check if period exists
        let period = await prisma.payrollPeriod.findFirst({
            where: {
                companyId: company.id,
                month: m.month,
                year: m.year,
            }
        });

        if (!period) {
            // Create period
            const startDate = new Date(m.year, m.month - 1, 1);
            const endDate = new Date(m.year, m.month, 0);

            period = await prisma.payrollPeriod.create({
                data: {
                    companyId: company.id,
                    month: m.month,
                    year: m.year,
                    startDate,
                    endDate,
                    status: m.status,
                }
            });
            console.log(`✅ Created period: ${m.month}/${m.year}`);
        } else {
            console.log(`⏭️ Period ${m.month}/${m.year} already exists`);
        }

        // Check if run exists
        const existingRun = await prisma.payrollRun.findFirst({
            where: { periodId: period.id }
        });

        if (existingRun) {
            console.log(`⏭️ Skipping run for ${m.month}/${m.year} - already exists`);
            continue;
        }

        // Create payroll run
        const run = await prisma.payrollRun.create({
            data: {
                companyId: company.id,
                periodId: period.id,
                status: m.status,
                runDate: new Date(m.year, m.month - 1, 25),
            }
        });

        console.log(`✅ Created payroll run: ${m.month}/${m.year} (${m.status})`);

        // Create payslips for each user
        for (const user of users) {
            // Random salary between 5000 and 20000
            const basicSalary = Math.floor(Math.random() * 15000) + 5000;
            const housingAllowance = Math.floor(basicSalary * 0.25);
            const transportAllowance = Math.floor(basicSalary * 0.10);

            // Calculate GOSI (Saudi only)
            const isSaudi = Math.random() > 0.3; // 70% chance Saudi
            const gosiBase = basicSalary + housingAllowance;
            const gosiEmployee = isSaudi ? Math.floor(gosiBase * 0.0975) : 0;

            // Random deductions
            const lateDeduction = Math.random() > 0.7 ? Math.floor(Math.random() * 200) : 0;
            const loanDeduction = Math.random() > 0.8 ? Math.floor(Math.random() * 300) + 100 : 0;

            // Calculate totals
            const grossSalary = basicSalary + housingAllowance + transportAllowance;
            const totalDeductions = gosiEmployee + lateDeduction + loanDeduction;
            const netSalary = grossSalary - totalDeductions;

            // Create payslip
            await prisma.payslip.create({
                data: {
                    employeeId: user.id,
                    companyId: company.id,
                    periodId: period.id,
                    runId: run.id,
                    baseSalary: basicSalary,
                    grossSalary,
                    totalDeductions,
                    netSalary,
                    status: m.status,
                    lines: {
                        create: [
                            {
                                componentCode: 'BASIC',
                                componentName: 'الراتب الأساسي',
                                type: 'EARNING',
                                amount: basicSalary,
                            },
                            {
                                componentCode: 'HOUSING',
                                componentName: 'بدل السكن',
                                type: 'EARNING',
                                amount: housingAllowance,
                            },
                            {
                                componentCode: 'TRANSPORT',
                                componentName: 'بدل المواصلات',
                                type: 'EARNING',
                                amount: transportAllowance,
                            },
                            ...(gosiEmployee > 0 ? [{
                                componentCode: 'GOSI_EMP',
                                componentName: 'حصة الموظف من التأمينات',
                                type: 'DEDUCTION' as const,
                                amount: gosiEmployee,
                            }] : []),
                            ...(lateDeduction > 0 ? [{
                                componentCode: 'LATE_DED',
                                componentName: 'خصم التأخير',
                                type: 'DEDUCTION' as const,
                                amount: lateDeduction,
                            }] : []),
                            ...(loanDeduction > 0 ? [{
                                componentCode: 'LOAN_DED',
                                componentName: 'قسط سلفة',
                                type: 'DEDUCTION' as const,
                                amount: loanDeduction,
                            }] : []),
                        ]
                    }
                }
            });
        }

        console.log(`   📊 Created ${users.length} payslips for ${m.month}/${m.year}`);
    }

    // Create GOSI Config if not exists
    const gosiConfig = await prisma.gosiConfig.findFirst({
        where: { companyId: company.id, isActive: true }
    });

    if (!gosiConfig) {
        await prisma.gosiConfig.create({
            data: {
                companyId: company.id,
                saudiEmployeeRate: 9.75,
                saudiEmployerRate: 11.75,
                nonSaudiEmployerRate: 2.0,
                contributionCap: 45000,
                includeHousing: true,
                isActive: true,
                effectiveFrom: new Date('2024-01-01'),
            }
        });
        console.log('✅ Created GOSI configuration');
    }

    console.log('\n🎉 Payroll seed completed!');
    console.log('📝 Summary:');
    console.log('   - Payroll Periods: 4 months (Oct 2024 - Jan 2025)');
    console.log(`   - Payslips: ${users.length} per month`);
    console.log('   - GOSI Config: Active');
}

seedPayroll()
    .then(() => prisma.$disconnect())
    .catch((e) => {
        console.error('Error seeding payroll:', e);
        prisma.$disconnect();
        process.exit(1);
    });
