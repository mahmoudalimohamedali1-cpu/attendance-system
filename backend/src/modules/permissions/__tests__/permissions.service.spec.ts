import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PermissionsService } from '../permissions.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PermissionScope } from '@prisma/client';

/**
 * 🧪 Permissions Service Unit Tests
 * 
 * Tests for:
 * - Permission management (CRUD)
 * - User permission checks
 * - Scope-based access control (Company, Branch, Department, Employee)
 * - Subordinate hierarchy
 * - Bulk permission updates
 */

const mockPrismaService = {
    permission: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
    },
    userPermission: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        update: jest.fn(),
    },
    permissionEmployee: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
    },
    user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
    },
    auditLog: {
        create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
};

describe('PermissionsService', () => {
    let service: PermissionsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PermissionsService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<PermissionsService>(PermissionsService);
        jest.clearAllMocks();
    });

    describe('getAllPermissions', () => {
        it('should return all permissions ordered by category', async () => {
            const mockPermissions = [
                { code: 'user.view', category: 'users', nameAr: 'عرض المستخدمين' },
                { code: 'user.edit', category: 'users', nameAr: 'تعديل المستخدمين' },
                { code: 'leave.approve', category: 'leaves', nameAr: 'الموافقة على الإجازات' },
            ];
            mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);

            const result = await service.getAllPermissions();

            expect(result).toHaveLength(3);
            expect(mockPrismaService.permission.findMany).toHaveBeenCalledWith({
                orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
            });
        });
    });

    describe('getPermissionsByCategory', () => {
        it('should group permissions by category', async () => {
            const mockPermissions = [
                { code: 'user.view', category: 'users' },
                { code: 'user.edit', category: 'users' },
                { code: 'leave.approve', category: 'leaves' },
            ];
            mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);

            const result = await service.getPermissionsByCategory();

            expect(result).toHaveProperty('users');
            expect(result).toHaveProperty('leaves');
            expect(result.users).toHaveLength(2);
            expect(result.leaves).toHaveLength(1);
        });
    });

    describe('getPermissionByCode', () => {
        it('should return permission by code', async () => {
            const mockPermission = { code: 'user.view', nameAr: 'عرض المستخدمين' };
            mockPrismaService.permission.findUnique.mockResolvedValue(mockPermission);

            const result = await service.getPermissionByCode('user.view');

            expect(result).toEqual(mockPermission);
        });

        it('should throw NotFoundException for invalid code', async () => {
            mockPrismaService.permission.findUnique.mockResolvedValue(null);

            await expect(service.getPermissionByCode('invalid.code'))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('getUserPermissions', () => {
        it('should return all permissions for a user', async () => {
            const mockUserPermissions = [
                { id: 'up-1', permission: { code: 'user.view' }, scope: 'COMPANY' },
                { id: 'up-2', permission: { code: 'leave.approve' }, scope: 'DEPARTMENT' },
            ];
            mockPrismaService.userPermission.findMany.mockResolvedValue(mockUserPermissions);

            const result = await service.getUserPermissions('user-123', 'company-123');

            expect(result).toHaveLength(2);
        });
    });

    describe('addUserPermission', () => {
        const userId = 'user-123';
        const companyId = 'company-123';
        const permissionCode = 'user.view';

        beforeEach(() => {
            mockPrismaService.permission.findUnique.mockResolvedValue({
                id: 'perm-1',
                code: permissionCode,
            });
            mockPrismaService.userPermission.findFirst.mockResolvedValue(null);
        });

        it('should add COMPANY scope permission', async () => {
            mockPrismaService.userPermission.create.mockResolvedValue({
                id: 'up-123',
                scope: 'COMPANY',
            });

            const result = await service.addUserPermission(
                userId,
                companyId,
                permissionCode,
                'COMPANY' as PermissionScope
            );

            expect(result).toHaveProperty('id');
            expect(mockPrismaService.userPermission.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    userId,
                    companyId,
                    scope: 'COMPANY',
                }),
                include: expect.any(Object),
            });
        });

        it('should add BRANCH scope permission with branchId', async () => {
            mockPrismaService.userPermission.create.mockResolvedValue({
                id: 'up-123',
                scope: 'BRANCH',
                branchId: 'branch-123',
            });

            await service.addUserPermission(
                userId,
                companyId,
                permissionCode,
                'BRANCH' as PermissionScope,
                { branchId: 'branch-123' }
            );

            expect(mockPrismaService.userPermission.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    scope: 'BRANCH',
                    branchId: 'branch-123',
                }),
                include: expect.any(Object),
            });
        });

        it('should add DEPARTMENT scope permission with departmentId', async () => {
            mockPrismaService.userPermission.create.mockResolvedValue({
                id: 'up-123',
                scope: 'DEPARTMENT',
                departmentId: 'dept-123',
            });

            await service.addUserPermission(
                userId,
                companyId,
                permissionCode,
                'DEPARTMENT' as PermissionScope,
                { departmentId: 'dept-123' }
            );

            expect(mockPrismaService.userPermission.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    scope: 'DEPARTMENT',
                    departmentId: 'dept-123',
                }),
                include: expect.any(Object),
            });
        });

        it('should add SPECIFIC_EMPLOYEES scope with employee IDs', async () => {
            mockPrismaService.userPermission.create.mockResolvedValue({
                id: 'up-123',
                scope: 'SPECIFIC_EMPLOYEES',
            });
            mockPrismaService.permissionEmployee.createMany.mockResolvedValue({ count: 2 });

            await service.addUserPermission(
                userId,
                companyId,
                permissionCode,
                'SPECIFIC_EMPLOYEES' as PermissionScope,
                { employeeIds: ['emp-1', 'emp-2'] }
            );

            expect(mockPrismaService.permissionEmployee.createMany).toHaveBeenCalled();
        });

        it('should throw error for invalid permission code', async () => {
            mockPrismaService.permission.findUnique.mockResolvedValue(null);

            await expect(service.addUserPermission(
                userId,
                companyId,
                'invalid.code',
                'COMPANY' as PermissionScope
            )).rejects.toThrow(NotFoundException);
        });

        it('should throw error for duplicate permission', async () => {
            mockPrismaService.userPermission.findFirst.mockResolvedValue({
                id: 'existing-up',
            });

            await expect(service.addUserPermission(
                userId,
                companyId,
                permissionCode,
                'COMPANY' as PermissionScope
            )).rejects.toThrow(BadRequestException);
        });
    });

    describe('removeUserPermission', () => {
        it('should delete user permission', async () => {
            mockPrismaService.userPermission.findUnique.mockResolvedValue({
                id: 'up-123',
                userId: 'user-123',
                permission: { code: 'user.view' },
            });
            mockPrismaService.userPermission.delete.mockResolvedValue({});

            await service.removeUserPermission('up-123');

            expect(mockPrismaService.userPermission.delete).toHaveBeenCalledWith({
                where: { id: 'up-123' },
            });
        });

        it('should throw NotFoundException for non-existent permission', async () => {
            mockPrismaService.userPermission.findUnique.mockResolvedValue(null);

            await expect(service.removeUserPermission('non-existent'))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('hasPermission', () => {
        it('should return true when user has permission', async () => {
            mockPrismaService.userPermission.findFirst.mockResolvedValue({
                id: 'up-123',
                scope: 'COMPANY',
            });

            const result = await service.hasPermission('user-123', 'company-123', 'user.view');

            expect(result).toBe(true);
        });

        it('should return false when user lacks permission', async () => {
            mockPrismaService.userPermission.findFirst.mockResolvedValue(null);

            const result = await service.hasPermission('user-123', 'company-123', 'admin.delete');

            expect(result).toBe(false);
        });
    });

    describe('canAccessEmployee', () => {
        const userId = 'manager-123';
        const companyId = 'company-123';
        const permissionCode = 'user.view';
        const targetEmployeeId = 'emp-456';

        it('should grant access for COMPANY scope', async () => {
            mockPrismaService.userPermission.findMany.mockResolvedValue([
                { scope: 'COMPANY', permission: { code: permissionCode } },
            ]);

            const result = await service.canAccessEmployee(
                userId,
                companyId,
                permissionCode,
                targetEmployeeId
            );

            expect(result.hasAccess).toBe(true);
        });

        it('should grant access for BRANCH scope when employee in same branch', async () => {
            mockPrismaService.userPermission.findMany.mockResolvedValue([
                { scope: 'BRANCH', branchId: 'branch-123', permission: { code: permissionCode } },
            ]);
            mockPrismaService.user.findUnique.mockResolvedValue({
                id: targetEmployeeId,
                branchId: 'branch-123',
            });

            const result = await service.canAccessEmployee(
                userId,
                companyId,
                permissionCode,
                targetEmployeeId
            );

            expect(result.hasAccess).toBe(true);
        });

        it('should deny access for BRANCH scope when employee in different branch', async () => {
            mockPrismaService.userPermission.findMany.mockResolvedValue([
                { scope: 'BRANCH', branchId: 'branch-123', permission: { code: permissionCode } },
            ]);
            mockPrismaService.user.findUnique.mockResolvedValue({
                id: targetEmployeeId,
                branchId: 'branch-456', // Different branch
            });

            const result = await service.canAccessEmployee(
                userId,
                companyId,
                permissionCode,
                targetEmployeeId
            );

            expect(result.hasAccess).toBe(false);
        });

        it('should grant access for SPECIFIC_EMPLOYEES when target is in list', async () => {
            mockPrismaService.userPermission.findMany.mockResolvedValue([
                {
                    scope: 'SPECIFIC_EMPLOYEES',
                    permission: { code: permissionCode },
                    assignedEmployees: [{ employeeId: targetEmployeeId }],
                },
            ]);

            const result = await service.canAccessEmployee(
                userId,
                companyId,
                permissionCode,
                targetEmployeeId
            );

            expect(result.hasAccess).toBe(true);
        });

        it('should deny access when no matching permission', async () => {
            mockPrismaService.userPermission.findMany.mockResolvedValue([]);

            const result = await service.canAccessEmployee(
                userId,
                companyId,
                permissionCode,
                targetEmployeeId
            );

            expect(result.hasAccess).toBe(false);
        });
    });

    describe('getAllSubordinates', () => {
        it('should return all direct and indirect reports', async () => {
            // First level subordinates
            mockPrismaService.user.findMany
                .mockResolvedValueOnce([{ id: 'sub-1' }, { id: 'sub-2' }])
                // Second level (sub-1's subordinates)
                .mockResolvedValueOnce([{ id: 'sub-3' }])
                // Second level (sub-2's subordinates)
                .mockResolvedValueOnce([])
                // Third level (sub-3's subordinates)
                .mockResolvedValueOnce([]);

            const result = await service.getAllSubordinates('manager-123');

            expect(result).toContain('sub-1');
            expect(result).toContain('sub-2');
            expect(result).toContain('sub-3');
        });

        it('should return empty array for manager with no subordinates', async () => {
            mockPrismaService.user.findMany.mockResolvedValue([]);

            const result = await service.getAllSubordinates('manager-123');

            expect(result).toHaveLength(0);
        });
    });

    describe('isDirectSubordinate', () => {
        it('should return true for direct subordinate', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue({
                id: 'emp-123',
                managerId: 'manager-123',
            });

            const result = await service.isDirectSubordinate('manager-123', 'emp-123');

            expect(result).toBe(true);
        });

        it('should return false for non-subordinate', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue({
                id: 'emp-123',
                managerId: 'other-manager',
            });

            const result = await service.isDirectSubordinate('manager-123', 'emp-123');

            expect(result).toBe(false);
        });
    });

    describe('getDirectSubordinates', () => {
        it('should return list of direct report IDs', async () => {
            mockPrismaService.user.findMany.mockResolvedValue([
                { id: 'emp-1' },
                { id: 'emp-2' },
                { id: 'emp-3' },
            ]);

            const result = await service.getDirectSubordinates('manager-123');

            expect(result).toHaveLength(3);
            expect(result).toContain('emp-1');
        });
    });

    describe('Branch and Department Checks', () => {
        describe('isEmployeeInBranch', () => {
            it('should return true when employee is in branch', async () => {
                mockPrismaService.user.findUnique.mockResolvedValue({
                    id: 'emp-123',
                    branchId: 'branch-123',
                });

                const result = await service.isEmployeeInBranch('emp-123', 'branch-123');

                expect(result).toBe(true);
            });

            it('should return false when employee is in different branch', async () => {
                mockPrismaService.user.findUnique.mockResolvedValue({
                    id: 'emp-123',
                    branchId: 'branch-456',
                });

                const result = await service.isEmployeeInBranch('emp-123', 'branch-123');

                expect(result).toBe(false);
            });
        });

        describe('isEmployeeInDepartment', () => {
            it('should return true when employee is in department', async () => {
                mockPrismaService.user.findUnique.mockResolvedValue({
                    id: 'emp-123',
                    departmentId: 'dept-123',
                });

                const result = await service.isEmployeeInDepartment('emp-123', 'dept-123');

                expect(result).toBe(true);
            });
        });

        describe('getBranchEmployees', () => {
            it('should return all employee IDs in branch', async () => {
                mockPrismaService.user.findMany.mockResolvedValue([
                    { id: 'emp-1' },
                    { id: 'emp-2' },
                ]);

                const result = await service.getBranchEmployees('branch-123');

                expect(result).toHaveLength(2);
            });
        });

        describe('getDepartmentEmployees', () => {
            it('should return all employee IDs in department', async () => {
                mockPrismaService.user.findMany.mockResolvedValue([
                    { id: 'emp-1' },
                    { id: 'emp-2' },
                    { id: 'emp-3' },
                ]);

                const result = await service.getDepartmentEmployees('dept-123');

                expect(result).toHaveLength(3);
            });
        });
    });
});
