import { Test, TestingModule } from '@nestjs/testing';
import { PayrollValidationService } from './payroll-validation.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('PayrollValidationService', () => {
    let service: PayrollValidationService;
    let prisma: PrismaService;

    // Use plain numbers - toDecimal handles them directly
    const createDecimal = (value: number) => value;

    const mockPayslip = {
        id: 'payslip-1',
        employeeId: 'emp-1',
        companyId: 'company-1',
        periodId: 'period-1',
        runId: 'run-1',
        baseSalary: 5000,
        grossSalary: 7000,
        totalDeductions: 1000,
        netSalary: 6000,
        status: 'DRAFT',
        employee: {
            id: 'emp-1',
            firstName: 'محمد',
            lastName: 'أحمد',
            isSaudi: true,
            bankAccountNumber: '1234567890',
        },
        lines: [
            {
                id: 'line-1',
                sign: 'EARNING',
                amount: 5000,
                component: { code: 'BASIC' },
            },
            {
                id: 'line-2',
                sign: 'EARNING',
                amount: 2000,
                component: { code: 'HOUSING' },
            },
            {
                id: 'line-3',
                sign: 'DEDUCTION',
                amount: 487.5,
                component: { code: 'GOSI' },
            },
            {
                id: 'line-4',
                sign: 'DEDUCTION',
                amount: 512.5,
                component: { code: 'OTHER' },
            },
        ],
    };

    const mockPayrollRun = {
        id: 'run-1',
        companyId: 'company-1',
        periodId: 'period-1',
        status: 'DRAFT',
        period: {
            id: 'period-1',
            month: 1,
            year: 2024,
        },
        payslips: [mockPayslip],
    };

    const mockPrismaService = {
        payrollRun: {
            findFirst: jest.fn(),
        },
        payslip: {
            findFirst: jest.fn(),
            findMany: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PayrollValidationService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<PayrollValidationService>(PayrollValidationService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('validatePayrollRun', () => {
        it('should return valid result for correct payroll', async () => {
            mockPrismaService.payrollRun.findFirst.mockResolvedValue(mockPayrollRun);

            const result = await service.validatePayrollRun('run-1', 'company-1');

            expect(result.runId).toBe('run-1');
            expect(result.summary.totalPayslips).toBe(1);
            expect(result.balanceCheck.isBalanced).toBe(true);
        });

        it('should return error when run not found', async () => {
            mockPrismaService.payrollRun.findFirst.mockResolvedValue(null);

            const result = await service.validatePayrollRun('run-1', 'company-1');

            expect(result.isValid).toBe(false);
            expect(result.issues.some(i => i.code === 'RUN_NOT_FOUND')).toBe(true);
        });

        it('should detect balance mismatch', async () => {
            const mismatchedRun = {
                ...mockPayrollRun,
                payslips: [{
                    ...mockPayslip,
                    grossSalary: createDecimal(7000),
                    totalDeductions: createDecimal(1000),
                    netSalary: createDecimal(5000), // Should be 6000
                }],
            };
            mockPrismaService.payrollRun.findFirst.mockResolvedValue(mismatchedRun);

            const result = await service.validatePayrollRun('run-1', 'company-1');

            expect(result.issues.some(i => i.code === 'BALANCE_MISMATCH')).toBe(true);
        });

        it('should detect negative gross salary', async () => {
            const negativeRun = {
                ...mockPayrollRun,
                payslips: [{
                    ...mockPayslip,
                    grossSalary: createDecimal(-1000),
                }],
            };
            mockPrismaService.payrollRun.findFirst.mockResolvedValue(negativeRun);

            const result = await service.validatePayrollRun('run-1', 'company-1');

            expect(result.issues.some(i => i.code === 'NEGATIVE_GROSS')).toBe(true);
        });

        it('should warn on negative net salary', async () => {
            const negativeNetRun = {
                ...mockPayrollRun,
                payslips: [{
                    ...mockPayslip,
                    grossSalary: createDecimal(5000),
                    totalDeductions: createDecimal(6000),
                    netSalary: createDecimal(-1000),
                }],
            };
            mockPrismaService.payrollRun.findFirst.mockResolvedValue(negativeNetRun);

            const result = await service.validatePayrollRun('run-1', 'company-1');

            expect(result.issues.some(i => i.code === 'NEGATIVE_NET')).toBe(true);
        });

        it('should warn on below minimum wage for Saudi employees', async () => {
            const lowWageRun = {
                ...mockPayrollRun,
                payslips: [{
                    ...mockPayslip,
                    baseSalary: createDecimal(3000), // Below 4000 minimum
                    employee: {
                        ...mockPayslip.employee,
                        isSaudi: true,
                    },
                }],
            };
            mockPrismaService.payrollRun.findFirst.mockResolvedValue(lowWageRun);

            const result = await service.validatePayrollRun('run-1', 'company-1');

            expect(result.issues.some(i => i.code === 'BELOW_MIN_WAGE')).toBe(true);
        });

        it('should warn on excessive deductions', async () => {
            const excessiveDeductionsRun = {
                ...mockPayrollRun,
                payslips: [{
                    ...mockPayslip,
                    grossSalary: createDecimal(10000),
                    totalDeductions: createDecimal(6000), // 60% > 50%
                    netSalary: createDecimal(4000),
                }],
            };
            mockPrismaService.payrollRun.findFirst.mockResolvedValue(excessiveDeductionsRun);

            const result = await service.validatePayrollRun('run-1', 'company-1');

            expect(result.issues.some(i => i.code === 'EXCESSIVE_DEDUCTIONS')).toBe(true);
        });

        it('should detect duplicate employees', async () => {
            const duplicateRun = {
                ...mockPayrollRun,
                payslips: [
                    mockPayslip,
                    { ...mockPayslip, id: 'payslip-2' }, // Same employee
                ],
            };
            mockPrismaService.payrollRun.findFirst.mockResolvedValue(duplicateRun);

            const result = await service.validatePayrollRun('run-1', 'company-1');

            expect(result.issues.some(i => i.code === 'DUPLICATE_EMPLOYEES')).toBe(true);
        });

        it('should skip balance check when option is set', async () => {
            const mismatchedRun = {
                ...mockPayrollRun,
                payslips: [{
                    ...mockPayslip,
                    grossSalary: createDecimal(7000),
                    totalDeductions: createDecimal(1000),
                    netSalary: createDecimal(5000), // Should be 6000
                }],
            };
            mockPrismaService.payrollRun.findFirst.mockResolvedValue(mismatchedRun);

            const result = await service.validatePayrollRun('run-1', 'company-1', {
                skipBalanceCheck: true,
            });

            expect(result.issues.some(i => i.code === 'BALANCE_MISMATCH')).toBe(false);
        });

        it('should block in strict mode with warnings', async () => {
            const warningRun = {
                ...mockPayrollRun,
                payslips: [{
                    ...mockPayslip,
                    baseSalary: createDecimal(3000), // Below min wage warning
                }],
            };
            mockPrismaService.payrollRun.findFirst.mockResolvedValue(warningRun);

            const result = await service.validatePayrollRun('run-1', 'company-1', {
                strictMode: true,
            });

            expect(result.summary.warnings).toBeGreaterThan(0);
            expect(result.canProceed).toBe(false);
        });
    });

    describe('quickValidateBeforeClose', () => {
        it('should return canClose true when no errors', async () => {
            // Reset mock to ensure clean state
            const cleanPayslip = {
                id: 'payslip-1',
                employeeId: 'emp-1',
                companyId: 'company-1',
                periodId: 'period-1',
                runId: 'run-1',
                baseSalary: 5000,
                grossSalary: 7000,
                totalDeductions: 1000,
                netSalary: 6000, // 7000 - 1000 = 6000 (balanced)
                status: 'DRAFT',
                employee: {
                    id: 'emp-1',
                    firstName: 'محمد',
                    lastName: 'أحمد',
                    isSaudi: true,
                    bankAccountNumber: '1234567890',
                },
                lines: [
                    { id: 'line-1', sign: 'EARNING', amount: 7000, component: { code: 'BASIC' } },
                    { id: 'line-2', sign: 'DEDUCTION', amount: 1000, component: { code: 'GOSI' } },
                ],
            };
            const cleanRun = {
                id: 'run-1',
                companyId: 'company-1',
                periodId: 'period-1',
                status: 'DRAFT',
                period: { id: 'period-1', month: 1, year: 2024 },
                payslips: [cleanPayslip],
            };
            // First call returns the run, second call (PERIOD_ALREADY_PAID check) returns null
            mockPrismaService.payrollRun.findFirst
                .mockResolvedValueOnce(cleanRun)
                .mockResolvedValueOnce(null);

            const result = await service.quickValidateBeforeClose('run-1', 'company-1');

            expect(result.canClose).toBe(true);
            expect(result.criticalIssues).toHaveLength(0);
        });

        it('should return canClose false when errors exist', async () => {
            const errorRun = {
                ...mockPayrollRun,
                payslips: [{
                    ...mockPayslip,
                    grossSalary: createDecimal(-1000), // Error
                }],
            };
            // First call returns the run, second call (PERIOD_ALREADY_PAID check) returns null
            mockPrismaService.payrollRun.findFirst
                .mockResolvedValueOnce(errorRun)
                .mockResolvedValueOnce(null);

            const result = await service.quickValidateBeforeClose('run-1', 'company-1');

            expect(result.canClose).toBe(false);
            expect(result.criticalIssues.length).toBeGreaterThan(0);
        });
    });

    describe('validateEmployeePayslip', () => {
        it('should validate single payslip', async () => {
            mockPrismaService.payslip.findFirst.mockResolvedValue(mockPayslip);

            const result = await service.validateEmployeePayslip('payslip-1', 'company-1');

            expect(result.isValid).toBe(true);
            expect(result.issues).toHaveLength(0);
        });

        it('should return error when payslip not found', async () => {
            mockPrismaService.payslip.findFirst.mockResolvedValue(null);

            const result = await service.validateEmployeePayslip('payslip-1', 'company-1');

            expect(result.isValid).toBe(false);
            expect(result.issues.some(i => i.code === 'PAYSLIP_NOT_FOUND')).toBe(true);
        });
    });

    describe('getValidationReport', () => {
        it('should return validation with statistics', async () => {
            mockPrismaService.payrollRun.findFirst.mockResolvedValue(mockPayrollRun);
            mockPrismaService.payslip.findMany.mockResolvedValue([mockPayslip]);

            const result = await service.getValidationReport('run-1', 'company-1');

            expect(result.validation).toBeDefined();
            expect(result.statistics).toBeDefined();
            expect(result.statistics.totalEmployees).toBe(1);
            expect(result.recommendations).toBeDefined();
        });

        it('should include recommendations based on issues', async () => {
            const issueRun = {
                ...mockPayrollRun,
                payslips: [{
                    ...mockPayslip,
                    baseSalary: createDecimal(3000), // Below min wage
                    employee: {
                        ...mockPayslip.employee,
                        bankAccountNumber: null, // No bank account
                    },
                }],
            };
            mockPrismaService.payrollRun.findFirst.mockResolvedValue(issueRun);
            mockPrismaService.payslip.findMany.mockResolvedValue([issueRun.payslips[0]]);

            const result = await service.getValidationReport('run-1', 'company-1');

            expect(result.recommendations.length).toBeGreaterThan(0);
        });
    });

    describe('Balance calculations', () => {
        it('should correctly calculate total balance', async () => {
            const multiPayslipRun = {
                ...mockPayrollRun,
                payslips: [
                    {
                        ...mockPayslip,
                        grossSalary: createDecimal(10000),
                        totalDeductions: createDecimal(2000),
                        netSalary: createDecimal(8000),
                    },
                    {
                        ...mockPayslip,
                        id: 'payslip-2',
                        employeeId: 'emp-2',
                        grossSalary: createDecimal(15000),
                        totalDeductions: createDecimal(3000),
                        netSalary: createDecimal(12000),
                        employee: { ...mockPayslip.employee, id: 'emp-2' },
                    },
                ],
            };
            mockPrismaService.payrollRun.findFirst.mockResolvedValue(multiPayslipRun);

            const result = await service.validatePayrollRun('run-1', 'company-1');

            expect(result.balanceCheck.totalGross).toBe(25000);
            expect(result.balanceCheck.totalDeductions).toBe(5000);
            expect(result.balanceCheck.totalNet).toBe(20000);
            expect(result.balanceCheck.isBalanced).toBe(true);
        });
    });
});
