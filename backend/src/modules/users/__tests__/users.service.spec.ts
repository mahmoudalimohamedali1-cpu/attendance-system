import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { LeaveCalculationService } from '../../leaves/leave-calculation.service';
import { SettingsService } from '../../settings/settings.service';
import { PermissionsService } from '../../permissions/permissions.service';

/**
 * 🧪 Users Service Unit Tests
 * 
 * Tests for:
 * - User CRUD operations
 * - Profile management
 * - Password change
 * - User import
 * - Face registration reset
 * - Employee code generation
 * - Manager-employee relationships
 */

// Mock services
const mockPrismaService = {
    user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
    },
    branch: {
        findUnique: jest.fn(),
    },
    department: {
        findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
};

const mockLeaveCalculationService = {
    calculateAnnualLeave: jest.fn(),
    getLeaveBalance: jest.fn(),
};

const mockSettingsService = {
    getSettingValue: jest.fn(),
    getCompanySettings: jest.fn(),
};

const mockPermissionsService = {
    hasPermission: jest.fn(),
    getPermissions: jest.fn(),
};

describe('UsersService', () => {
    let service: UsersService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: LeaveCalculationService, useValue: mockLeaveCalculationService },
                { provide: SettingsService, useValue: mockSettingsService },
                { provide: PermissionsService, useValue: mockPermissionsService },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
        jest.clearAllMocks();
    });

    describe('create', () => {
        const companyId = 'company-123';
        const createUserDto = {
            email: 'newuser@example.com',
            phone: '+966501234567',
            password: 'securePassword123',
            nameAr: 'محمد أحمد',
            nameEn: 'Mohammed Ahmed',
            role: 'EMPLOYEE',
            branchId: 'branch-123',
            departmentId: 'dept-123',
        };

        beforeEach(() => {
            mockPrismaService.user.findFirst.mockResolvedValue(null);
            mockPrismaService.branch.findUnique.mockResolvedValue({ id: 'branch-123' });
            mockPrismaService.department.findUnique.mockResolvedValue({ id: 'dept-123' });
        });

        it('should create a new user successfully', async () => {
            jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('hashed-password'));
            mockPrismaService.user.create.mockResolvedValue({
                id: 'new-user-123',
                ...createUserDto,
                password: 'hashed-password',
                employeeCode: 'EMP00001',
                companyId,
            });

            const result = await service.create(createUserDto, companyId);

            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('employeeCode');
            expect(mockPrismaService.user.create).toHaveBeenCalled();
        });

        it('should throw ConflictException for duplicate email', async () => {
            mockPrismaService.user.findFirst.mockResolvedValue({
                id: 'existing',
                email: createUserDto.email
            });

            await expect(service.create(createUserDto, companyId))
                .rejects.toThrow(ConflictException);
        });

        it('should throw ConflictException for duplicate phone', async () => {
            mockPrismaService.user.findFirst.mockResolvedValue({
                id: 'existing',
                phone: createUserDto.phone
            });

            await expect(service.create(createUserDto, companyId))
                .rejects.toThrow(ConflictException);
        });

        it('should hash password before storing', async () => {
            const hashSpy = jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('hashed-password'));
            mockPrismaService.user.create.mockResolvedValue({
                id: 'new-user-123',
                ...createUserDto,
                password: 'hashed-password',
                employeeCode: 'EMP00001',
            });

            await service.create(createUserDto, companyId);

            expect(hashSpy).toHaveBeenCalledWith(createUserDto.password, 10);
        });

        it('should generate unique employee code', async () => {
            jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('hashed-password'));
            mockPrismaService.user.findFirst.mockResolvedValueOnce(null); // No duplicate
            mockPrismaService.user.findFirst.mockResolvedValueOnce({ employeeCode: 'EMP00010' }); // Last code
            mockPrismaService.user.create.mockResolvedValue({
                id: 'new-user-123',
                employeeCode: 'EMP00011',
            });

            await service.create(createUserDto, companyId);

            expect(mockPrismaService.user.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        employeeCode: expect.stringMatching(/^EMP\d{5}$/),
                    }),
                })
            );
        });

        it('should validate branch exists', async () => {
            mockPrismaService.branch.findUnique.mockResolvedValue(null);

            await expect(service.create(createUserDto, companyId))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('findAll', () => {
        it('should return paginated users', async () => {
            const mockUsers = [
                { id: 'user-1', nameAr: 'أحمد' },
                { id: 'user-2', nameAr: 'محمد' },
            ];
            mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
            mockPrismaService.user.count.mockResolvedValue(50);

            const result = await service.findAll({ page: 1, limit: 10 }, 'company-123');

            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('total', 50);
        });

        it('should filter by status', async () => {
            mockPrismaService.user.findMany.mockResolvedValue([]);
            mockPrismaService.user.count.mockResolvedValue(0);

            await service.findAll({ status: 'ACTIVE' }, 'company-123');

            expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        status: 'ACTIVE',
                    }),
                })
            );
        });

        it('should search by name', async () => {
            mockPrismaService.user.findMany.mockResolvedValue([]);
            mockPrismaService.user.count.mockResolvedValue(0);

            await service.findAll({ search: 'أحمد' }, 'company-123');

            expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: expect.arrayContaining([
                            expect.objectContaining({ nameAr: expect.any(Object) }),
                            expect.objectContaining({ nameEn: expect.any(Object) }),
                        ]),
                    }),
                })
            );
        });

        it('should filter by department', async () => {
            mockPrismaService.user.findMany.mockResolvedValue([]);
            mockPrismaService.user.count.mockResolvedValue(0);

            await service.findAll({ departmentId: 'dept-123' }, 'company-123');

            expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        departmentId: 'dept-123',
                    }),
                })
            );
        });

        it('should filter by branch', async () => {
            mockPrismaService.user.findMany.mockResolvedValue([]);
            mockPrismaService.user.count.mockResolvedValue(0);

            await service.findAll({ branchId: 'branch-123' }, 'company-123');

            expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        branchId: 'branch-123',
                    }),
                })
            );
        });
    });

    describe('findOne', () => {
        it('should return user by ID', async () => {
            const mockUser = {
                id: 'user-123',
                nameAr: 'أحمد محمد',
                email: 'ahmed@example.com',
                branch: { id: 'branch-1', name: 'Main' },
                department: { id: 'dept-1', name: 'IT' },
            };
            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

            const result = await service.findOne('user-123', 'company-123');

            expect(result).toEqual(mockUser);
        });

        it('should throw NotFoundException for non-existent user', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(null);

            await expect(service.findOne('non-existent', 'company-123'))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('update', () => {
        const updateUserDto = {
            nameAr: 'محمد علي',
            phone: '+966509876543',
        };

        beforeEach(() => {
            mockPrismaService.user.findUnique.mockResolvedValue({
                id: 'user-123',
                nameAr: 'محمد أحمد',
                companyId: 'company-123',
            });
        });

        it('should update user successfully', async () => {
            mockPrismaService.user.findFirst.mockResolvedValue(null); // No duplicate
            mockPrismaService.user.update.mockResolvedValue({
                id: 'user-123',
                ...updateUserDto,
            });

            const result = await service.update('user-123', updateUserDto, 'company-123');

            expect(result).toHaveProperty('id');
            expect(mockPrismaService.user.update).toHaveBeenCalled();
        });

        it('should throw ConflictException for duplicate phone', async () => {
            mockPrismaService.user.findFirst.mockResolvedValue({
                id: 'other-user',
                phone: updateUserDto.phone,
            });

            await expect(service.update('user-123', updateUserDto, 'company-123'))
                .rejects.toThrow(ConflictException);
        });

        it('should throw NotFoundException for non-existent user', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(null);

            await expect(service.update('non-existent', updateUserDto, 'company-123'))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('remove', () => {
        it('should soft delete user by setting status to INACTIVE', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue({
                id: 'user-123',
                status: 'ACTIVE',
                companyId: 'company-123',
            });
            mockPrismaService.user.update.mockResolvedValue({
                id: 'user-123',
                status: 'INACTIVE',
            });

            const result = await service.remove('user-123', 'company-123');

            expect(mockPrismaService.user.update).toHaveBeenCalledWith({
                where: { id: 'user-123' },
                data: { status: 'INACTIVE' },
            });
        });

        it('should throw NotFoundException for non-existent user', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(null);

            await expect(service.remove('non-existent', 'company-123'))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('activate', () => {
        it('should activate inactive user', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue({
                id: 'user-123',
                status: 'INACTIVE',
            });
            mockPrismaService.user.update.mockResolvedValue({
                id: 'user-123',
                status: 'ACTIVE',
            });

            const result = await service.activate('user-123');

            expect(mockPrismaService.user.update).toHaveBeenCalledWith({
                where: { id: 'user-123' },
                data: { status: 'ACTIVE' },
            });
        });
    });

    describe('resetFace', () => {
        it('should clear face embedding for user', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue({
                id: 'user-123',
                companyId: 'company-123',
                faceEmbedding: [0.1, 0.2, 0.3],
            });
            mockPrismaService.user.update.mockResolvedValue({
                id: 'user-123',
                faceEmbedding: null,
            });

            const result = await service.resetFace('user-123', 'company-123');

            expect(mockPrismaService.user.update).toHaveBeenCalledWith({
                where: { id: 'user-123' },
                data: {
                    faceEmbedding: null,
                    faceRegisteredAt: null,
                },
            });
        });

        it('should throw NotFoundException for non-existent user', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(null);

            await expect(service.resetFace('non-existent', 'company-123'))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('changePassword', () => {
        const userId = 'user-123';
        const oldPassword = 'oldPassword123';
        const newPassword = 'newSecurePassword456';

        it('should change password successfully', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue({
                id: userId,
                password: '$2a$10$hashedOldPassword',
            });
            jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));
            jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('hashedNewPassword'));
            mockPrismaService.user.update.mockResolvedValue({
                id: userId,
                password: 'hashedNewPassword',
            });

            const result = await service.changePassword(userId, oldPassword, newPassword);

            expect(result).toHaveProperty('message');
            expect(mockPrismaService.user.update).toHaveBeenCalled();
        });

        it('should throw BadRequestException for incorrect old password', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue({
                id: userId,
                password: '$2a$10$hashedOldPassword',
            });
            jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

            await expect(service.changePassword(userId, 'wrongPassword', newPassword))
                .rejects.toThrow(BadRequestException);
        });

        it('should throw NotFoundException for non-existent user', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(null);

            await expect(service.changePassword(userId, oldPassword, newPassword))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('getEmployeesByManager', () => {
        it('should return direct reports for manager', async () => {
            const mockEmployees = [
                { id: 'emp-1', nameAr: 'أحمد', managerId: 'manager-123' },
                { id: 'emp-2', nameAr: 'محمد', managerId: 'manager-123' },
            ];
            mockPrismaService.user.findMany.mockResolvedValue(mockEmployees);

            const result = await service.getEmployeesByManager('manager-123', 'company-123');

            expect(result).toHaveLength(2);
            expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        managerId: 'manager-123',
                        companyId: 'company-123',
                    }),
                })
            );
        });

        it('should return empty array if no direct reports', async () => {
            mockPrismaService.user.findMany.mockResolvedValue([]);

            const result = await service.getEmployeesByManager('manager-123', 'company-123');

            expect(result).toHaveLength(0);
        });
    });

    describe('getProfile', () => {
        it('should return user profile', async () => {
            const mockUser = {
                id: 'user-123',
                nameAr: 'أحمد محمد',
                email: 'ahmed@example.com',
                branch: { id: 'branch-1' },
                department: { id: 'dept-1' },
                leaveBalance: 21,
            };
            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

            const result = await service.getProfile('user-123', 'company-123');

            expect(result).toEqual(mockUser);
        });
    });

    describe('updateProfile', () => {
        it('should update allowed profile fields', async () => {
            const updateData = {
                phone: '+966509876543',
                emergencyContact: '+966501111111',
            };
            mockPrismaService.user.findUnique.mockResolvedValue({
                id: 'user-123',
                companyId: 'company-123',
            });
            mockPrismaService.user.update.mockResolvedValue({
                id: 'user-123',
                ...updateData,
            });

            const result = await service.updateProfile('user-123', updateData, 'company-123');

            expect(mockPrismaService.user.update).toHaveBeenCalled();
        });
    });

    describe('generateEmployeeCode', () => {
        it('should generate sequential employee code', async () => {
            mockPrismaService.user.findFirst.mockResolvedValue({
                employeeCode: 'EMP00025',
            });

            const privateMethod = service['generateEmployeeCode'].bind(service);
            const result = await privateMethod('company-123');

            expect(result).toBe('EMP00026');
        });

        it('should start from EMP00001 if no existing codes', async () => {
            mockPrismaService.user.findFirst.mockResolvedValue(null);

            const privateMethod = service['generateEmployeeCode'].bind(service);
            const result = await privateMethod('company-123');

            expect(result).toBe('EMP00001');
        });
    });
});
