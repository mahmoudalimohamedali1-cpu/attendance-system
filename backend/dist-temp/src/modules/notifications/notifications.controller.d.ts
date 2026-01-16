import { NotificationsService } from './notifications.service';
import { SmartNotificationService } from './smart-notification.service';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
export declare class NotificationsController {
    private readonly notificationsService;
    private readonly smartNotificationService;
    constructor(notificationsService: NotificationsService, smartNotificationService: SmartNotificationService);
    getNotifications(userId: string, companyId: string, unreadOnly?: string, page?: string, limit?: string): Promise<{
        items: {
            id: string;
            createdAt: Date;
            companyId: string | null;
            type: import(".prisma/client").$Enums.NotificationType;
            data: import("@prisma/client/runtime/library").JsonValue | null;
            userId: string;
            title: string;
            titleEn: string | null;
            body: string;
            bodyEn: string | null;
            entityType: string | null;
            entityId: string | null;
            isRead: boolean;
            readAt: Date | null;
        }[];
        total: number;
    }>;
    getUnreadCount(userId: string, companyId: string): Promise<{
        count: number;
    }>;
    markAsRead(id: string, userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    markAllAsRead(userId: string, companyId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    deleteNotification(id: string, userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    broadcastNotification(dto: BroadcastNotificationDto): Promise<import(".prisma/client").Prisma.BatchPayload | undefined>;
    triggerReminders(): Promise<{
        message: string;
    }>;
}
