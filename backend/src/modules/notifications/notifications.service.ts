import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FcmService } from './services/fcm.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private fcmService: FcmService,
  ) {}

  async sendNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: any,
    titleEn?: string,
    bodyEn?: string,
  ) {
    // Save notification to database
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        titleEn,
        body,
        bodyEn,
        data,
      },
    });

    // Send push notification
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    if (user?.fcmToken) {
      await this.fcmService.sendPushNotification(
        user.fcmToken,
        title,
        body,
        data,
      );
    }

    return notification;
  }

  async getNotifications(userId: string, page = 1, limit = 20) {
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return {
      data: notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async deleteNotification(notificationId: string, userId: string) {
    return this.prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  // Broadcast notifications (admin)
  async broadcastNotification(
    type: NotificationType,
    title: string,
    body: string,
    userIds?: string[],
    data?: any,
  ) {
    let users;

    if (userIds && userIds.length > 0) {
      users = await this.prisma.user.findMany({
        where: { id: { in: userIds }, status: 'ACTIVE' },
        select: { id: true, fcmToken: true },
      });
    } else {
      users = await this.prisma.user.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, fcmToken: true },
      });
    }

    // Create notifications for all users
    await this.prisma.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        type,
        title,
        body,
        data,
      })),
    });

    // Send push notifications to users with FCM tokens
    const tokens = users.filter((u) => u.fcmToken).map((u) => u.fcmToken!);
    if (tokens.length > 0) {
      await this.fcmService.sendMultiplePushNotifications(tokens, title, body, data);
    }

    return { sent: users.length };
  }
}

