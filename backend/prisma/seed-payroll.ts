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
        where: { companyId: company.id },
        take: 10,
    });

    if (users.length === 0) {
        console.error('❌ No users found. Run main seed first.');
        return;
    }

    console.log(`📊 Found ${users.length} users`);

    // Ensure basic salary components exist
    const components = {
        BASIC: await prisma.salaryComponent.upsert({
            where: { id: 'seed-basic' },
            update: {},
            create: {
                id: 'seed-basic',
                code: 'BASIC',
                nameAr: 'الراتب الأساسي',
                nameEn: 'Basic Salary',
                type: 'EARNING',
                isFixed: true,
                isActive: true,
                companyId: company.id,
            }
        }),
        HOUSING: await prisma.salaryComponent.upsert({
            where: { id: 'seed-housing' },
            update: {},
            create: {
                id: 'seed-housing',
                code: 'HOUSING',
                nameAr: 'بدل السكن',
                nameEn: 'Housing Allowance',
                type: 'EARNING',
                isFixed: true,
                isActive: true,
                companyId: company.id,
            }
        }),
        TRANSPORT: await prisma.salaryComponent.upsert({
            where: { id: 'seed-transport' },
            update: {},
            create: {
                id: 'seed-transport',
                code: 'TRANSPORT',
                nameAr: 'بدل المواصلات',
                nameEn: 'Transport Allowance',
                type: 'EARNING',
                isFixed: true,
                isActive: true,
                companyId: company.id,
            }
        }),
        GOSI: await prisma.salaryComponent.upsert({
            where: { id: 'seed-gosi' },
            update: {},
            create: {
                id: 'seed-gosi',
                code: 'GOSI_EMP',
                nameAr: 'حصة الموظف من التأمينات',
                nameEn: 'GOSI Employee Share',
                type: 'DEDUCTION',
                isFixed: false,
                isActive: true,
                companyId: company.id,
            }
        }),
    };

    console.log('✅ Salary components ready');

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
            console.log(`⏭️ Period ${m.month}/${m.year} exists`);
        }

        // Check if run exists
        const existingRun = await prisma.payrollRun.findFirst({
            where: { periodId: period.id }
        });

        if (existingRun) {
            console.log(`⏭️ Run for ${m.month}/${m.year} exists`);
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

        console.log(`✅ Created run: ${m.month}/${m.year}`);

        // Create payslips for each user
        for (const user of users) {
            const basicSalary = Math.floor(Math.random() * 15000) + 5000;
            const housingAllowance = Math.floor(basicSalary * 0.25);
            const transportAllowance = Math.floor(basicSalary * 0.10);
            const gosiEmployee = Math.floor((basicSalary + housingAllowance) * 0.0975);

            const grossSalary = basicSalary + housingAllowance + transportAllowance;
            const totalDeductions = gosiEmployee;
            const netSalary = grossSalary - totalDeductions;

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
                                componentId: components.BASIC.id,
                                sign: 'EARNING',
                                amount: basicSalary,
                                sourceType: 'STRUCTURE',
                            },
                            {
                                componentId: components.HOUSING.id,
                                sign: 'EARNING',
                                amount: housingAllowance,
                                sourceType: 'STRUCTURE',
                            },
                            {
                                componentId: components.TRANSPORT.id,
                                sign: 'EARNING',
                                amount: transportAllowance,
                                sourceType: 'STRUCTURE',
                            },
                            {
                                componentId: components.GOSI.id,
                                sign: 'DEDUCTION',
                                amount: gosiEmployee,
                                sourceType: 'STATUTORY',
                            },
                        ]
                    }
                }
            });
        }

        console.log(`   📊 Created ${users.length} payslips`);
    }

    // Create GOSI Config if not exists
    const gosiConfig = await prisma.gosiConfig.findFirst({
        where: { companyId: company.id, isActive: true }
    });

    if (!gosiConfig) {
        await prisma.gosiConfig.create({
            data: {
                companyId: company.id,
                employeeRate: 9.75,
                employerRate: 11.75,
                sanedRate: 0.75,
                hazardRate: 2.0,
                maxCapAmount: 45000,
                isActive: true,
                effectiveDate: new Date('2024-01-01'),
            }
        });
        console.log('✅ Created GOSI configuration');
    }

    console.log('\n🎉 Payroll seed completed!');
}

seedPayroll()
    .then(() => prisma.$disconnect())
    .catch((e) => {
        console.error('Error seeding payroll:', e);
        prisma.$disconnect();
        process.exit(1);
    });
