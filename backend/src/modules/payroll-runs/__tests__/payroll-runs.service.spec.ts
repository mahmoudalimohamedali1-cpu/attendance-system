import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PayrollRunsService } from '../payroll-runs.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PayrollCalculationService } from '../../payroll-calculation/payroll-calculation.service';
import { PayrollLedgerService } from '../../payroll-calculation/payroll-ledger.service';
import { AuditService } from '../../audit/audit.service';

/**
 * 🧪 Payroll Runs Service Unit Tests
 * 
 * Tests for:
 * - Creating payroll runs
 * - Previewing calculations
 * - Run lifecycle (Draft → Approved → Paid)
 * - Employee payslip generation
 */

const mockPrismaService = {
    payrollRun: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
    },
    payrollRunLine: {
        createMany: jest.fn(),
    },
    user: {
        findMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
};

const mockCalculationService = {
    calculateForEmployee: jest.fn(),
};

const mockLedgerService = {
    createLedgerEntries: jest.fn(),
};

const mockAuditService = {
    log: jest.fn(),
};

describe('PayrollRunsService', () => {
    let service: PayrollRunsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PayrollRunsService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: PayrollCalculationService, useValue: mockCalculationService },
                { provide: PayrollLedgerService, useValue: mockLedgerService },
                { provide: AuditService, useValue: mockAuditService },
            ],
        }).compile();

        service = module.get<PayrollRunsService>(PayrollRunsService);
        jest.clearAllMocks();
    });

    describe('create', () => {
        const createDto = {
            year: 2026,
            month: 1,
            name: 'رواتب يناير 2026',
        };

        const mockEmployees = [
            { id: 'emp-1', nameAr: 'أحمد', salary: 10000 },
            { id: 'emp-2', nameAr: 'محمد', salary: 12000 },
        ];

        beforeEach(() => {
            mockPrismaService.user.findMany.mockResolvedValue(mockEmployees);
            mockCalculationService.calculateForEmployee.mockResolvedValue({
                grossSalary: 10000,
                netSalary: 9000,
                deductions: [{ code: 'GOSI', amount: 975 }],
                earnings: [{ code: 'BASIC', amount: 10000 }],
            });
            mockPrismaService.payrollRun.findFirst.mockResolvedValue(null); // No duplicate
        });

        it('should create payroll run', async () => {
            mockPrismaService.payrollRun.create.mockResolvedValue({
                id: 'run-123',
                ...createDto,
                status: 'DRAFT',
            });
            mockPrismaService.payrollRunLine.createMany.mockResolvedValue({ count: 2 });

            const result = await service.create(createDto, 'company-123', 'user-123');

            expect(result.id).toBe('run-123');
            expect(mockCalculationService.calculateForEmployee).toHaveBeenCalledTimes(2);
        });

        it('should throw error for duplicate run', async () => {
            mockPrismaService.payrollRun.findFirst.mockResolvedValue({
                id: 'existing-run',
                year: 2026,
                month: 1,
            });

            await expect(service.create(createDto, 'company-123', 'user-123'))
                .rejects.toThrow(BadRequestException);
        });

        it('should log audit trail', async () => {
            mockPrismaService.payrollRun.create.mockResolvedValue({ id: 'run-123' });
            mockPrismaService.payrollRunLine.createMany.mockResolvedValue({ count: 2 });

            await service.create(createDto, 'company-123', 'user-123');

            expect(mockAuditService.log).toHaveBeenCalled();
        });
    });

    describe('preview', () => {
        it('should calculate without saving', async () => {
            mockPrismaService.user.findMany.mockResolvedValue([
                { id: 'emp-1', salary: 10000 },
            ]);
            mockCalculationService.calculateForEmployee.mockResolvedValue({
                grossSalary: 10000,
                netSalary: 9000,
            });

            const result = await service.preview({
                year: 2026,
                month: 1,
            }, 'company-123');

            expect(result).toHaveProperty('employees');
            expect(mockPrismaService.payrollRun.create).not.toHaveBeenCalled();
        });

        it('should return totals summary', async () => {
            mockPrismaService.user.findMany.mockResolvedValue([
                { id: 'emp-1', salary: 10000 },
                { id: 'emp-2', salary: 12000 },
            ]);
            mockCalculationService.calculateForEmployee.mockResolvedValue({
                grossSalary: 10000,
                netSalary: 9000,
            });

            const result = await service.preview({
                year: 2026,
                month: 1,
            }, 'company-123');

            expect(result).toHaveProperty('totalGross');
            expect(result).toHaveProperty('totalNet');
            expect(result).toHaveProperty('totalDeductions');
        });
    });

    describe('findAll', () => {
        it('should return all runs for company', async () => {
            mockPrismaService.payrollRun.findMany.mockResolvedValue([
                { id: 'run-1', year: 2026, month: 1, status: 'PAID' },
                { id: 'run-2', year: 2025, month: 12, status: 'DRAFT' },
            ]);

            const result = await service.findAll('company-123');

            expect(result).toHaveLength(2);
        });
    });

    describe('findOne', () => {
        it('should return run with lines', async () => {
            mockPrismaService.payrollRun.findFirst.mockResolvedValue({
                id: 'run-123',
                lines: [{ employeeId: 'emp-1' }],
            });

            const result = await service.findOne('run-123', 'company-123');

            expect(result).toHaveProperty('lines');
        });

        it('should throw NotFoundException for non-existent run', async () => {
            mockPrismaService.payrollRun.findFirst.mockResolvedValue(null);

            await expect(service.findOne('non-existent', 'company-123'))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('approve', () => {
        beforeEach(() => {
            mockPrismaService.payrollRun.findFirst.mockResolvedValue({
                id: 'run-123',
                status: 'DRAFT',
            });
        });

        it('should approve draft run', async () => {
            mockPrismaService.payrollRun.update.mockResolvedValue({
                status: 'APPROVED',
            });

            const result = await service.approve('run-123', 'company-123');

            expect(mockPrismaService.payrollRun.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ status: 'APPROVED' }),
                })
            );
        });

        it('should throw error for non-draft run', async () => {
            mockPrismaService.payrollRun.findFirst.mockResolvedValue({
                id: 'run-123',
                status: 'PAID',
            });

            await expect(service.approve('run-123', 'company-123'))
                .rejects.toThrow(BadRequestException);
        });
    });

    describe('pay', () => {
        beforeEach(() => {
            mockPrismaService.payrollRun.findFirst.mockResolvedValue({
                id: 'run-123',
                status: 'APPROVED',
                lines: [{ employeeId: 'emp-1', netSalary: 9000 }],
            });
        });

        it('should mark run as paid', async () => {
            mockPrismaService.payrollRun.update.mockResolvedValue({
                status: 'PAID',
            });
            mockLedgerService.createLedgerEntries.mockResolvedValue({});

            const result = await service.pay('run-123', 'company-123');

            expect(mockPrismaService.payrollRun.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        status: 'PAID',
                        paidAt: expect.any(Date),
                    }),
                })
            );
        });

        it('should create ledger entries', async () => {
            mockPrismaService.payrollRun.update.mockResolvedValue({ status: 'PAID' });
            mockLedgerService.createLedgerEntries.mockResolvedValue({});

            await service.pay('run-123', 'company-123');

            expect(mockLedgerService.createLedgerEntries).toHaveBeenCalled();
        });

        it('should throw error for non-approved run', async () => {
            mockPrismaService.payrollRun.findFirst.mockResolvedValue({
                id: 'run-123',
                status: 'DRAFT',
            });

            await expect(service.pay('run-123', 'company-123'))
                .rejects.toThrow(BadRequestException);
        });
    });
});
