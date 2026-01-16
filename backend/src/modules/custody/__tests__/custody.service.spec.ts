import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CustodyService } from '../custody.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { SmartPolicyTriggerService } from '../../smart-policies/smart-policy-trigger.service';

/**
 * 🧪 Custody Service Unit Tests
 * 
 * Tests for:
 * - Category management
 * - Item CRUD
 * - Assignment workflow
 * - Return requests
 * - Transfers
 * - Maintenance tracking
 */

const mockPrismaService = {
    custodyCategory: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    custodyItem: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
    },
    custodyAssignment: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
    },
    custodyTransfer: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
    },
    custodyMaintenance: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
    },
    user: {
        findUnique: jest.fn(),
    },
    auditLog: {
        create: jest.fn(),
    },
};

const mockNotificationsService = {
    sendNotification: jest.fn(),
    create: jest.fn(),
};

const mockSmartPolicyTrigger = {
    triggerPolicies: jest.fn(),
};

describe('CustodyService', () => {
    let service: CustodyService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CustodyService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: NotificationsService, useValue: mockNotificationsService },
                { provide: SmartPolicyTriggerService, useValue: mockSmartPolicyTrigger },
            ],
        }).compile();

        service = module.get<CustodyService>(CustodyService);
        jest.clearAllMocks();
    });

    describe('Categories', () => {
        describe('createCategory', () => {
            it('should create custody category', async () => {
                mockPrismaService.custodyCategory.create.mockResolvedValue({
                    id: 'cat-123',
                    name: 'أجهزة إلكترونية',
                });

                const result = await service.createCategory('company-123', 'user-123', {
                    name: 'أجهزة إلكترونية',
                    description: 'جميع الأجهزة الإلكترونية',
                });

                expect(result.id).toBe('cat-123');
            });
        });

        describe('getCategories', () => {
            it('should return all categories with item counts', async () => {
                mockPrismaService.custodyCategory.findMany.mockResolvedValue([
                    { id: 'cat-1', name: 'لابتوب', _count: { items: 10 } },
                    { id: 'cat-2', name: 'هواتف', _count: { items: 5 } },
                ]);

                const result = await service.getCategories('company-123');

                expect(result).toHaveLength(2);
            });
        });

        describe('deleteCategory', () => {
            it('should delete empty category', async () => {
                mockPrismaService.custodyCategory.findUnique.mockResolvedValue({
                    id: 'cat-123',
                    _count: { items: 0 },
                });
                mockPrismaService.custodyCategory.delete.mockResolvedValue({});

                await service.deleteCategory('company-123', 'cat-123', 'user-123');

                expect(mockPrismaService.custodyCategory.delete).toHaveBeenCalled();
            });

            it('should throw error for category with items', async () => {
                mockPrismaService.custodyCategory.findUnique.mockResolvedValue({
                    id: 'cat-123',
                    _count: { items: 5 },
                });

                await expect(service.deleteCategory('company-123', 'cat-123', 'user-123'))
                    .rejects.toThrow(BadRequestException);
            });
        });
    });

    describe('Items', () => {
        describe('createItem', () => {
            it('should create custody item with QR code', async () => {
                mockPrismaService.custodyItem.create.mockResolvedValue({
                    id: 'item-123',
                    code: 'CUST-001',
                    name: 'MacBook Pro',
                });

                const result = await service.createItem('company-123', 'user-123', {
                    name: 'MacBook Pro',
                    categoryId: 'cat-123',
                    serialNumber: 'SN123456',
                    purchaseValue: 5000,
                });

                expect(result.id).toBe('item-123');
            });
        });

        describe('getItems', () => {
            it('should return paginated items', async () => {
                mockPrismaService.custodyItem.findMany.mockResolvedValue([
                    { id: 'i1', name: 'لابتوب' },
                ]);
                mockPrismaService.custodyItem.count.mockResolvedValue(50);

                const result = await service.getItems('company-123', { page: 1, limit: 10 });

                expect(result.items).toHaveLength(1);
                expect(result.total).toBe(50);
            });

            it('should filter by status', async () => {
                mockPrismaService.custodyItem.findMany.mockResolvedValue([]);
                mockPrismaService.custodyItem.count.mockResolvedValue(0);

                await service.getItems('company-123', { status: 'ASSIGNED' });

                expect(mockPrismaService.custodyItem.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: expect.objectContaining({ status: 'ASSIGNED' }),
                    })
                );
            });
        });

        describe('getItemById', () => {
            it('should return item with assignment history', async () => {
                mockPrismaService.custodyItem.findFirst.mockResolvedValue({
                    id: 'item-123',
                    assignments: [],
                    maintenances: [],
                });

                const result = await service.getItemById('company-123', 'item-123');

                expect(result).toHaveProperty('assignments');
            });

            it('should throw NotFoundException', async () => {
                mockPrismaService.custodyItem.findFirst.mockResolvedValue(null);

                await expect(service.getItemById('company-123', 'non-existent'))
                    .rejects.toThrow(NotFoundException);
            });
        });
    });

    describe('Assignment Workflow', () => {
        describe('assignCustody', () => {
            it('should create pending assignment', async () => {
                mockPrismaService.custodyItem.findFirst.mockResolvedValue({
                    id: 'item-123',
                    status: 'AVAILABLE',
                });
                mockPrismaService.custodyAssignment.create.mockResolvedValue({
                    id: 'assign-123',
                    status: 'PENDING',
                });
                mockPrismaService.custodyItem.update.mockResolvedValue({});

                const result = await service.assignCustody('company-123', 'hr-123', {
                    itemId: 'item-123',
                    employeeId: 'emp-123',
                    notes: 'للعمل',
                });

                expect(result.status).toBe('PENDING');
            });

            it('should throw error for unavailable item', async () => {
                mockPrismaService.custodyItem.findFirst.mockResolvedValue({
                    id: 'item-123',
                    status: 'ASSIGNED', // Already assigned
                });

                await expect(service.assignCustody('company-123', 'hr-123', {
                    itemId: 'item-123',
                    employeeId: 'emp-123',
                })).rejects.toThrow(BadRequestException);
            });
        });

        describe('approveAssignment', () => {
            it('should approve and activate assignment', async () => {
                mockPrismaService.custodyAssignment.findFirst.mockResolvedValue({
                    id: 'assign-123',
                    status: 'PENDING',
                    itemId: 'item-123',
                });
                mockPrismaService.custodyAssignment.update.mockResolvedValue({
                    status: 'ACTIVE',
                });
                mockPrismaService.custodyItem.update.mockResolvedValue({});

                await service.approveAssignment('company-123', 'manager-123', {
                    assignmentId: 'assign-123',
                });

                expect(mockPrismaService.custodyAssignment.update).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: expect.objectContaining({ status: 'ACTIVE' }),
                    })
                );
            });
        });

        describe('signAssignment', () => {
            it('should record employee signature', async () => {
                mockPrismaService.custodyAssignment.findFirst.mockResolvedValue({
                    id: 'assign-123',
                    employeeId: 'emp-123',
                    status: 'ACTIVE',
                });
                mockPrismaService.custodyAssignment.update.mockResolvedValue({
                    signedAt: expect.any(Date),
                });

                await service.signAssignment('company-123', 'emp-123', {
                    assignmentId: 'assign-123',
                    signatureData: 'base64-signature',
                });

                expect(mockPrismaService.custodyAssignment.update).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: expect.objectContaining({
                            signedAt: expect.any(Date),
                        }),
                    })
                );
            });
        });
    });

    describe('Return Workflow', () => {
        describe('requestReturn', () => {
            it('should create return request', async () => {
                mockPrismaService.custodyAssignment.findFirst.mockResolvedValue({
                    id: 'assign-123',
                    employeeId: 'emp-123',
                    status: 'ACTIVE',
                });
                mockPrismaService.custodyAssignment.update.mockResolvedValue({
                    status: 'RETURN_REQUESTED',
                });

                await service.requestReturn('company-123', 'emp-123', {
                    assignmentId: 'assign-123',
                    returnReason: 'انتهاء المشروع',
                });

                expect(mockPrismaService.custodyAssignment.update).toHaveBeenCalled();
            });
        });

        describe('reviewReturn', () => {
            it('should approve return and free item', async () => {
                mockPrismaService.custodyAssignment.findFirst.mockResolvedValue({
                    id: 'assign-123',
                    itemId: 'item-123',
                    status: 'RETURN_REQUESTED',
                });
                mockPrismaService.custodyAssignment.update.mockResolvedValue({
                    status: 'RETURNED',
                });
                mockPrismaService.custodyItem.update.mockResolvedValue({
                    status: 'AVAILABLE',
                });

                await service.reviewReturn('company-123', 'hr-123', {
                    assignmentId: 'assign-123',
                    approved: true,
                    condition: 'GOOD',
                });

                expect(mockPrismaService.custodyItem.update).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: expect.objectContaining({ status: 'AVAILABLE' }),
                    })
                );
            });
        });
    });

    describe('Transfer Workflow', () => {
        describe('requestTransfer', () => {
            it('should create transfer request', async () => {
                mockPrismaService.custodyAssignment.findFirst.mockResolvedValue({
                    id: 'assign-123',
                    employeeId: 'emp-123',
                    itemId: 'item-123',
                });
                mockPrismaService.custodyTransfer.create.mockResolvedValue({
                    id: 'transfer-123',
                    status: 'PENDING',
                });

                const result = await service.requestTransfer('company-123',
                    { id: 'emp-123', role: 'EMPLOYEE' } as any, {
                    assignmentId: 'assign-123',
                    toEmployeeId: 'emp-456',
                    reason: 'انتقل لمشروع آخر',
                });

                expect(result.status).toBe('PENDING');
            });
        });

        describe('approveTransfer', () => {
            it('should complete transfer', async () => {
                mockPrismaService.custodyTransfer.findFirst.mockResolvedValue({
                    id: 'transfer-123',
                    status: 'PENDING',
                    assignment: { id: 'assign-123', itemId: 'item-123' },
                    toEmployeeId: 'emp-456',
                });
                mockPrismaService.custodyTransfer.update.mockResolvedValue({});
                mockPrismaService.custodyAssignment.update.mockResolvedValue({});
                mockPrismaService.custodyAssignment.create.mockResolvedValue({});

                await service.approveTransfer('company-123', 'manager-123', {
                    transferId: 'transfer-123',
                });

                expect(mockPrismaService.custodyAssignment.create).toHaveBeenCalled();
            });
        });
    });

    describe('Maintenance', () => {
        describe('createMaintenance', () => {
            it('should create maintenance record', async () => {
                mockPrismaService.custodyItem.findFirst.mockResolvedValue({
                    id: 'item-123',
                });
                mockPrismaService.custodyMaintenance.create.mockResolvedValue({
                    id: 'maint-123',
                    type: 'REPAIR',
                });
                mockPrismaService.custodyItem.update.mockResolvedValue({});

                const result = await service.createMaintenance('company-123', 'user-123', {
                    itemId: 'item-123',
                    type: 'REPAIR',
                    description: 'إصلاح الشاشة',
                    estimatedCost: 500,
                });

                expect(result.type).toBe('REPAIR');
            });
        });

        describe('updateMaintenance', () => {
            it('should complete maintenance and restore item', async () => {
                mockPrismaService.custodyMaintenance.findFirst = jest.fn().mockResolvedValue({
                    id: 'maint-123',
                    itemId: 'item-123',
                    status: 'IN_PROGRESS',
                });
                mockPrismaService.custodyMaintenance.update.mockResolvedValue({
                    status: 'COMPLETED',
                });
                mockPrismaService.custodyItem.update.mockResolvedValue({});

                await service.updateMaintenance('company-123', 'maint-123', 'user-123', {
                    status: 'COMPLETED',
                    actualCost: 450,
                });

                expect(mockPrismaService.custodyItem.update).toHaveBeenCalled();
            });
        });
    });

    describe('Dashboard', () => {
        describe('getDashboard', () => {
            it('should return custody statistics', async () => {
                mockPrismaService.custodyItem.count
                    .mockResolvedValueOnce(100) // Total
                    .mockResolvedValueOnce(60)  // Assigned
                    .mockResolvedValueOnce(30)  // Available
                    .mockResolvedValueOnce(10); // Maintenance

                const result = await service.getDashboard('company-123');

                expect(result).toHaveProperty('totalItems');
                expect(result).toHaveProperty('assignedItems');
                expect(result).toHaveProperty('availableItems');
            });
        });
    });

    describe('QR Code', () => {
        describe('generateQRCode', () => {
            it('should generate QR code for item', async () => {
                mockPrismaService.custodyItem.findFirst.mockResolvedValue({
                    id: 'item-123',
                    code: 'CUST-001',
                });

                const result = await service.generateQRCode('company-123', 'CUST-001');

                expect(result).toBeDefined();
            });
        });
    });
});
