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

    // Create Payroll Runs for last 3 months
    const months = [
        { month: 10, year: 2024, status: 'LOCKED' },
        { month: 11, year: 2024, status: 'LOCKED' },
        { month: 12, year: 2024, status: 'LOCKED' },
        { month: 1, year: 2025, status: 'DRAFT' },
    ];

    for (const m of months) {
        // Check if run exists
        const existingRun = await prisma.payrollRun.findFirst({
            where: {
                companyId: company.id,
                month: m.month,
                year: m.year,
            }
        });

        if (existingRun) {
            console.log(`⏭️ Skipping ${m.month}/${m.year} - already exists`);
            continue;
        }

        // Create payroll run
        const run = await prisma.payrollRun.create({
            data: {
                companyId: company.id,
                month: m.month,
                year: m.year,
                status: m.status as any,
                totalEmployees: users.length,
                totalGross: 0,
                totalDeductions: 0,
                totalNet: 0,
                totalGosiEmployee: 0,
                totalGosiEmployer: 0,
                runDate: new Date(m.year, m.month - 1, 25),
            }
        });

        console.log(`✅ Created payroll run: ${m.month}/${m.year} (${m.status})`);

        // Create payslips for each user
        let totalGross = 0;
        let totalDeductions = 0;
        let totalNet = 0;
        let totalGosiEmployee = 0;
        let totalGosiEmployer = 0;

        for (const user of users) {
            // Random salary between 5000 and 20000
            const basicSalary = Math.floor(Math.random() * 15000) + 5000;
            const housingAllowance = Math.floor(basicSalary * 0.25);
            const transportAllowance = Math.floor(basicSalary * 0.10);

            // Calculate GOSI (Saudi only)
            const isSaudi = Math.random() > 0.3; // 70% chance Saudi
            const gosiBase = basicSalary + housingAllowance;
            const gosiEmployee = isSaudi ? Math.floor(gosiBase * 0.0975) : 0;
            const gosiEmployer = isSaudi ? Math.floor(gosiBase * 0.1175) : Math.floor(gosiBase * 0.02);

            // Random deductions
            const lateDeduction = Math.random() > 0.7 ? Math.floor(Math.random() * 200) : 0;
            const absenceDeduction = Math.random() > 0.9 ? Math.floor(Math.random() * 500) : 0;
            const loanDeduction = Math.random() > 0.8 ? Math.floor(Math.random() * 300) + 100 : 0;

            // Calculate totals
            const grossEarnings = basicSalary + housingAllowance + transportAllowance;
            const totalDeds = gosiEmployee + lateDeduction + absenceDeduction + loanDeduction;
            const netSalary = grossEarnings - totalDeds;

            // Create payslip
            await prisma.payslip.create({
                data: {
                    userId: user.id,
                    payrollRunId: run.id,
                    companyId: company.id,
                    basicSalary,
                    totalEarnings: grossEarnings,
                    totalDeductions: totalDeds,
                    netSalary,
                    gosiEmployee,
                    gosiEmployer,
                    lines: {
                        create: [
                            {
                                componentCode: 'BASIC',
                                componentName: 'الراتب الأساسي',
                                type: 'EARNING',
                                amount: basicSalary,
                                isFixed: true,
                            },
                            {
                                componentCode: 'HOUSING',
                                componentName: 'بدل السكن',
                                type: 'EARNING',
                                amount: housingAllowance,
                                isFixed: true,
                            },
                            {
                                componentCode: 'TRANSPORT',
                                componentName: 'بدل المواصلات',
                                type: 'EARNING',
                                amount: transportAllowance,
                                isFixed: true,
                            },
                            ...(gosiEmployee > 0 ? [{
                                componentCode: 'GOSI_EMP',
                                componentName: 'حصة الموظف من التأمينات',
                                type: 'DEDUCTION' as const,
                                amount: gosiEmployee,
                                isFixed: false,
                            }] : []),
                            ...(lateDeduction > 0 ? [{
                                componentCode: 'LATE_DED',
                                componentName: 'خصم التأخير',
                                type: 'DEDUCTION' as const,
                                amount: lateDeduction,
                                isFixed: false,
                            }] : []),
                            ...(absenceDeduction > 0 ? [{
                                componentCode: 'ABSENCE_DED',
                                componentName: 'خصم الغياب',
                                type: 'DEDUCTION' as const,
                                amount: absenceDeduction,
                                isFixed: false,
                            }] : []),
                            ...(loanDeduction > 0 ? [{
                                componentCode: 'LOAN_DED',
                                componentName: 'قسط سلفة',
                                type: 'DEDUCTION' as const,
                                amount: loanDeduction,
                                isFixed: false,
                            }] : []),
                        ]
                    }
                }
            });

            totalGross += grossEarnings;
            totalDeductions += totalDeds;
            totalNet += netSalary;
            totalGosiEmployee += gosiEmployee;
            totalGosiEmployer += gosiEmployer;
        }

        // Update run totals
        await prisma.payrollRun.update({
            where: { id: run.id },
            data: {
                totalGross,
                totalDeductions,
                totalNet,
                totalGosiEmployee,
                totalGosiEmployer,
            }
        });

        console.log(`   📊 Created ${users.length} payslips - Total Net: ${totalNet.toLocaleString()} SAR`);
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
                salaryCap: 45000,
                includeHousing: true,
                isActive: true,
                effectiveFrom: new Date('2024-01-01'),
            }
        });
        console.log('✅ Created GOSI configuration');
    }

    // Create sample WPS Tracking record
    const lockedRun = await prisma.payrollRun.findFirst({
        where: { companyId: company.id, status: 'LOCKED' },
        orderBy: { year: 'desc' },
    });

    if (lockedRun) {
        const existingWps = await prisma.wpsTracking.findFirst({
            where: { payrollRunId: lockedRun.id }
        });

        if (!existingWps) {
            await prisma.wpsTracking.create({
                data: {
                    companyId: company.id,
                    payrollRunId: lockedRun.id,
                    month: lockedRun.month,
                    year: lockedRun.year,
                    status: 'GENERATED',
                    fileUrl: `/uploads/wps/wps_${lockedRun.month}_${lockedRun.year}.csv`,
                    fileHashSha256: 'abc123def456...',
                    generatorVersion: '1.0.0',
                    totalEmployees: lockedRun.totalEmployees,
                    totalAmount: lockedRun.totalNet,
                }
            });
            console.log(`✅ Created WPS tracking for ${lockedRun.month}/${lockedRun.year}`);
        }
    }

    // Create sample Mudad submission
    if (lockedRun) {
        const existingMudad = await prisma.mudadSubmission.findFirst({
            where: { payrollRunId: lockedRun.id }
        });

        if (!existingMudad) {
            await prisma.mudadSubmission.create({
                data: {
                    companyId: company.id,
                    payrollRunId: lockedRun.id,
                    month: lockedRun.month,
                    year: lockedRun.year,
                    status: 'PENDING',
                }
            });
            console.log(`✅ Created Mudad submission for ${lockedRun.month}/${lockedRun.year}`);
        }
    }

    console.log('\n🎉 Payroll seed completed!');
    console.log('📝 Summary:');
    console.log('   - Payroll Runs: 4 months (Oct 2024 - Jan 2025)');
    console.log(`   - Payslips: ${users.length} per month`);
    console.log('   - GOSI Config: Active');
    console.log('   - WPS Tracking: 1 sample');
    console.log('   - Mudad Submission: 1 sample');
}

seedPayroll()
    .then(() => prisma.$disconnect())
    .catch((e) => {
        console.error('Error seeding payroll:', e);
        prisma.$disconnect();
        process.exit(1);
    });
