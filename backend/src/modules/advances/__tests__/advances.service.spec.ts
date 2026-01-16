import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { AdvancesService } from '../advances.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { PermissionsService } from '../../permissions/permissions.service';
import { ApprovalWorkflowService } from '../../smart-policies/approval-workflow.service';

/**
 * 🧪 Advances Service Unit Tests
 * 
 * Tests for:
 * - Advance request creation
 * - Multi-level approval workflow
 * - Manager, HR, Finance, CEO inboxes
 * - Request lifecycle
 */

const mockPrismaService = {
    advanceRequest: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
    },
    user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
    },
    approvalWorkflow: {
        findFirst: jest.fn(),
    },
};

const mockNotificationsService = {
    sendNotification: jest.fn(),
    create: jest.fn(),
};

const mockPermissionsService = {
    getAccessibleEmployeeIds: jest.fn(),
    hasPermission: jest.fn(),
};

const mockApprovalWorkflowService = {
    getWorkflowForRequestType: jest.fn(),
    startWorkflow: jest.fn(),
};

describe('AdvancesService', () => {
    let service: AdvancesService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AdvancesService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: NotificationsService, useValue: mockNotificationsService },
                { provide: PermissionsService, useValue: mockPermissionsService },
                { provide: ApprovalWorkflowService, useValue: mockApprovalWorkflowService },
            ],
        }).compile();

        service = module.get<AdvancesService>(AdvancesService);
        jest.clearAllMocks();
    });

    describe('createAdvanceRequest', () => {
        const createDto = {
            amount: 5000,
            reason: 'ظروف عائلية طارئة',
            repaymentMonths: 3,
        };

        beforeEach(() => {
            mockPrismaService.user.findUnique.mockResolvedValue({
                id: 'emp-123',
                managerId: 'manager-123',
                salary: 10000,
            });
            mockApprovalWorkflowService.getWorkflowForRequestType.mockResolvedValue({
                steps: [{ step: 'MANAGER' }, { step: 'HR' }],
            });
        });

        it('should create advance request', async () => {
            mockPrismaService.advanceRequest.create.mockResolvedValue({
                id: 'adv-123',
                ...createDto,
                status: 'PENDING',
            });

            const result = await service.createAdvanceRequest('emp-123', 'company-123', createDto);

            expect(result.id).toBe('adv-123');
        });

        it('should notify manager about pending request', async () => {
            mockPrismaService.advanceRequest.create.mockResolvedValue({
                id: 'adv-123',
                status: 'PENDING',
            });

            await service.createAdvanceRequest('emp-123', 'company-123', createDto);

            expect(mockNotificationsService.sendNotification).toHaveBeenCalled();
        });
    });

    describe('getManagerInbox', () => {
        it('should return pending requests for manager subordinates', async () => {
            mockPermissionsService.getAccessibleEmployeeIds.mockResolvedValue(['emp-1', 'emp-2']);
            mockPrismaService.advanceRequest.findMany.mockResolvedValue([
                { id: 'adv-1', employeeId: 'emp-1', amount: 5000 },
            ]);

            const result = await service.getManagerInbox('manager-123', 'company-123');

            expect(result).toHaveLength(1);
            expect(mockPrismaService.advanceRequest.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        currentApprovalStep: 'MANAGER',
                    }),
                })
            );
        });
    });

    describe('managerDecision', () => {
        beforeEach(() => {
            mockPrismaService.advanceRequest.findFirst.mockResolvedValue({
                id: 'adv-123',
                employeeId: 'emp-123',
                currentApprovalStep: 'MANAGER',
                amount: 5000,
                employee: { managerId: 'manager-123' },
            });
        });

        it('should approve and move to HR step', async () => {
            mockPrismaService.advanceRequest.update.mockResolvedValue({
                currentApprovalStep: 'HR',
            });

            await service.managerDecision('adv-123', 'company-123', 'manager-123', {
                decision: 'APPROVED',
                notes: 'موافق',
            });

            expect(mockPrismaService.advanceRequest.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        currentApprovalStep: 'HR',
                    }),
                })
            );
        });

        it('should reject request', async () => {
            mockPrismaService.advanceRequest.update.mockResolvedValue({
                status: 'REJECTED',
            });

            await service.managerDecision('adv-123', 'company-123', 'manager-123', {
                decision: 'REJECTED',
                notes: 'غير مبرر',
            });

            expect(mockPrismaService.advanceRequest.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        status: 'REJECTED',
                    }),
                })
            );
        });
    });

    describe('getHRInbox', () => {
        it('should return requests pending HR approval', async () => {
            mockPermissionsService.hasPermission.mockResolvedValue(true);
            mockPrismaService.advanceRequest.findMany.mockResolvedValue([]);

            await service.getHRInbox('hr-123', 'company-123');

            expect(mockPrismaService.advanceRequest.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        currentApprovalStep: 'HR',
                    }),
                })
            );
        });
    });

    describe('hrDecision', () => {
        beforeEach(() => {
            mockPrismaService.advanceRequest.findFirst.mockResolvedValue({
                id: 'adv-123',
                currentApprovalStep: 'HR',
                amount: 5000,
            });
        });

        it('should approve request', async () => {
            mockPrismaService.advanceRequest.update.mockResolvedValue({
                status: 'APPROVED',
            });

            await service.hrDecision('adv-123', 'company-123', 'hr-123', {
                decision: 'APPROVED',
                approvedAmount: 5000,
            });

            expect(mockPrismaService.advanceRequest.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        approvedAmount: 5000,
                    }),
                })
            );
        });

        it('should approve partial amount', async () => {
            mockPrismaService.advanceRequest.update.mockResolvedValue({
                approvedAmount: 3000,
            });

            await service.hrDecision('adv-123', 'company-123', 'hr-123', {
                decision: 'APPROVED',
                approvedAmount: 3000,
            });

            expect(mockPrismaService.advanceRequest.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        approvedAmount: 3000,
                    }),
                })
            );
        });
    });

    describe('getFinanceInbox', () => {
        it('should return requests pending finance approval', async () => {
            mockPermissionsService.hasPermission.mockResolvedValue(true);
            mockPrismaService.advanceRequest.findMany.mockResolvedValue([]);

            await service.getFinanceInbox('finance-123', 'company-123');

            expect(mockPrismaService.advanceRequest.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        currentApprovalStep: 'FINANCE',
                    }),
                })
            );
        });
    });

    describe('financeDecision', () => {
        beforeEach(() => {
            mockPrismaService.advanceRequest.findFirst.mockResolvedValue({
                id: 'adv-123',
                currentApprovalStep: 'FINANCE',
            });
        });

        it('should approve and finalize for small amounts', async () => {
            mockPrismaService.advanceRequest.update.mockResolvedValue({
                status: 'APPROVED',
            });

            await service.financeDecision('adv-123', 'company-123', 'finance-123', {
                decision: 'APPROVED',
            });

            expect(mockPrismaService.advanceRequest.update).toHaveBeenCalled();
        });

        it('should delay request', async () => {
            mockPrismaService.advanceRequest.update.mockResolvedValue({
                status: 'DELAYED',
            });

            await service.financeDecision('adv-123', 'company-123', 'finance-123', {
                decision: 'DELAYED',
                notes: 'سيتم التحويل الشهر القادم',
            });

            expect(mockPrismaService.advanceRequest.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        status: 'DELAYED',
                    }),
                })
            );
        });
    });

    describe('getMyRequests', () => {
        it('should return user own requests', async () => {
            mockPrismaService.advanceRequest.findMany.mockResolvedValue([
                { id: 'adv-1', amount: 5000, status: 'APPROVED' },
                { id: 'adv-2', amount: 3000, status: 'PENDING' },
            ]);

            const result = await service.getMyRequests('emp-123', 'company-123');

            expect(result).toHaveLength(2);
        });
    });

    describe('getRequestDetails', () => {
        it('should return full request details', async () => {
            mockPrismaService.advanceRequest.findFirst.mockResolvedValue({
                id: 'adv-123',
                employee: { nameAr: 'أحمد' },
                approvalHistory: [],
            });

            const result = await service.getRequestDetails('adv-123', 'company-123');

            expect(result).toHaveProperty('employee');
        });

        it('should throw NotFoundException for non-existent request', async () => {
            mockPrismaService.advanceRequest.findFirst.mockResolvedValue(null);

            await expect(service.getRequestDetails('non-existent', 'company-123'))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('getEmployeePreviousAdvances', () => {
        it('should return employee advance history', async () => {
            mockPrismaService.advanceRequest.findMany.mockResolvedValue([
                { id: 'adv-1', status: 'APPROVED', amount: 5000 },
            ]);

            const result = await service.getEmployeePreviousAdvances('emp-123', 'company-123');

            expect(result).toHaveLength(1);
        });
    });
});
