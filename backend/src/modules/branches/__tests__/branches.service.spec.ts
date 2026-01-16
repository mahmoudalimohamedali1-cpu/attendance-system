import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { BranchesService } from '../branches.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * 🧪 Branches Service Unit Tests
 * 
 * Tests for:
 * - Branch CRUD operations
 * - Department CRUD operations
 * - Work schedule management
 * - Branch status toggling
 */

const mockPrismaService = {
    branch: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    department: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
    },
    workSchedule: {
        createMany: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
    },
};

describe('BranchesService', () => {
    let service: BranchesService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BranchesService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<BranchesService>(BranchesService);
        jest.clearAllMocks();
    });

    describe('Branch Operations', () => {
        describe('createBranch', () => {
            it('should create a branch with default schedules', async () => {
                const createDto = {
                    name: 'الفرع الرئيسي',
                    latitude: 24.7136,
                    longitude: 46.6753,
                    radius: 100,
                };
                mockPrismaService.branch.create.mockResolvedValue({
                    id: 'branch-123',
                    ...createDto,
                    companyId: 'company-123',
                });
                mockPrismaService.workSchedule.createMany.mockResolvedValue({ count: 7 });

                const result = await service.createBranch(createDto, 'company-123');

                expect(result.id).toBe('branch-123');
                expect(mockPrismaService.workSchedule.createMany).toHaveBeenCalled();
            });

            it('should create branch with custom working days', async () => {
                const createDto = {
                    name: 'فرع الجمعة',
                    latitude: 24.7136,
                    longitude: 46.6753,
                    radius: 100,
                    workingDays: '0,1,2,3,4,5', // Including Friday
                };
                mockPrismaService.branch.create.mockResolvedValue({
                    id: 'branch-123',
                    ...createDto,
                });
                mockPrismaService.workSchedule.createMany.mockResolvedValue({ count: 7 });

                await service.createBranch(createDto, 'company-123');

                expect(mockPrismaService.workSchedule.createMany).toHaveBeenCalled();
            });
        });

        describe('findAllBranches', () => {
            it('should return all branches for company', async () => {
                const mockBranches = [
                    { id: 'branch-1', name: 'فرع 1', departments: [], _count: { users: 5, departments: 2 } },
                    { id: 'branch-2', name: 'فرع 2', departments: [], _count: { users: 10, departments: 3 } },
                ];
                mockPrismaService.branch.findMany.mockResolvedValue(mockBranches);

                const result = await service.findAllBranches('company-123');

                expect(result).toHaveLength(2);
                expect(mockPrismaService.branch.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: { companyId: 'company-123' },
                    })
                );
            });
        });

        describe('findBranchById', () => {
            it('should return branch with details', async () => {
                const mockBranch = {
                    id: 'branch-123',
                    name: 'الفرع الرئيسي',
                    departments: [],
                    schedules: [],
                    _count: { users: 5, departments: 2 },
                };
                mockPrismaService.branch.findUnique.mockResolvedValue(mockBranch);

                const result = await service.findBranchById('branch-123');

                expect(result.id).toBe('branch-123');
            });

            it('should throw NotFoundException for non-existent branch', async () => {
                mockPrismaService.branch.findUnique.mockResolvedValue(null);

                await expect(service.findBranchById('non-existent'))
                    .rejects.toThrow(NotFoundException);
            });
        });

        describe('updateBranch', () => {
            it('should update branch successfully', async () => {
                mockPrismaService.branch.findFirst.mockResolvedValue({ id: 'branch-123' });
                mockPrismaService.branch.update.mockResolvedValue({
                    id: 'branch-123',
                    name: 'اسم جديد',
                });

                const result = await service.updateBranch(
                    'branch-123',
                    { name: 'اسم جديد' },
                    'company-123'
                );

                expect(result.name).toBe('اسم جديد');
            });

            it('should throw NotFoundException if branch not found', async () => {
                mockPrismaService.branch.findFirst.mockResolvedValue(null);

                await expect(service.updateBranch('non-existent', { name: 'test' }, 'company-123'))
                    .rejects.toThrow(NotFoundException);
            });
        });

        describe('deleteBranch', () => {
            it('should delete branch with no employees', async () => {
                mockPrismaService.branch.findUnique.mockResolvedValue({
                    id: 'branch-123',
                    _count: { users: 0 },
                });
                mockPrismaService.workSchedule.deleteMany.mockResolvedValue({});
                mockPrismaService.department.deleteMany.mockResolvedValue({});
                mockPrismaService.branch.delete.mockResolvedValue({});

                const result = await service.deleteBranch('branch-123');

                expect(result.message).toBe('تم حذف الفرع بنجاح');
            });

            it('should throw ConflictException if branch has employees', async () => {
                mockPrismaService.branch.findUnique.mockResolvedValue({
                    id: 'branch-123',
                    _count: { users: 5 },
                });

                await expect(service.deleteBranch('branch-123'))
                    .rejects.toThrow(ConflictException);
            });

            it('should throw NotFoundException if branch not found', async () => {
                mockPrismaService.branch.findUnique.mockResolvedValue(null);

                await expect(service.deleteBranch('non-existent'))
                    .rejects.toThrow(NotFoundException);
            });
        });

        describe('toggleBranchStatus', () => {
            it('should toggle branch from active to inactive', async () => {
                mockPrismaService.branch.findFirst.mockResolvedValue({
                    id: 'branch-123',
                    isActive: true,
                });
                mockPrismaService.branch.update.mockResolvedValue({
                    id: 'branch-123',
                    isActive: false,
                });

                const result = await service.toggleBranchStatus('branch-123', 'company-123');

                expect(result.isActive).toBe(false);
            });
        });
    });

    describe('Department Operations', () => {
        describe('createDepartment', () => {
            it('should create department in valid branch', async () => {
                const createDto = {
                    name: 'قسم تقنية المعلومات',
                    branchId: 'branch-123',
                };
                mockPrismaService.branch.findFirst.mockResolvedValue({ id: 'branch-123' });
                mockPrismaService.department.create.mockResolvedValue({
                    id: 'dept-123',
                    ...createDto,
                });

                const result = await service.createDepartment(createDto, 'company-123');

                expect(result.id).toBe('dept-123');
            });

            it('should throw NotFoundException if branch not found', async () => {
                mockPrismaService.branch.findFirst.mockResolvedValue(null);

                await expect(service.createDepartment(
                    { name: 'قسم', branchId: 'invalid' },
                    'company-123'
                )).rejects.toThrow(NotFoundException);
            });
        });

        describe('findAllDepartments', () => {
            it('should return all departments for company', async () => {
                const mockDepartments = [
                    { id: 'dept-1', name: 'قسم 1', branch: { id: 'b1', name: 'فرع 1' }, _count: { users: 5 } },
                    { id: 'dept-2', name: 'قسم 2', branch: { id: 'b1', name: 'فرع 1' }, _count: { users: 3 } },
                ];
                mockPrismaService.department.findMany.mockResolvedValue(mockDepartments);

                const result = await service.findAllDepartments('company-123');

                expect(result).toHaveLength(2);
            });

            it('should filter by branchId when provided', async () => {
                mockPrismaService.department.findMany.mockResolvedValue([]);

                await service.findAllDepartments('company-123', 'branch-123');

                expect(mockPrismaService.department.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: expect.objectContaining({
                            branchId: 'branch-123',
                        }),
                    })
                );
            });
        });

        describe('updateDepartment', () => {
            it('should update department', async () => {
                mockPrismaService.department.findUnique.mockResolvedValue({ id: 'dept-123' });
                mockPrismaService.department.update.mockResolvedValue({
                    id: 'dept-123',
                    name: 'اسم جديد',
                });

                const result = await service.updateDepartment('dept-123', { name: 'اسم جديد' });

                expect(result.name).toBe('اسم جديد');
            });

            it('should throw NotFoundException if department not found', async () => {
                mockPrismaService.department.findUnique.mockResolvedValue(null);

                await expect(service.updateDepartment('non-existent', { name: 'test' }))
                    .rejects.toThrow(NotFoundException);
            });
        });

        describe('deleteDepartment', () => {
            it('should delete department with no employees', async () => {
                mockPrismaService.department.findUnique.mockResolvedValue({
                    id: 'dept-123',
                    _count: { users: 0 },
                });
                mockPrismaService.department.delete.mockResolvedValue({});

                const result = await service.deleteDepartment('dept-123');

                expect(result.message).toBe('تم حذف القسم بنجاح');
            });

            it('should throw ConflictException if department has employees', async () => {
                mockPrismaService.department.findUnique.mockResolvedValue({
                    id: 'dept-123',
                    _count: { users: 3 },
                });

                await expect(service.deleteDepartment('dept-123'))
                    .rejects.toThrow(ConflictException);
            });
        });
    });

    describe('Schedule Operations', () => {
        describe('updateBranchSchedule', () => {
            it('should update branch schedules', async () => {
                const schedules = [
                    { dayOfWeek: 0, workStartTime: '08:00', workEndTime: '16:00', isWorkingDay: true },
                    { dayOfWeek: 1, workStartTime: '08:00', workEndTime: '16:00', isWorkingDay: true },
                ];
                mockPrismaService.workSchedule.deleteMany.mockResolvedValue({});
                mockPrismaService.workSchedule.createMany.mockResolvedValue({ count: 2 });
                mockPrismaService.workSchedule.findMany.mockResolvedValue(schedules);

                const result = await service.updateBranchSchedule('branch-123', schedules);

                expect(result).toHaveLength(2);
                expect(mockPrismaService.workSchedule.deleteMany).toHaveBeenCalled();
                expect(mockPrismaService.workSchedule.createMany).toHaveBeenCalled();
            });
        });

        describe('getBranchSchedule', () => {
            it('should return branch schedules', async () => {
                mockPrismaService.branch.findFirst.mockResolvedValue({ id: 'branch-123' });
                mockPrismaService.workSchedule.findMany.mockResolvedValue([
                    { dayOfWeek: 0, isWorkingDay: true },
                    { dayOfWeek: 1, isWorkingDay: true },
                ]);

                const result = await service.getBranchSchedule('branch-123', 'company-123');

                expect(result).toHaveLength(2);
            });

            it('should throw NotFoundException if branch not found', async () => {
                mockPrismaService.branch.findFirst.mockResolvedValue(null);

                await expect(service.getBranchSchedule('non-existent', 'company-123'))
                    .rejects.toThrow(NotFoundException);
            });
        });
    });
});
