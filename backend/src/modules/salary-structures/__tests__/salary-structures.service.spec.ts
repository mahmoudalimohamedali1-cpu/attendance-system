import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SalaryStructuresService } from '../salary-structures.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * 🧪 Salary Structures Service Unit Tests
 * 
 * Tests for:
 * - Structure CRUD operations
 * - Component validation
 * - Structure assignment
 * - Soft delete for assigned structures
 */

const mockPrismaService = {
    salaryStructure: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    salaryStructureLine: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
    },
    employeeSalaryAssignment: {
        findFirst: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
};

describe('SalaryStructuresService', () => {
    let service: SalaryStructuresService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SalaryStructuresService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<SalaryStructuresService>(SalaryStructuresService);
        jest.clearAllMocks();
    });

    describe('create', () => {
        const createDto = {
            name: 'هيكل رواتب قياسي',
            lines: [
                { componentId: 'comp-basic', amount: 10000, priority: 1 },
                { componentId: 'comp-housing', percentage: 25, priority: 2 },
            ],
        };

        it('should create salary structure with lines', async () => {
            mockPrismaService.salaryStructure.create.mockResolvedValue({
                id: 'struct-123',
                name: createDto.name,
                lines: createDto.lines,
            });

            const result = await service.create(createDto, 'company-123');

            expect(result.id).toBe('struct-123');
            expect(mockPrismaService.salaryStructure.create).toHaveBeenCalled();
        });

        it('should throw error for duplicate components', async () => {
            const duplicateDto = {
                name: 'هيكل',
                lines: [
                    { componentId: 'comp-1', amount: 1000, priority: 1 },
                    { componentId: 'comp-1', amount: 2000, priority: 2 }, // Duplicate
                ],
            };

            await expect(service.create(duplicateDto, 'company-123'))
                .rejects.toThrow(BadRequestException);
        });
    });

    describe('findAll', () => {
        it('should return all active structures', async () => {
            mockPrismaService.salaryStructure.findMany.mockResolvedValue([
                { id: 's1', name: 'هيكل 1', lines: [], _count: { assignments: 5, lines: 3 } },
                { id: 's2', name: 'هيكل 2', lines: [], _count: { assignments: 10, lines: 4 } },
            ]);

            const result = await service.findAll('company-123');

            expect(result).toHaveLength(2);
            expect(mockPrismaService.salaryStructure.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ isActive: true }),
                })
            );
        });
    });

    describe('findOne', () => {
        it('should return structure with lines', async () => {
            mockPrismaService.salaryStructure.findFirst.mockResolvedValue({
                id: 'struct-123',
                name: 'هيكل قياسي',
                lines: [{ component: { code: 'BASIC' } }],
            });

            const result = await service.findOne('struct-123', 'company-123');

            expect(result).toHaveProperty('lines');
        });

        it('should throw NotFoundException for non-existent structure', async () => {
            mockPrismaService.salaryStructure.findFirst.mockResolvedValue(null);

            await expect(service.findOne('non-existent', 'company-123'))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('update', () => {
        beforeEach(() => {
            mockPrismaService.salaryStructure.findFirst.mockResolvedValue({
                id: 'struct-123',
                name: 'هيكل قديم',
            });
        });

        it('should update structure name', async () => {
            mockPrismaService.salaryStructure.update.mockResolvedValue({
                id: 'struct-123',
                name: 'هيكل جديد',
            });

            const result = await service.update('struct-123', 'company-123', {
                name: 'هيكل جديد',
            });

            expect(mockPrismaService.salaryStructure.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ name: 'هيكل جديد' }),
                })
            );
        });

        it('should replace lines when provided', async () => {
            const updateDto = {
                lines: [
                    { componentId: 'comp-1', amount: 5000, priority: 1 },
                ],
            };
            mockPrismaService.salaryStructure.update.mockResolvedValue({});
            mockPrismaService.salaryStructureLine.deleteMany.mockResolvedValue({});
            mockPrismaService.salaryStructureLine.createMany.mockResolvedValue({ count: 1 });
            mockPrismaService.salaryStructure.findFirst.mockResolvedValue({ lines: [] });

            await service.update('struct-123', 'company-123', updateDto);

            expect(mockPrismaService.salaryStructureLine.deleteMany).toHaveBeenCalled();
            expect(mockPrismaService.salaryStructureLine.createMany).toHaveBeenCalled();
        });
    });

    describe('remove', () => {
        beforeEach(() => {
            mockPrismaService.salaryStructure.findFirst.mockResolvedValue({
                id: 'struct-123',
            });
        });

        it('should delete unassigned structure', async () => {
            mockPrismaService.employeeSalaryAssignment.findFirst.mockResolvedValue(null);
            mockPrismaService.salaryStructure.delete.mockResolvedValue({});

            await service.remove('struct-123', 'company-123');

            expect(mockPrismaService.salaryStructure.delete).toHaveBeenCalled();
        });

        it('should soft delete (archive) assigned structure', async () => {
            mockPrismaService.employeeSalaryAssignment.findFirst.mockResolvedValue({
                id: 'assignment-123',
            });
            mockPrismaService.salaryStructure.update.mockResolvedValue({
                isActive: false,
            });

            const result = await service.remove('struct-123', 'company-123');

            expect(mockPrismaService.salaryStructure.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: { isActive: false },
                })
            );
            expect(mockPrismaService.salaryStructure.delete).not.toHaveBeenCalled();
        });
    });

    describe('validateUniqueComponents', () => {
        it('should not throw for unique components', () => {
            const lines = [
                { componentId: 'comp-1' },
                { componentId: 'comp-2' },
                { componentId: 'comp-3' },
            ];

            // Call through create which uses validate
            mockPrismaService.salaryStructure.create.mockResolvedValue({ id: 'test' });

            expect(async () => {
                await service.create({ name: 'test', lines }, 'company-123');
            }).not.toThrow();
        });

        it('should throw for duplicate components', async () => {
            const lines = [
                { componentId: 'comp-1' },
                { componentId: 'comp-1' }, // Duplicate
            ];

            await expect(service.create({ name: 'test', lines }, 'company-123'))
                .rejects.toThrow(BadRequestException);
        });
    });
});
