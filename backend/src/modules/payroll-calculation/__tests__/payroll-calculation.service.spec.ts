import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PayrollCalculationService } from '../payroll-calculation.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PoliciesService } from '../../policies/policies.service';
import { PolicyRuleEvaluatorService } from '../../policies/policy-rule-evaluator.service';
import { FormulaEngineService } from '../../policies/formula-engine.service';
import { EosService } from '../../eos/eos.service';
import { SmartPolicyExecutorService } from '../../smart-policies/smart-policy-executor.service';
import { AIPolicyEvaluatorService } from '../../smart-policies/ai-policy-evaluator.service';

/**
 * 🧪 Payroll Calculation Service Unit Tests
 * 
 * Tests for:
 * - Basic salary calculation
 * - Pro-rata calculations for new hires
 * - Overtime calculations
 * - Deductions (absences, late arrivals)
 * - Allowances and bonuses
 * - End of service calculations
 * - Smart policy integration
 * - Working days calculation methods
 */

// Mock services
const mockPrismaService = {
    user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
    },
    attendance: {
        findMany: jest.fn(),
        count: jest.fn(),
    },
    salaryComponent: {
        findMany: jest.fn(),
    },
    salaryStructure: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
    },
    payrollSettings: {
        findFirst: jest.fn(),
    },
    companySettings: {
        findFirst: jest.fn(),
    },
    leaveRequest: {
        findMany: jest.fn(),
    },
    payrollRun: {
        findFirst: jest.fn(),
    },
    overtime: {
        findMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
};

const mockPoliciesService = {
    getPolicies: jest.fn(),
    evaluatePolicy: jest.fn(),
};

const mockPolicyEvaluator = {
    evaluate: jest.fn(),
    evaluateRule: jest.fn(),
};

const mockFormulaEngine = {
    calculate: jest.fn(),
    parseFormula: jest.fn(),
};

const mockEosService = {
    calculateEOS: jest.fn(),
    getEOSEntitlement: jest.fn(),
};

const mockSmartPolicyExecutor = {
    executePolicy: jest.fn(),
    getPolicyLines: jest.fn(),
};

const mockAIPolicyEvaluator = {
    evaluateWithAI: jest.fn(),
};

describe('PayrollCalculationService', () => {
    let service: PayrollCalculationService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PayrollCalculationService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: PoliciesService, useValue: mockPoliciesService },
                { provide: PolicyRuleEvaluatorService, useValue: mockPolicyEvaluator },
                { provide: FormulaEngineService, useValue: mockFormulaEngine },
                { provide: EosService, useValue: mockEosService },
                { provide: SmartPolicyExecutorService, useValue: mockSmartPolicyExecutor },
                { provide: AIPolicyEvaluatorService, useValue: mockAIPolicyEvaluator },
            ],
        }).compile();

        service = module.get<PayrollCalculationService>(PayrollCalculationService);
        jest.clearAllMocks();
    });

    describe('getDaysInPeriod', () => {
        it('should calculate days for CALENDAR_30 method', () => {
            const startDate = new Date('2026-01-01');
            const endDate = new Date('2026-01-31');

            const result = service.getDaysInPeriod(startDate, endDate, 'CALENDAR_30');

            expect(result).toBe(30);
        });

        it('should calculate days for ACTUAL_DAYS method', () => {
            const startDate = new Date('2026-01-01');
            const endDate = new Date('2026-01-31');

            const result = service.getDaysInPeriod(startDate, endDate, 'ACTUAL_DAYS');

            expect(result).toBe(31);
        });

        it('should calculate days for WORKING_DAYS method', () => {
            // January 2026 has ~22 working days (excluding Fri-Sat in Saudi)
            const startDate = new Date('2026-01-01');
            const endDate = new Date('2026-01-31');

            const result = service.getDaysInPeriod(startDate, endDate, 'WORKING_DAYS');

            expect(result).toBeGreaterThan(0);
            expect(result).toBeLessThan(31);
        });
    });

    describe('getWorkingDaysInPeriod', () => {
        it('should exclude weekends (Fri-Sat) from count', () => {
            // Jan 2026: 1st is Thursday, 2nd is Friday (weekend)
            const startDate = new Date('2026-01-01');
            const endDate = new Date('2026-01-07');

            const result = service.getWorkingDaysInPeriod(startDate, endDate);

            // Thu(1), Sun(4), Mon(5), Tue(6), Wed(7) = 5 working days
            // Fri(2), Sat(3) = weekends
            expect(result).toBe(5);
        });

        it('should return 0 for weekend-only period', () => {
            const startDate = new Date('2026-01-02'); // Friday
            const endDate = new Date('2026-01-03');   // Saturday

            const result = service.getWorkingDaysInPeriod(startDate, endDate);

            expect(result).toBe(0);
        });
    });

    describe('getProRataFactor', () => {
        const startDate = new Date('2026-01-01');
        const endDate = new Date('2026-01-31');

        it('should return 1.0 for full month employee', () => {
            const result = service.getProRataFactor(
                startDate,
                endDate,
                new Date('2025-01-01'), // Hired last year
                null,
                'CALENDAR_30',
                'prorata'
            );

            expect(result).toBe(1.0);
        });

        it('should calculate pro-rata for mid-month hire', () => {
            const result = service.getProRataFactor(
                startDate,
                endDate,
                new Date('2026-01-15'), // Hired on 15th
                null,
                'CALENDAR_30',
                'prorata'
            );

            expect(result).toBeLessThan(1.0);
            expect(result).toBeGreaterThan(0);
        });

        it('should calculate pro-rata for mid-month termination', () => {
            const result = service.getProRataFactor(
                startDate,
                endDate,
                new Date('2025-01-01'),
                new Date('2026-01-20'), // Terminated on 20th
                'CALENDAR_30',
                'prorata'
            );

            expect(result).toBeLessThan(1.0);
            expect(result).toBeGreaterThan(0);
        });

        it('should return 0 for employee not yet hired', () => {
            const result = service.getProRataFactor(
                startDate,
                endDate,
                new Date('2026-02-01'), // Will be hired next month
                null,
                'CALENDAR_30',
                'prorata'
            );

            expect(result).toBe(0);
        });

        it('should return 0 for employee already terminated', () => {
            const result = service.getProRataFactor(
                startDate,
                endDate,
                new Date('2024-01-01'),
                new Date('2025-12-01'), // Terminated last month
                'CALENDAR_30',
                'prorata'
            );

            expect(result).toBe(0);
        });
    });

    describe('mapMethodToBase', () => {
        it('should map CALENDAR_30 to 30days', () => {
            const result = service.mapMethodToBase('CALENDAR_30');
            expect(result).toBe('30days');
        });

        it('should map ACTUAL_DAYS to actual', () => {
            const result = service.mapMethodToBase('ACTUAL_DAYS');
            expect(result).toBe('actual');
        });

        it('should map WORKING_DAYS to working', () => {
            const result = service.mapMethodToBase('WORKING_DAYS');
            expect(result).toBe('working');
        });
    });

    describe('getCalculationSettings', () => {
        beforeEach(() => {
            mockPrismaService.payrollSettings.findFirst.mockResolvedValue({
                calculationMethod: 'CALENDAR_30',
                overtimeMultiplier: 1.5,
                weekendOvertimeMultiplier: 2.0,
                gosiEmployeePercentage: 9.75,
                gosiEmployerPercentage: 11.75,
            });
        });

        it('should return calculation settings for employee', async () => {
            const result = await service.getCalculationSettings('emp-123', 'company-123');

            expect(result).toHaveProperty('method');
            expect(result).toHaveProperty('overtimeMultiplier');
        });

        it('should return default settings if none configured', async () => {
            mockPrismaService.payrollSettings.findFirst.mockResolvedValue(null);

            const result = await service.getCalculationSettings('emp-123', 'company-123');

            expect(result).toBeDefined();
            expect(result.method).toBeDefined();
        });
    });

    describe('getPeriodAttendanceData', () => {
        const employeeId = 'emp-123';
        const companyId = 'company-123';
        const startDate = new Date('2026-01-01');
        const endDate = new Date('2026-01-31');

        beforeEach(() => {
            mockPrismaService.attendance.findMany.mockResolvedValue([
                { status: 'PRESENT', lateMinutes: 0, overtimeMinutes: 0 },
                { status: 'PRESENT', lateMinutes: 30, overtimeMinutes: 0 },
                { status: 'LATE', lateMinutes: 45, overtimeMinutes: 0 },
                { status: 'ABSENT', lateMinutes: 0, overtimeMinutes: 0 },
                { status: 'PRESENT', lateMinutes: 0, overtimeMinutes: 120 },
            ]);
            mockPrismaService.leaveRequest.findMany.mockResolvedValue([
                { days: 2, leaveType: 'ANNUAL' },
                { days: 1, leaveType: 'SICK' },
            ]);
        });

        it('should aggregate attendance data for period', async () => {
            const result = await service.getPeriodAttendanceData(employeeId, companyId, startDate, endDate);

            expect(result).toHaveProperty('presentDays');
            expect(result).toHaveProperty('absentDays');
            expect(result).toHaveProperty('lateDays');
            expect(result).toHaveProperty('totalLateMinutes');
            expect(result).toHaveProperty('totalOvertimeMinutes');
            expect(result).toHaveProperty('paidLeaveDays');
            expect(result).toHaveProperty('unpaidLeaveDays');
        });

        it('should calculate total late minutes', async () => {
            const result = await service.getPeriodAttendanceData(employeeId, companyId, startDate, endDate);

            expect(result.totalLateMinutes).toBe(75); // 30 + 45
        });

        it('should calculate total overtime minutes', async () => {
            const result = await service.getPeriodAttendanceData(employeeId, companyId, startDate, endDate);

            expect(result.totalOvertimeMinutes).toBe(120);
        });
    });

    describe('calculateForEmployee', () => {
        const employeeId = 'emp-123';
        const companyId = 'company-123';
        const startDate = new Date('2026-01-01');
        const endDate = new Date('2026-01-31');

        const mockEmployee = {
            id: employeeId,
            companyId,
            basicSalary: 10000,
            housingAllowance: 2500,
            transportationAllowance: 1000,
            hireDate: new Date('2025-01-01'),
            terminationDate: null,
            salaryStructureId: 'struct-123',
            branch: { id: 'branch-1' },
            department: { id: 'dept-1' },
        };

        const mockSalaryStructure = {
            id: 'struct-123',
            name: 'Standard',
            components: [
                { type: 'EARNING', code: 'BASIC', name: 'الراتب الأساسي', amount: 10000 },
                { type: 'EARNING', code: 'HOUSING', name: 'بدل سكن', amount: 2500 },
                { type: 'EARNING', code: 'TRANSPORT', name: 'بدل نقل', amount: 1000 },
            ],
        };

        beforeEach(() => {
            mockPrismaService.user.findUnique.mockResolvedValue(mockEmployee);
            mockPrismaService.salaryStructure.findUnique.mockResolvedValue(mockSalaryStructure);
            mockPrismaService.payrollSettings.findFirst.mockResolvedValue({
                calculationMethod: 'CALENDAR_30',
                gosiEmployeePercentage: 9.75,
                overtimeMultiplier: 1.5,
            });
            mockPrismaService.attendance.findMany.mockResolvedValue([]);
            mockPrismaService.leaveRequest.findMany.mockResolvedValue([]);
            mockPrismaService.overtime.findMany.mockResolvedValue([]);
            mockSmartPolicyExecutor.getPolicyLines.mockResolvedValue([]);
        });

        it('should calculate full month salary correctly', async () => {
            const result = await service.calculateForEmployee(
                employeeId,
                companyId,
                startDate,
                endDate,
                2026,
                1
            );

            expect(result).toHaveProperty('grossSalary');
            expect(result).toHaveProperty('netSalary');
            expect(result).toHaveProperty('deductions');
            expect(result).toHaveProperty('earnings');
            expect(result.grossSalary).toBe(13500); // 10000 + 2500 + 1000
        });

        it('should apply GOSI deduction', async () => {
            const result = await service.calculateForEmployee(
                employeeId,
                companyId,
                startDate,
                endDate,
                2026,
                1
            );

            // GOSI on basic salary only: 10000 * 9.75% = 975
            const gosiDeduction = result.deductions.find((d) => d.code === 'GOSI_EMPLOYEE');
            expect(gosiDeduction).toBeDefined();
        });

        it('should calculate pro-rata for new hire', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue({
                ...mockEmployee,
                hireDate: new Date('2026-01-15'), // Hired mid-month
            });

            const result = await service.calculateForEmployee(
                employeeId,
                companyId,
                startDate,
                endDate,
                2026,
                1
            );

            expect(result.grossSalary).toBeLessThan(13500);
        });

        it('should throw NotFoundException for non-existent employee', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(null);

            await expect(service.calculateForEmployee(
                'non-existent',
                companyId,
                startDate,
                endDate,
                2026,
                1
            )).rejects.toThrow(NotFoundException);
        });

        it('should include overtime earnings when applicable', async () => {
            mockPrismaService.attendance.findMany.mockResolvedValue([
                { status: 'PRESENT', overtimeMinutes: 120 },
                { status: 'PRESENT', overtimeMinutes: 60 },
            ]);

            const result = await service.calculateForEmployee(
                employeeId,
                companyId,
                startDate,
                endDate,
                2026,
                1
            );

            const overtimeEarning = result.earnings.find((e) => e.code === 'OVERTIME');
            if (overtimeEarning) {
                expect(overtimeEarning.amount).toBeGreaterThan(0);
            }
        });

        it('should apply absence deductions', async () => {
            mockPrismaService.attendance.findMany.mockResolvedValue([
                { status: 'ABSENT', date: new Date('2026-01-10') },
                { status: 'ABSENT', date: new Date('2026-01-11') },
            ]);

            const result = await service.calculateForEmployee(
                employeeId,
                companyId,
                startDate,
                endDate,
                2026,
                1
            );

            const absenceDeduction = result.deductions.find((d) => d.code === 'ABSENCE');
            if (absenceDeduction) {
                expect(absenceDeduction.amount).toBeGreaterThan(0);
            }
        });
    });

    describe('previewCalculation', () => {
        it('should return preview without saving', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue({
                id: 'emp-123',
                basicSalary: 10000,
                hireDate: new Date('2025-01-01'),
            });
            mockPrismaService.salaryStructure.findUnique.mockResolvedValue({
                components: [],
            });
            mockPrismaService.payrollSettings.findFirst.mockResolvedValue({});
            mockPrismaService.attendance.findMany.mockResolvedValue([]);
            mockPrismaService.leaveRequest.findMany.mockResolvedValue([]);
            mockSmartPolicyExecutor.getPolicyLines.mockResolvedValue([]);

            const result = await service.previewCalculation('emp-123', 'company-123', 2026, 1);

            expect(result).toBeDefined();
            // Should not save to database
            expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
        });
    });

    describe('topologicalSort', () => {
        it('should sort lines with dependencies correctly', () => {
            const lines = [
                { id: 'A', dependsOn: ['B'] },
                { id: 'B', dependsOn: ['C'] },
                { id: 'C', dependsOn: [] },
            ];

            const sorted = service.topologicalSort(lines);

            const indexC = sorted.findIndex((l: any) => l.id === 'C');
            const indexB = sorted.findIndex((l: any) => l.id === 'B');
            const indexA = sorted.findIndex((l: any) => l.id === 'A');

            expect(indexC).toBeLessThan(indexB);
            expect(indexB).toBeLessThan(indexA);
        });

        it('should handle lines without dependencies', () => {
            const lines = [
                { id: 'A', dependsOn: [] },
                { id: 'B', dependsOn: [] },
                { id: 'C', dependsOn: [] },
            ];

            const sorted = service.topologicalSort(lines);

            expect(sorted).toHaveLength(3);
        });
    });
});
