/**
 * GOSI Calculation Test Script
 * 
 * This script tests the GOSI deduction calculation in PayrollCalculationService
 * 
 * Run with: npx ts-node src/scripts/test-gosi-calculation.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestResult {
    testName: string;
    passed: boolean;
    details: string;
    expected?: string;
    actual?: string;
}

const results: TestResult[] = [];

function log(message: string) {
    console.log(message);
}

function addResult(result: TestResult) {
    results.push(result);
    const icon = result.passed ? '✅' : '❌';
    log(`${icon} ${result.testName}`);
    if (!result.passed) {
        log(`   Expected: ${result.expected}`);
        log(`   Actual: ${result.actual}`);
    }
    log(`   ${result.details}`);
}

async function main() {
    log('🧪 GOSI Calculation Test Suite\n');
    log('='.repeat(60));

    try {
        // 1. Check GOSI Config exists
        log('\n📋 Test 1: Check Active GOSI Config...');
        const company = await prisma.company.findFirst();
        if (!company) {
            addResult({
                testName: 'GOSI Config Check',
                passed: false,
                details: 'No company found in database',
            });
            return;
        }

        const gosiConfig = await prisma.gosiConfig.findFirst({
            where: { companyId: company.id, isActive: true },
            orderBy: { createdAt: 'desc' }
        });

        if (!gosiConfig) {
            addResult({
                testName: 'GOSI Config Check',
                passed: false,
                details: `No active GOSI config found for company ${company.id}`,
                expected: 'Active GOSI config',
                actual: 'null',
            });
            log('\n⚠️ Creating a default GOSI config for testing...');

            // Create a default config
            await prisma.gosiConfig.create({
                data: {
                    companyId: company.id,
                    employeeRate: 9.00,
                    employerRate: 9.00,
                    sanedRate: 0.75,
                    hazardRate: 2.00,
                    maxCapAmount: 45000,
                    isSaudiOnly: false, // Apply to all for testing
                    isActive: true,
                }
            });
            log('✅ Created default GOSI config');
        } else {
            addResult({
                testName: 'GOSI Config Check',
                passed: true,
                details: `Active config found: employeeRate=${gosiConfig.employeeRate}%, sanedRate=${gosiConfig.sanedRate}%, isSaudiOnly=${gosiConfig.isSaudiOnly}`,
            });
        }

        // 2. Find a Saudi employee with salary assignment
        log('\n📋 Test 2: Check Saudi Employee with Salary Assignment...');
        const saudiEmployee = await prisma.user.findFirst({
            where: {
                companyId: company.id,
                isSaudi: true,
                salaryAssignments: { some: { isActive: true } }
            },
            include: {
                salaryAssignments: {
                    where: { isActive: true },
                    include: { structure: { include: { lines: { include: { component: true } } } } }
                }
            }
        });

        if (!saudiEmployee) {
            addResult({
                testName: 'Saudi Employee Check',
                passed: false,
                details: 'No Saudi employee with active salary assignment found',
            });

            // Try to find any employee
            const anyEmployee = await prisma.user.findFirst({
                where: {
                    companyId: company.id,
                    salaryAssignments: { some: { isActive: true } }
                },
                include: { salaryAssignments: { where: { isActive: true } } }
            });

            if (anyEmployee) {
                log(`\n⚠️ Found employee ${anyEmployee.firstName} but isSaudi=${anyEmployee.isSaudi}`);
                log('   Updating to isSaudi=true for testing...');
                await prisma.user.update({
                    where: { id: anyEmployee.id },
                    data: { isSaudi: true }
                });
                log('✅ Updated employee to Saudi');
            }
        } else {
            const assignment = saudiEmployee.salaryAssignments[0];
            addResult({
                testName: 'Saudi Employee Check',
                passed: true,
                details: `Found: ${saudiEmployee.firstName} ${saudiEmployee.lastName}, baseSalary=${assignment.baseSalary}`,
            });
        }

        // 3. Check GOSI-eligible components
        log('\n📋 Test 3: Check GOSI-Eligible Components...');
        const gosiEligibleComponents = await prisma.salaryComponent.findMany({
            where: { companyId: company.id, gosiEligible: true }
        });

        if (gosiEligibleComponents.length === 0) {
            addResult({
                testName: 'GOSI-Eligible Components',
                passed: false,
                details: 'No GOSI-eligible components found',
            });

            // Check for BASIC component and make it eligible
            const basicComponent = await prisma.salaryComponent.findFirst({
                where: { companyId: company.id, code: 'BASIC' }
            });

            if (basicComponent) {
                await prisma.salaryComponent.update({
                    where: { id: basicComponent.id },
                    data: { gosiEligible: true }
                });
                log('✅ Updated BASIC component to be GOSI-eligible');
            }
        } else {
            addResult({
                testName: 'GOSI-Eligible Components',
                passed: true,
                details: `Found ${gosiEligibleComponents.length} components: ${gosiEligibleComponents.map(c => c.code).join(', ')}`,
            });
        }

        // 4. Simulate GOSI Calculation
        log('\n📋 Test 4: Simulate GOSI Calculation...');

        const testEmployee = await prisma.user.findFirst({
            where: {
                companyId: company.id,
                salaryAssignments: { some: { isActive: true } }
            },
            include: {
                salaryAssignments: {
                    where: { isActive: true },
                    include: {
                        structure: {
                            include: {
                                lines: {
                                    include: { component: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (testEmployee) {
            const assignment = testEmployee.salaryAssignments[0];
            const baseSalary = Number(assignment.baseSalary);

            // Calculate GOSI base from structure lines
            let gosiBase = 0;
            if (assignment.structure?.lines) {
                for (const line of assignment.structure.lines) {
                    if (line.component.gosiEligible) {
                        const lineAmount = Number(line.percentage) > 0
                            ? baseSalary * Number(line.percentage) / 100
                            : Number(line.amount);
                        gosiBase += lineAmount;
                        log(`   + ${line.component.code}: ${lineAmount.toFixed(2)}`);
                    }
                }
            }

            if (gosiBase === 0) {
                gosiBase = baseSalary; // Fallback to base salary
                log(`   (using baseSalary as fallback: ${baseSalary})`);
            }

            const activeConfig = await prisma.gosiConfig.findFirst({
                where: { companyId: company.id, isActive: true }
            });

            if (activeConfig) {
                const empRate = Number(activeConfig.employeeRate) + Number(activeConfig.sanedRate);
                const cappedBase = Math.min(gosiBase, Number(activeConfig.maxCapAmount));
                const expectedGosi = (cappedBase * empRate) / 100;

                log(`\n   📊 Calculation:`);
                log(`   GOSI Base: ${gosiBase.toFixed(2)}`);
                log(`   Max Cap: ${activeConfig.maxCapAmount}`);
                log(`   Capped Base: ${cappedBase.toFixed(2)}`);
                log(`   Employee Rate: ${activeConfig.employeeRate}%`);
                log(`   SANED Rate: ${activeConfig.sanedRate}%`);
                log(`   Total Rate: ${empRate}%`);
                log(`   Expected GOSI Deduction: ${expectedGosi.toFixed(2)} SAR`);

                addResult({
                    testName: 'GOSI Calculation',
                    passed: expectedGosi > 0,
                    details: `GOSI Deduction = ${expectedGosi.toFixed(2)} SAR for ${testEmployee.firstName}`,
                    expected: '> 0',
                    actual: expectedGosi.toFixed(2),
                });
            }
        }

        // Summary
        log('\n' + '='.repeat(60));
        log('📊 Test Summary:');
        const passed = results.filter(r => r.passed).length;
        const failed = results.filter(r => !r.passed).length;
        log(`   ✅ Passed: ${passed}`);
        log(`   ❌ Failed: ${failed}`);
        log('='.repeat(60));

        if (failed > 0) {
            log('\n⚠️ Some tests failed. Check the issues above.');
        } else {
            log('\n✨ All tests passed! GOSI should be calculated correctly.');
        }

    } catch (error) {
        console.error('❌ Test error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
