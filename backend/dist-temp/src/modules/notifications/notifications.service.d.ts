import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationType, Prisma } from '@prisma/client';
interface CreateNotificationDto {
    companyId: string;
    userId: string;
    type: NotificationType;
    title: string;
    titleEn?: string;
    body: string;
    bodyEn?: string;
    entityType?: string;
    entityId?: string;
    data?: any;
}
export declare class NotificationsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateNotificationDto): Promise<{
        id: string;
        createdAt: Date;
        companyId: string | null;
        type: import(".prisma/client").$Enums.NotificationType;
        data: Prisma.JsonValue | null;
        userId: string;
        title: string;
        titleEn: string | null;
        body: string;
        bodyEn: string | null;
        entityType: string | null;
        entityId: string | null;
        isRead: boolean;
        readAt: Date | null;
    }>;
    createMany(companyId: string, userIds: string[], type: NotificationType, title: string, body: string, entityType?: string, entityId?: string, data?: any): Promise<Prisma.BatchPayload>;
    getForUser(userId: string, companyId: string, options?: {
        unreadOnly?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<{
        items: {
            id: string;
            createdAt: Date;
            companyId: string | null;
            type: import(".prisma/client").$Enums.NotificationType;
            data: Prisma.JsonValue | null;
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
    getUnreadCount(userId: string, companyId?: string): Promise<number>;
    markAsRead(id: string, userId: string): Promise<Prisma.BatchPayload>;
    markAllAsRead(userId: string, companyId?: string): Promise<Prisma.BatchPayload>;
    getNotifications(userId: string, page?: number, limit?: number): Promise<{
        items: {
            id: string;
            createdAt: Date;
            companyId: string | null;
            type: import(".prisma/client").$Enums.NotificationType;
            data: Prisma.JsonValue | null;
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
    deleteNotification(id: string, userId: string): Promise<Prisma.BatchPayload>;
    broadcastNotification(type: NotificationType, title: string, body: string, userIds?: string[], data?: any): Promise<Prisma.BatchPayload | undefined>;
    sendNotification(userId: string, type: NotificationType, titleOrMessage: string, body?: string, data?: any, titleEn?: string, bodyEn?: string): Promise<{
        id: string;
        createdAt: Date;
        companyId: string | null;
        type: import(".prisma/client").$Enums.NotificationType;
        data: Prisma.JsonValue | null;
        userId: string;
        title: string;
        titleEn: string | null;
        body: string;
        bodyEn: string | null;
        entityType: string | null;
        entityId: string | null;
        isRead: boolean;
        readAt: Date | null;
    } | undefined>;
    notifyHRCaseSubmitted(companyId: string, caseId: string, caseCode: string, employeeName: string): Promise<Prisma.BatchPayload | undefined>;
    notifyEmployeeDecisionIssued(companyId: string, employeeId: string, caseId: string, caseCode: string, objectionDeadlineDays: number): Promise<{
        id: string;
        createdAt: Date;
        companyId: string | null;
        type: import(".prisma/client").$Enums.NotificationType;
        data: Prisma.JsonValue | null;
        userId: string;
        title: string;
        titleEn: string | null;
        body: string;
        bodyEn: string | null;
        entityType: string | null;
        entityId: string | null;
        isRead: boolean;
        readAt: Date | null;
    }>;
    notifyHREmployeeObjected(companyId: string, caseId: string, caseCode: string, employeeName: string): Promise<Prisma.BatchPayload | undefined>;
    notifyEmployeeHearingScheduled(companyId: string, employeeId: string, caseId: string, caseCode: string, hearingDatetime: Date, hearingLocation: string): Promise<{
        id: string;
        createdAt: Date;
        companyId: string | null;
        type: import(".prisma/client").$Enums.NotificationType;
        data: Prisma.JsonValue | null;
        userId: string;
        title: string;
        titleEn: string | null;
        body: string;
        bodyEn: string | null;
        entityType: string | null;
        entityId: string | null;
        isRead: boolean;
        readAt: Date | null;
    }>;
    notifyCaseFinalized(companyId: string, employeeId: string, managerId: string, caseId: string, caseCode: string, outcome: string): Promise<Prisma.BatchPayload>;
}
export {};
