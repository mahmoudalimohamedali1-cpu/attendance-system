import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(
    action: AuditAction,
    entity: string,
    entityId?: string,
    userId?: string,
    oldValue?: any,
    newValue?: any,
    description?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId,
        userId,
        oldValue,
        newValue,
        description,
        ipAddress,
        userAgent,
      },
    });
  }

  async getAuditLogs(query: {
    userId?: string;
    entity?: string;
    entityId?: string;
    action?: AuditAction;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      userId,
      entity,
      entityId,
      action,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = query;

    const where: any = {};

    if (userId) where.userId = userId;
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;
    if (action) where.action = action;
    if (startDate) {
      where.createdAt = { gte: new Date(startDate) };
    }
    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSuspiciousAttempts(query: {
    userId?: string;
    attemptType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const { userId, attemptType, startDate, endDate } = query;

    const where: any = {};

    if (userId) where.userId = userId;
    if (attemptType) where.attemptType = attemptType;
    if (startDate) {
      where.createdAt = { gte: new Date(startDate) };
    }
    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
    }

    const skipValue = Math.max(0, (page - 1) * limit);
    const takeValue = Math.max(1, limit);

    try {
      const [attempts, total] = await Promise.all([
        this.prisma.suspiciousAttempt.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: skipValue,
          take: takeValue,
        }),
        this.prisma.suspiciousAttempt.count({ where }),
      ]);

      return {
        data: attempts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error in getSuspiciousAttempts:', error);
      console.error('Values:', { page, limit, skipValue, takeValue });
      throw error;
    }
  }
}

