import { Injectable } from '@nestjs/common';
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

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) { }

  /**
   * Create a new notification
   */
  async create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        companyId: dto.companyId,
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        titleEn: dto.titleEn,
        body: dto.body,
        bodyEn: dto.bodyEn,
        entityType: dto.entityType,
        entityId: dto.entityId,
        data: dto.data,
      } as any,
    });
  }

  /**
   * Create notifications for multiple recipients
   */
  async createMany(
    companyId: string,
    userIds: string[],
    type: NotificationType,
    title: string,
    body: string,
    entityType?: string,
    entityId?: string,
    data?: any,
  ) {
    return this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        companyId,
        userId,
        type,
        title,
        body,
        entityType,
        entityId,
        data,
      })),
    });
  }

  /**
   * Get notifications for a user
   */
  async getForUser(
    userId: string,
    companyId: string,
    options?: {
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      companyId,
    };

    if (options?.unreadOnly) {
      where.isRead = false;
    }

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 20,
        skip: options?.offset || 0,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string, companyId?: string): Promise<number> {
    const cid = companyId || (await this.prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } }))?.companyId;
    return this.prisma.notification.count({
      where: {
        userId,
        companyId: cid || undefined,
        isRead: false,
      },
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string, companyId?: string) {
    const cid = companyId || (await this.prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } }))?.companyId;
    return this.prisma.notification.updateMany({
      where: { userId, companyId: cid || undefined, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Get notifications (Compatibility)
   */
  async getNotifications(userId: string, page: number = 1, limit: number = 20) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true }
    });
    return this.getForUser(userId, user?.companyId || '', {
      limit,
      offset: (page - 1) * limit
    });
  }

  /**
   * Delete notification (Compatibility)
   */
  async deleteNotification(id: string, userId: string) {
    return this.prisma.notification.deleteMany({
      where: { id, userId }
    });
  }

  /**
   * Broadcast notification (Compatibility)
   */
  async broadcastNotification(
    type: NotificationType,
    title: string,
    body: string,
    userIds?: string[],
    data?: any,
  ) {
    if (!userIds || userIds.length === 0) return;

    const user = await this.prisma.user.findFirst({
      where: { id: userIds[0] },
      select: { companyId: true }
    });

    return this.createMany(
      user?.companyId || '',
      userIds,
      type,
      title,
      body,
      undefined,
      undefined,
      data
    );
  }

  /**
   * Send a generic notification (Backward compatibility)
   */
  async sendNotification(
    userId: string,
    type: NotificationType,
    titleOrMessage: string,
    body?: string,
    data?: any,
    titleEn?: string,
    bodyEn?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true }
    });

    if (!user) return;

    // Handle case where body might be empty (if called with old 3-arg style)
    const finalTitle = body ? titleOrMessage : 'System Notification';
    const finalBody = body ? body : titleOrMessage;

    return this.create({
      companyId: user.companyId || '',
      userId,
      type,
      title: finalTitle,
      titleEn,
      body: finalBody,
      bodyEn,
      data,
    });
  }

  // ==================== Disciplinary Notification Helpers ====================

  async notifyHRCaseSubmitted(
    companyId: string,
    caseId: string,
    caseCode: string,
    employeeName: string,
  ) {
    const hrUsers = await this.prisma.user.findMany({
      where: { companyId, role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true },
    });
    if (hrUsers.length === 0) return;

    return this.createMany(
      companyId,
      hrUsers.map((u) => u.id),
      'DISC_CASE_SUBMITTED',
      'طلب تحقيق جديد',
      `تم رفع طلب تحقيق جديد ${caseCode} بخصوص ${employeeName}`,
      'DISCIPLINARY_CASE',
      caseId,
      { caseCode, employeeName },
    );
  }

  async notifyEmployeeDecisionIssued(
    companyId: string,
    employeeId: string,
    caseId: string,
    caseCode: string,
    objectionDeadlineDays: number,
  ) {
    return this.create({
      companyId,
      userId: employeeId,
      type: 'DISC_DECISION_ISSUED',
      title: 'صدر قرار بخصوص قضيتك',
      body: `صدر قرار بشأن القضية ${caseCode}. لديك ${objectionDeadlineDays} يوم للرد أو الاعتراض.`,
      entityType: 'DISCIPLINARY_CASE',
      entityId: caseId,
      data: { caseCode, objectionDeadlineDays },
    });
  }

  async notifyHREmployeeObjected(
    companyId: string,
    caseId: string,
    caseCode: string,
    employeeName: string,
  ) {
    const hrUsers = await this.prisma.user.findMany({
      where: { companyId, role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true },
    });
    if (hrUsers.length === 0) return;

    return this.createMany(
      companyId,
      hrUsers.map((u) => u.id),
      'DISC_EMP_OBJECTED',
      'اعتراض موظف على قرار',
      `اعترض ${employeeName} على القرار الصادر في القضية ${caseCode}`,
      'DISCIPLINARY_CASE',
      caseId,
      { caseCode, employeeName },
    );
  }

  async notifyEmployeeHearingScheduled(
    companyId: string,
    employeeId: string,
    caseId: string,
    caseCode: string,
    hearingDatetime: Date,
    hearingLocation: string,
  ) {
    return this.create({
      companyId,
      userId: employeeId,
      type: 'DISC_HEARING_SCHEDULED',
      title: 'تم تحديد موعد جلسة',
      body: `تم تحديد جلسة تحقيق للقضية ${caseCode} في ${hearingLocation}`,
      entityType: 'DISCIPLINARY_CASE',
      entityId: caseId,
      data: { caseCode, hearingDatetime, hearingLocation },
    });
  }

  async notifyCaseFinalized(
    companyId: string,
    employeeId: string,
    managerId: string,
    caseId: string,
    caseCode: string,
    outcome: string,
  ) {
    return this.createMany(
      companyId,
      [employeeId, managerId],
      'DISC_FINALIZED',
      'انتهت القضية التأديبية',
      `انتهت القضية ${caseCode} بنتيجة: ${outcome}`,
      'DISCIPLINARY_CASE',
      caseId,
      { caseCode, outcome },
    );
  }
}
