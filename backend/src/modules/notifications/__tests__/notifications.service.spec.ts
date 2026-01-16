import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../notifications.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { NotificationType } from '@prisma/client';

/**
 * 🧪 Notifications Service Unit Tests
 * 
 * Tests for:
 * - Creating notifications
 * - Bulk notification creation
 * - Getting user notifications
 * - Marking as read
 * - Unread count
 * - Broadcast notifications
 * - Disciplinary notification helpers
 */

const mockPrismaService = {
    notification: {
        create: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
    },
    user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
    },
};

describe('NotificationsService', () => {
    let service: NotificationsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationsService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<NotificationsService>(NotificationsService);
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create a notification', async () => {
            const dto = {
                companyId: 'company-123',
                userId: 'user-123',
                type: 'GENERAL' as NotificationType,
                title: 'إشعار جديد',
                body: 'محتوى الإشعار',
            };

            mockPrismaService.notification.create.mockResolvedValue({
                id: 'notif-123',
                ...dto,
                isRead: false,
                createdAt: new Date(),
            });

            const result = await service.create(dto);

            expect(result.id).toBe('notif-123');
            expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    companyId: dto.companyId,
                    userId: dto.userId,
                    title: dto.title,
                }),
            });
        });

        it('should include optional English title and body', async () => {
            const dto = {
                companyId: 'company-123',
                userId: 'user-123',
                type: 'GENERAL' as NotificationType,
                title: 'إشعار',
                titleEn: 'Notification',
                body: 'محتوى',
                bodyEn: 'Content',
            };

            mockPrismaService.notification.create.mockResolvedValue({ id: 'notif-123', ...dto });

            await service.create(dto);

            expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    titleEn: 'Notification',
                    bodyEn: 'Content',
                }),
            });
        });
    });

    describe('createMany', () => {
        it('should create notifications for multiple users', async () => {
            const userIds = ['user-1', 'user-2', 'user-3'];
            mockPrismaService.notification.createMany.mockResolvedValue({ count: 3 });

            const result = await service.createMany(
                'company-123',
                userIds,
                'GENERAL' as NotificationType,
                'إشعار جماعي',
                'محتوى الإشعار'
            );

            expect(result.count).toBe(3);
            expect(mockPrismaService.notification.createMany).toHaveBeenCalledWith({
                data: expect.arrayContaining([
                    expect.objectContaining({ userId: 'user-1' }),
                    expect.objectContaining({ userId: 'user-2' }),
                    expect.objectContaining({ userId: 'user-3' }),
                ]),
            });
        });

        it('should include entity type and ID when provided', async () => {
            mockPrismaService.notification.createMany.mockResolvedValue({ count: 1 });

            await service.createMany(
                'company-123',
                ['user-1'],
                'LEAVE_REQUEST' as NotificationType,
                'طلب إجازة',
                'تم تقديم طلب إجازة',
                'LEAVE_REQUEST',
                'leave-123'
            );

            expect(mockPrismaService.notification.createMany).toHaveBeenCalledWith({
                data: expect.arrayContaining([
                    expect.objectContaining({
                        entityType: 'LEAVE_REQUEST',
                        entityId: 'leave-123',
                    }),
                ]),
            });
        });
    });

    describe('getForUser', () => {
        it('should return paginated notifications', async () => {
            const mockNotifications = [
                { id: 'notif-1', title: 'إشعار 1' },
                { id: 'notif-2', title: 'إشعار 2' },
            ];
            mockPrismaService.notification.findMany.mockResolvedValue(mockNotifications);
            mockPrismaService.notification.count.mockResolvedValue(10);

            const result = await service.getForUser('user-123', 'company-123', {
                limit: 2,
                offset: 0,
            });

            expect(result.items).toHaveLength(2);
            expect(result.total).toBe(10);
        });

        it('should filter unread only when specified', async () => {
            mockPrismaService.notification.findMany.mockResolvedValue([]);
            mockPrismaService.notification.count.mockResolvedValue(0);

            await service.getForUser('user-123', 'company-123', { unreadOnly: true });

            expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        isRead: false,
                    }),
                })
            );
        });
    });

    describe('getUnreadCount', () => {
        it('should return count of unread notifications', async () => {
            mockPrismaService.notification.count.mockResolvedValue(5);
            mockPrismaService.user.findUnique.mockResolvedValue({ companyId: 'company-123' });

            const count = await service.getUnreadCount('user-123');

            expect(count).toBe(5);
            expect(mockPrismaService.notification.count).toHaveBeenCalledWith({
                where: expect.objectContaining({
                    userId: 'user-123',
                    isRead: false,
                }),
            });
        });

        it('should use provided companyId', async () => {
            mockPrismaService.notification.count.mockResolvedValue(3);

            const count = await service.getUnreadCount('user-123', 'company-456');

            expect(count).toBe(3);
            expect(mockPrismaService.notification.count).toHaveBeenCalledWith({
                where: expect.objectContaining({
                    companyId: 'company-456',
                }),
            });
        });
    });

    describe('markAsRead', () => {
        it('should mark notification as read', async () => {
            mockPrismaService.notification.updateMany.mockResolvedValue({ count: 1 });

            await service.markAsRead('notif-123', 'user-123');

            expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
                where: { id: 'notif-123', userId: 'user-123' },
                data: expect.objectContaining({
                    isRead: true,
                    readAt: expect.any(Date),
                }),
            });
        });
    });

    describe('markAllAsRead', () => {
        it('should mark all unread notifications as read', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue({ companyId: 'company-123' });
            mockPrismaService.notification.updateMany.mockResolvedValue({ count: 5 });

            await service.markAllAsRead('user-123');

            expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
                where: expect.objectContaining({
                    userId: 'user-123',
                    isRead: false,
                }),
                data: expect.objectContaining({
                    isRead: true,
                }),
            });
        });
    });

    describe('deleteNotification', () => {
        it('should delete notification', async () => {
            mockPrismaService.notification.deleteMany.mockResolvedValue({ count: 1 });

            await service.deleteNotification('notif-123', 'user-123');

            expect(mockPrismaService.notification.deleteMany).toHaveBeenCalledWith({
                where: { id: 'notif-123', userId: 'user-123' },
            });
        });
    });

    describe('broadcastNotification', () => {
        it('should create notifications for all specified users', async () => {
            const userIds = ['user-1', 'user-2'];
            mockPrismaService.user.findFirst.mockResolvedValue({ companyId: 'company-123' });
            mockPrismaService.notification.createMany.mockResolvedValue({ count: 2 });

            await service.broadcastNotification(
                'GENERAL' as NotificationType,
                'إعلان هام',
                'محتوى الإعلان',
                userIds
            );

            expect(mockPrismaService.notification.createMany).toHaveBeenCalled();
        });

        it('should do nothing if userIds is empty', async () => {
            const result = await service.broadcastNotification(
                'GENERAL' as NotificationType,
                'إعلان',
                'محتوى',
                []
            );

            expect(result).toBeUndefined();
            expect(mockPrismaService.notification.createMany).not.toHaveBeenCalled();
        });
    });

    describe('sendNotification', () => {
        it('should create notification for user', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue({ companyId: 'company-123' });
            mockPrismaService.notification.create.mockResolvedValue({ id: 'notif-123' });

            await service.sendNotification(
                'user-123',
                'GENERAL' as NotificationType,
                'عنوان',
                'محتوى'
            );

            expect(mockPrismaService.notification.create).toHaveBeenCalled();
        });

        it('should not create notification if user not found', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(null);

            const result = await service.sendNotification(
                'non-existent',
                'GENERAL' as NotificationType,
                'عنوان',
                'محتوى'
            );

            expect(result).toBeUndefined();
            expect(mockPrismaService.notification.create).not.toHaveBeenCalled();
        });
    });

    describe('Disciplinary Notifications', () => {
        describe('notifyHRCaseSubmitted', () => {
            it('should notify all HR users about new case', async () => {
                mockPrismaService.user.findMany.mockResolvedValue([
                    { id: 'hr-1' },
                    { id: 'hr-2' },
                ]);
                mockPrismaService.notification.createMany.mockResolvedValue({ count: 2 });

                await service.notifyHRCaseSubmitted(
                    'company-123',
                    'case-123',
                    'DC-001',
                    'أحمد محمد'
                );

                expect(mockPrismaService.notification.createMany).toHaveBeenCalledWith({
                    data: expect.arrayContaining([
                        expect.objectContaining({
                            type: 'DISC_CASE_SUBMITTED',
                            entityType: 'DISCIPLINARY_CASE',
                            entityId: 'case-123',
                        }),
                    ]),
                });
            });

            it('should do nothing if no HR users found', async () => {
                mockPrismaService.user.findMany.mockResolvedValue([]);

                const result = await service.notifyHRCaseSubmitted(
                    'company-123',
                    'case-123',
                    'DC-001',
                    'أحمد'
                );

                expect(result).toBeUndefined();
            });
        });

        describe('notifyEmployeeDecisionIssued', () => {
            it('should notify employee about decision', async () => {
                mockPrismaService.notification.create.mockResolvedValue({ id: 'notif-123' });

                await service.notifyEmployeeDecisionIssued(
                    'company-123',
                    'emp-123',
                    'case-123',
                    'DC-001',
                    5
                );

                expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
                    data: expect.objectContaining({
                        userId: 'emp-123',
                        type: 'DISC_DECISION_ISSUED',
                    }),
                });
            });
        });

        describe('notifyEmployeeHearingScheduled', () => {
            it('should notify employee about hearing', async () => {
                mockPrismaService.notification.create.mockResolvedValue({ id: 'notif-123' });

                await service.notifyEmployeeHearingScheduled(
                    'company-123',
                    'emp-123',
                    'case-123',
                    'DC-001',
                    new Date('2026-01-20T10:00:00'),
                    'قاعة الاجتماعات الرئيسية'
                );

                expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
                    data: expect.objectContaining({
                        type: 'DISC_HEARING_SCHEDULED',
                        data: expect.objectContaining({
                            hearingLocation: 'قاعة الاجتماعات الرئيسية',
                        }),
                    }),
                });
            });
        });

        describe('notifyCaseFinalized', () => {
            it('should notify both employee and manager', async () => {
                mockPrismaService.notification.createMany.mockResolvedValue({ count: 2 });

                await service.notifyCaseFinalized(
                    'company-123',
                    'emp-123',
                    'manager-123',
                    'case-123',
                    'DC-001',
                    'إنذار كتابي'
                );

                expect(mockPrismaService.notification.createMany).toHaveBeenCalledWith({
                    data: expect.arrayContaining([
                        expect.objectContaining({ userId: 'emp-123' }),
                        expect.objectContaining({ userId: 'manager-123' }),
                    ]),
                });
            });
        });
    });
});
