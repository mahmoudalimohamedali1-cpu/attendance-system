import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ContractsService } from '../contracts.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';

/**
 * 🧪 Contracts Service Unit Tests
 * 
 * Tests for:
 * - Contract CRUD
 * - Signing workflow (employee & employer)
 * - Qiwa status sync
 * - Contract renewal
 * - Termination
 * - Statistics
 */

const mockPrismaService = {
    contract: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
    },
    user: {
        findUnique: jest.fn(),
    },
};

const mockAuditService = {
    log: jest.fn(),
};

describe('ContractsService', () => {
    let service: ContractsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ContractsService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: AuditService, useValue: mockAuditService },
            ],
        }).compile();

        service = module.get<ContractsService>(ContractsService);
        jest.clearAllMocks();
    });

    describe('findAll', () => {
        it('should return all contracts for company', async () => {
            mockPrismaService.contract.findMany.mockResolvedValue([
                { id: 'c1', employeeId: 'e1' },
                { id: 'c2', employeeId: 'e2' },
            ]);

            const result = await service.findAll('company-123');

            expect(result).toHaveLength(2);
        });

        it('should filter by status', async () => {
            mockPrismaService.contract.findMany.mockResolvedValue([]);

            await service.findAll('company-123', { status: 'ACTIVE' });

            expect(mockPrismaService.contract.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ status: 'ACTIVE' }),
                })
            );
        });

        it('should filter by Qiwa status', async () => {
            mockPrismaService.contract.findMany.mockResolvedValue([]);

            await service.findAll('company-123', { qiwaStatus: 'AUTHENTICATED' });

            expect(mockPrismaService.contract.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ qiwaAuthStatus: 'AUTHENTICATED' }),
                })
            );
        });
    });

    describe('findByEmployee', () => {
        it('should return employee contracts', async () => {
            mockPrismaService.contract.findMany.mockResolvedValue([
                { id: 'c1', status: 'ACTIVE' },
            ]);

            const result = await service.findByEmployee('emp-123', 'company-123');

            expect(result).toHaveLength(1);
        });
    });

    describe('findOne', () => {
        it('should return contract with details', async () => {
            mockPrismaService.contract.findFirst.mockResolvedValue({
                id: 'contract-123',
                employee: { nameAr: 'أحمد' },
            });

            const result = await service.findOne('contract-123', 'company-123');

            expect(result).toHaveProperty('employee');
        });

        it('should throw NotFoundException for non-existent contract', async () => {
            mockPrismaService.contract.findFirst.mockResolvedValue(null);

            await expect(service.findOne('non-existent', 'company-123'))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('create', () => {
        const createDto = {
            employeeId: 'emp-123',
            contractType: 'FIXED_TERM',
            startDate: new Date('2026-01-01'),
            endDate: new Date('2027-01-01'),
            salary: 10000,
            position: 'مهندس برمجيات',
        };

        it('should create contract', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue({ id: 'emp-123' });
            mockPrismaService.contract.create.mockResolvedValue({
                id: 'contract-123',
                ...createDto,
            });

            const result = await service.create(createDto, 'company-123');

            expect(result.id).toBe('contract-123');
        });

        it('should log audit trail', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue({ id: 'emp-123' });
            mockPrismaService.contract.create.mockResolvedValue({ id: 'contract-123' });

            await service.create(createDto, 'company-123', 'user-123');

            expect(mockAuditService.log).toHaveBeenCalled();
        });
    });

    describe('sendToEmployee', () => {
        it('should update status to PENDING_EMPLOYEE', async () => {
            mockPrismaService.contract.findFirst.mockResolvedValue({
                id: 'contract-123',
                status: 'DRAFT',
            });
            mockPrismaService.contract.update.mockResolvedValue({
                status: 'PENDING_EMPLOYEE',
            });

            await service.sendToEmployee('contract-123', 'company-123', 'user-123');

            expect(mockPrismaService.contract.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ status: 'PENDING_EMPLOYEE' }),
                })
            );
        });
    });

    describe('employeeSign', () => {
        beforeEach(() => {
            mockPrismaService.contract.findFirst.mockResolvedValue({
                id: 'contract-123',
                employeeId: 'emp-123',
                status: 'PENDING_EMPLOYEE',
            });
        });

        it('should record employee signature', async () => {
            mockPrismaService.contract.update.mockResolvedValue({
                status: 'PENDING_EMPLOYER',
            });

            await service.employeeSign('contract-123', 'company-123', 'emp-123', {
                signatureData: 'base64-signature',
            });

            expect(mockPrismaService.contract.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        employeeSignedAt: expect.any(Date),
                        status: 'PENDING_EMPLOYER',
                    }),
                })
            );
        });

        it('should validate employee ownership', async () => {
            await expect(service.employeeSign('contract-123', 'company-123', 'other-emp', {
                signatureData: 'sig',
            })).rejects.toThrow(ForbiddenException);
        });
    });

    describe('employeeReject', () => {
        it('should mark contract as rejected by employee', async () => {
            mockPrismaService.contract.findFirst.mockResolvedValue({
                id: 'contract-123',
                employeeId: 'emp-123',
                status: 'PENDING_EMPLOYEE',
            });
            mockPrismaService.contract.update.mockResolvedValue({
                status: 'REJECTED_BY_EMPLOYEE',
            });

            await service.employeeReject('contract-123', 'company-123', 'emp-123', {
                rejectionReason: 'لا أوافق على الشروط',
            });

            expect(mockPrismaService.contract.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        status: 'REJECTED_BY_EMPLOYEE',
                        rejectionReason: 'لا أوافق على الشروط',
                    }),
                })
            );
        });
    });

    describe('employerSign', () => {
        it('should activate contract after employer signature', async () => {
            mockPrismaService.contract.findFirst.mockResolvedValue({
                id: 'contract-123',
                status: 'PENDING_EMPLOYER',
            });
            mockPrismaService.contract.update.mockResolvedValue({
                status: 'ACTIVE',
            });

            await service.employerSign('contract-123', 'company-123', 'hr-123', {
                signatureData: 'employer-signature',
            });

            expect(mockPrismaService.contract.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        status: 'ACTIVE',
                        employerSignedAt: expect.any(Date),
                    }),
                })
            );
        });
    });

    describe('updateQiwaStatus', () => {
        it('should update Qiwa authentication status', async () => {
            mockPrismaService.contract.findFirst.mockResolvedValue({ id: 'contract-123' });
            mockPrismaService.contract.update.mockResolvedValue({
                qiwaAuthStatus: 'AUTHENTICATED',
            });

            await service.updateQiwaStatus('contract-123', 'company-123', {
                qiwaAuthStatus: 'AUTHENTICATED',
                qiwaContractId: 'QIWA-123456',
            }, 'user-123');

            expect(mockPrismaService.contract.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        qiwaAuthStatus: 'AUTHENTICATED',
                    }),
                })
            );
        });
    });

    describe('terminate', () => {
        it('should terminate active contract', async () => {
            mockPrismaService.contract.findFirst.mockResolvedValue({
                id: 'contract-123',
                status: 'ACTIVE',
            });
            mockPrismaService.contract.update.mockResolvedValue({
                status: 'TERMINATED',
            });

            await service.terminate('contract-123', {
                terminationDate: new Date(),
                terminationReason: 'انتهاء الخدمة',
            }, 'company-123', 'user-123');

            expect(mockPrismaService.contract.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ status: 'TERMINATED' }),
                })
            );
        });
    });

    describe('renew', () => {
        it('should create renewal contract', async () => {
            mockPrismaService.contract.findFirst.mockResolvedValue({
                id: 'contract-123',
                employeeId: 'emp-123',
                salary: 10000,
            });
            mockPrismaService.contract.update.mockResolvedValue({});
            mockPrismaService.contract.create.mockResolvedValue({
                id: 'new-contract-123',
            });

            await service.renew('contract-123', {
                newStartDate: new Date('2027-01-01'),
                newEndDate: new Date('2028-01-01'),
            }, 'company-123');

            expect(mockPrismaService.contract.create).toHaveBeenCalled();
        });

        it('should mark old contract as expired', async () => {
            mockPrismaService.contract.findFirst.mockResolvedValue({
                id: 'contract-123',
                employeeId: 'emp-123',
            });
            mockPrismaService.contract.update.mockResolvedValue({});
            mockPrismaService.contract.create.mockResolvedValue({ id: 'new-contract' });

            await service.renew('contract-123', {
                newStartDate: new Date('2027-01-01'),
                newEndDate: new Date('2028-01-01'),
            }, 'company-123');

            expect(mockPrismaService.contract.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ status: 'EXPIRED' }),
                })
            );
        });
    });

    describe('getExpiring', () => {
        it('should return contracts expiring within days', async () => {
            mockPrismaService.contract.findMany.mockResolvedValue([
                { id: 'c1', endDate: new Date('2026-02-01') },
            ]);

            const result = await service.getExpiring('company-123', 30);

            expect(result).toHaveLength(1);
        });
    });

    describe('getPendingForEmployee', () => {
        it('should return contracts pending employee signature', async () => {
            mockPrismaService.contract.findMany.mockResolvedValue([]);

            await service.getPendingForEmployee('emp-123', 'company-123');

            expect(mockPrismaService.contract.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        status: 'PENDING_EMPLOYEE',
                    }),
                })
            );
        });
    });

    describe('getStats', () => {
        it('should return contract statistics', async () => {
            mockPrismaService.contract.count
                .mockResolvedValueOnce(50)  // Total
                .mockResolvedValueOnce(40)  // Active
                .mockResolvedValueOnce(5)   // Pending
                .mockResolvedValueOnce(3)   // Expiring
                .mockResolvedValueOnce(2);  // Terminated

            const result = await service.getStats('company-123');

            expect(result).toHaveProperty('total');
            expect(result).toHaveProperty('active');
            expect(result).toHaveProperty('pending');
        });
    });
});
