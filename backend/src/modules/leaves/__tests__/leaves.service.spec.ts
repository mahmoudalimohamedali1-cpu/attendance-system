import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { LeavesService } from '../leaves.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { PermissionsService } from '../../permissions/permissions.service';
import { SmartPolicyTriggerService } from '../../smart-policies/smart-policy-trigger.service';
import { TimezoneService } from '../../../common/services/timezone.service';

/**
 * 🧪 Leaves Service Unit Tests
 * 
 * Tests for:
 * - Leave request creation
 * - Leave request approval/rejection
 * - Leave balance management
 * - Manager inbox
 * - HR inbox
 * - Work from home
 * - Leave type configuration
 */

// Mock services
const mockPrismaService = {
    leaveRequest: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
    },
    user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
    },
    leaveType: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
    },
    attendance: {
        create: jest.fn(),
        createMany: jest.fn(),
    },
    workFromHome: {
        create: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
    },
    notification: {
        create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
};

const mockNotificationsService = {
    createNotification: jest.fn(),
    notifyManager: jest.fn(),
    notifyHR: jest.fn(),
    notifyEmployee: jest.fn(),
};

const mockPermissionsService = {
    checkFeaturePermission: jest.fn(),
    getPermissions: jest.fn(),
    hasPermission: jest.fn(),
};

const mockSmartPolicyTriggerService = {
    triggerPolicies: jest.fn(),
};

const mockTimezoneService = {
    getNow: jest.fn(),
    toLocal: jest.fn(),
    toUTC: jest.fn(),
    startOfDay: jest.fn(),
    endOfDay: jest.fn(),
};

describe('LeavesService', () => {
    let service: LeavesService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LeavesService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: NotificationsService, useValue: mockNotificationsService },
                { provide: PermissionsService, useValue: mockPermissionsService },
                { provide: SmartPolicyTriggerService, useValue: mockSmartPolicyTriggerService },
                { provide: TimezoneService, useValue: mockTimezoneService },
            ],
        }).compile();

        service = module.get<LeavesService>(LeavesService);
        jest.clearAllMocks();

        // Default mock implementations
        mockTimezoneService.getNow.mockReturnValue(new Date('2026-01-11'));
        mockTimezoneService.startOfDay.mockImplementation((date) => {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            return d;
        });
        mockTimezoneService.endOfDay.mockImplementation((date) => {
            const d = new Date(date);
            d.setHours(23, 59, 59, 999);
            return d;
        });
    });

    describe('createLeaveRequest', () => {
        const userId = 'user-123';
        const companyId = 'company-123';
        const createLeaveDto = {
            leaveTypeId: 'leave-type-annual',
            startDate: new Date('2026-02-01'),
            endDate: new Date('2026-02-05'),
            reason: 'Family vacation',
        };

        const mockUser = {
            id: userId,
            companyId,
            managerId: 'manager-123',
            leaveBalance: 21,
            nameAr: 'أحمد محمد',
            nameEn: 'Ahmed Mohammed',
        };

        const mockLeaveType = {
            id: 'leave-type-annual',
            name: 'Annual Leave',
            nameAr: 'إجازة سنوية',
            maxDays: 30,
            requiresApproval: true,
        };

        beforeEach(() => {
            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
            mockPrismaService.leaveType.findUnique.mockResolvedValue(mockLeaveType);
            mockPrismaService.leaveRequest.findMany.mockResolvedValue([]); // No overlapping requests
        });

        it('should create leave request successfully', async () => {
            mockPrismaService.leaveRequest.create.mockResolvedValue({
                id: 'leave-req-123',
                ...createLeaveDto,
                userId,
                status: 'PENDING',
                days: 5,
            });

            const result = await service.createLeaveRequest(userId, companyId, createLeaveDto);

            expect(result).toHaveProperty('id');
            expect(result.status).toBe('PENDING');
            expect(mockPrismaService.leaveRequest.create).toHaveBeenCalled();
        });

        it('should throw error for insufficient leave balance', async () => {
            const longLeaveDto = {
                ...createLeaveDto,
                startDate: new Date('2026-02-01'),
                endDate: new Date('2026-03-15'), // 43 working days
            };

            await expect(service.createLeaveRequest(userId, companyId, longLeaveDto))
                .rejects.toThrow(BadRequestException);
        });

        it('should throw error for overlapping leave requests', async () => {
            mockPrismaService.leaveRequest.findMany.mockResolvedValue([
                {
                    id: 'existing-leave',
                    startDate: new Date('2026-02-03'),
                    endDate: new Date('2026-02-07'),
                    status: 'APPROVED',
                },
            ]);

            await expect(service.createLeaveRequest(userId, companyId, createLeaveDto))
                .rejects.toThrow(BadRequestException);
        });

        it('should throw error for past dates', async () => {
            const pastLeaveDto = {
                ...createLeaveDto,
                startDate: new Date('2025-12-01'),
                endDate: new Date('2025-12-05'),
            };

            await expect(service.createLeaveRequest(userId, companyId, pastLeaveDto))
                .rejects.toThrow(BadRequestException);
        });

        it('should throw error if end date is before start date', async () => {
            const invalidDto = {
                ...createLeaveDto,
                startDate: new Date('2026-02-10'),
                endDate: new Date('2026-02-05'),
            };

            await expect(service.createLeaveRequest(userId, companyId, invalidDto))
                .rejects.toThrow(BadRequestException);
        });

        it('should notify manager when leave request is created', async () => {
            mockPrismaService.leaveRequest.create.mockResolvedValue({
                id: 'leave-req-123',
                ...createLeaveDto,
                userId,
                status: 'PENDING',
            });

            await service.createLeaveRequest(userId, companyId, createLeaveDto);

            expect(mockNotificationsService.createNotification).toHaveBeenCalled();
        });
    });

    describe('getMyLeaveRequests', () => {
        it('should return paginated leave requests for user', async () => {
            const mockLeaveRequests = [
                { id: 'leave-1', status: 'APPROVED' },
                { id: 'leave-2', status: 'PENDING' },
            ];
            mockPrismaService.leaveRequest.findMany.mockResolvedValue(mockLeaveRequests);
            mockPrismaService.leaveRequest.count.mockResolvedValue(2);

            const result = await service.getMyLeaveRequests('user-123', 'company-123', {
                page: 1,
                limit: 10,
            });

            expect(result).toHaveProperty('data');
            expect(result.data).toHaveLength(2);
        });

        it('should filter by status', async () => {
            mockPrismaService.leaveRequest.findMany.mockResolvedValue([]);
            mockPrismaService.leaveRequest.count.mockResolvedValue(0);

            await service.getMyLeaveRequests('user-123', 'company-123', {
                status: 'PENDING',
            });

            expect(mockPrismaService.leaveRequest.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        status: 'PENDING',
                    }),
                })
            );
        });
    });

    describe('cancelLeaveRequest', () => {
        it('should cancel pending leave request', async () => {
            mockPrismaService.leaveRequest.findUnique.mockResolvedValue({
                id: 'leave-123',
                userId: 'user-123',
                status: 'PENDING',
            });
            mockPrismaService.leaveRequest.update.mockResolvedValue({
                id: 'leave-123',
                status: 'CANCELLED',
            });

            const result = await service.cancelLeaveRequest('leave-123', 'company-123', 'user-123');

            expect(result.status).toBe('CANCELLED');
        });

        it('should throw error when cancelling approved leave', async () => {
            mockPrismaService.leaveRequest.findUnique.mockResolvedValue({
                id: 'leave-123',
                userId: 'user-123',
                status: 'APPROVED',
            });

            await expect(service.cancelLeaveRequest('leave-123', 'company-123', 'user-123'))
                .rejects.toThrow(BadRequestException);
        });

        it('should throw error for non-owner cancellation', async () => {
            mockPrismaService.leaveRequest.findUnique.mockResolvedValue({
                id: 'leave-123',
                userId: 'user-123',
                status: 'PENDING',
            });

            await expect(service.cancelLeaveRequest('leave-123', 'company-123', 'other-user-456'))
                .rejects.toThrow(ForbiddenException);
        });

        it('should throw error for non-existent leave request', async () => {
            mockPrismaService.leaveRequest.findUnique.mockResolvedValue(null);

            await expect(service.cancelLeaveRequest('non-existent', 'company-123', 'user-123'))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('approveLeaveRequest', () => {
        const mockLeaveRequest = {
            id: 'leave-123',
            userId: 'user-123',
            status: 'PENDING',
            days: 5,
            leaveTypeId: 'annual',
            user: {
                id: 'user-123',
                nameAr: 'أحمد',
                managerId: 'manager-123',
            },
        };

        beforeEach(() => {
            mockPrismaService.leaveRequest.findUnique.mockResolvedValue(mockLeaveRequest);
        });

        it('should approve leave request successfully', async () => {
            mockPrismaService.leaveRequest.update.mockResolvedValue({
                ...mockLeaveRequest,
                status: 'APPROVED',
                approvedBy: 'manager-123',
                approvedAt: new Date(),
            });
            mockPrismaService.user.update.mockResolvedValue({});

            const result = await service.approveLeaveRequest('leave-123', 'company-123', 'manager-123');

            expect(result.status).toBe('APPROVED');
            expect(mockNotificationsService.createNotification).toHaveBeenCalled();
        });

        it('should deduct leave balance after approval', async () => {
            mockPrismaService.leaveRequest.update.mockResolvedValue({
                ...mockLeaveRequest,
                status: 'APPROVED',
            });
            mockPrismaService.user.update.mockResolvedValue({});

            await service.approveLeaveRequest('leave-123', 'company-123', 'manager-123');

            expect(mockPrismaService.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        leaveBalance: expect.objectContaining({
                            decrement: 5,
                        }),
                    }),
                })
            );
        });

        it('should throw error for already processed request', async () => {
            mockPrismaService.leaveRequest.findUnique.mockResolvedValue({
                ...mockLeaveRequest,
                status: 'APPROVED',
            });

            await expect(service.approveLeaveRequest('leave-123', 'company-123', 'manager-123'))
                .rejects.toThrow(BadRequestException);
        });
    });

    describe('rejectLeaveRequest', () => {
        const mockLeaveRequest = {
            id: 'leave-123',
            userId: 'user-123',
            status: 'PENDING',
            user: {
                id: 'user-123',
                nameAr: 'أحمد',
            },
        };

        it('should reject leave request successfully', async () => {
            mockPrismaService.leaveRequest.findUnique.mockResolvedValue(mockLeaveRequest);
            mockPrismaService.leaveRequest.update.mockResolvedValue({
                ...mockLeaveRequest,
                status: 'REJECTED',
                rejectedBy: 'manager-123',
                rejectionNotes: 'Not enough coverage',
            });

            const result = await service.rejectLeaveRequest(
                'leave-123',
                'company-123',
                'manager-123',
                'Not enough coverage'
            );

            expect(result.status).toBe('REJECTED');
        });

        it('should notify employee of rejection', async () => {
            mockPrismaService.leaveRequest.findUnique.mockResolvedValue(mockLeaveRequest);
            mockPrismaService.leaveRequest.update.mockResolvedValue({
                ...mockLeaveRequest,
                status: 'REJECTED',
            });

            await service.rejectLeaveRequest('leave-123', 'company-123', 'manager-123', 'Reason');

            expect(mockNotificationsService.createNotification).toHaveBeenCalled();
        });
    });

    describe('getManagerInbox', () => {
        it('should return pending requests for direct reports', async () => {
            const mockPendingRequests = [
                { id: 'leave-1', user: { nameAr: 'أحمد' } },
                { id: 'leave-2', user: { nameAr: 'محمد' } },
            ];
            mockPrismaService.user.findMany.mockResolvedValue([
                { id: 'emp-1', managerId: 'manager-123' },
                { id: 'emp-2', managerId: 'manager-123' },
            ]);
            mockPrismaService.leaveRequest.findMany.mockResolvedValue(mockPendingRequests);

            const result = await service.getManagerInbox('manager-123', 'company-123');

            expect(result).toHaveLength(2);
        });

        it('should return empty array if no direct reports', async () => {
            mockPrismaService.user.findMany.mockResolvedValue([]);
            mockPrismaService.leaveRequest.findMany.mockResolvedValue([]);

            const result = await service.getManagerInbox('manager-123', 'company-123');

            expect(result).toHaveLength(0);
        });
    });

    describe('getHRInbox', () => {
        it('should return manager-approved requests awaiting HR approval', async () => {
            const mockRequests = [
                { id: 'leave-1', status: 'MANAGER_APPROVED' },
                { id: 'leave-2', status: 'MANAGER_APPROVED' },
            ];
            mockPrismaService.leaveRequest.findMany.mockResolvedValue(mockRequests);

            const result = await service.getHRInbox('hr-user-123', 'company-123');

            expect(mockPrismaService.leaveRequest.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        status: 'MANAGER_APPROVED',
                    }),
                })
            );
        });
    });

    describe('enableWorkFromHome', () => {
        it('should enable work from home for a date', async () => {
            mockPrismaService.workFromHome.findFirst.mockResolvedValue(null);
            mockPrismaService.workFromHome.create.mockResolvedValue({
                id: 'wfh-123',
                userId: 'user-123',
                date: new Date('2026-01-15'),
                reason: 'Doctor appointment',
            });

            const result = await service.enableWorkFromHome(
                'user-123',
                'company-123',
                new Date('2026-01-15'),
                'Doctor appointment'
            );

            expect(result).toHaveProperty('id');
        });

        it('should throw error if WFH already enabled for date', async () => {
            mockPrismaService.workFromHome.findFirst.mockResolvedValue({
                id: 'existing-wfh',
                date: new Date('2026-01-15'),
            });

            await expect(service.enableWorkFromHome(
                'user-123',
                'company-123',
                new Date('2026-01-15')
            )).rejects.toThrow(BadRequestException);
        });
    });

    describe('disableWorkFromHome', () => {
        it('should disable work from home for a date', async () => {
            mockPrismaService.workFromHome.findFirst.mockResolvedValue({
                id: 'wfh-123',
                userId: 'user-123',
                date: new Date('2026-01-15'),
            });
            mockPrismaService.workFromHome.delete.mockResolvedValue({});

            const result = await service.disableWorkFromHome(
                'user-123',
                'company-123',
                new Date('2026-01-15')
            );

            expect(result).toHaveProperty('message');
        });

        it('should throw error if WFH not found', async () => {
            mockPrismaService.workFromHome.findFirst.mockResolvedValue(null);

            await expect(service.disableWorkFromHome(
                'user-123',
                'company-123',
                new Date('2026-01-15')
            )).rejects.toThrow(NotFoundException);
        });
    });

    describe('getLeaveTypeName', () => {
        it('should return Arabic name for annual leave', () => {
            const result = service['getLeaveTypeName']('ANNUAL');
            expect(result).toBe('إجازة سنوية');
        });

        it('should return Arabic name for sick leave', () => {
            const result = service['getLeaveTypeName']('SICK');
            expect(result).toBe('إجازة مرضية');
        });

        it('should return Arabic name for emergency leave', () => {
            const result = service['getLeaveTypeName']('EMERGENCY');
            expect(result).toBe('إجازة طارئة');
        });

        it('should return Arabic name for unpaid leave', () => {
            const result = service['getLeaveTypeName']('UNPAID');
            expect(result).toBe('إجازة بدون راتب');
        });

        it('should return default name for unknown type', () => {
            const result = service['getLeaveTypeName']('UNKNOWN');
            expect(result).toBe('إجازة');
        });
    });
});
