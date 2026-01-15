import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { IntegrationHealthStatus, IntegrationLogAction, IntegrationStatus } from '@prisma/client';

@Injectable()
export class HealthMonitoringService {
  constructor(private prisma: PrismaService) {}

  /**
   * تحديث حالة صحة التكامل
   */
  async updateHealth(
    integrationId: string,
    status: IntegrationHealthStatus,
    statusMessage?: string,
    error?: string,
    metrics?: {
      responseTime?: number;
      recordsProcessed?: number;
      success?: boolean;
    },
  ) {
    const now = new Date();

    // جلب السجل الحالي أو إنشاء واحد جديد
    const currentHealth = await this.prisma.integrationHealth.findUnique({
      where: { integrationId },
    });

    const updateData: any = {
      status,
      lastCheckAt: now,
      statusMessage,
    };

    // تحديث إحصائيات النجاح/الفشل
    if (metrics?.success !== undefined) {
      if (metrics.success) {
        updateData.lastSuccessAt = now;
        updateData.successfulSyncs = { increment: 1 };
        updateData.consecutiveErrors = 0;
        updateData.lastError = null;
      } else {
        updateData.lastFailureAt = now;
        updateData.failedSyncs = { increment: 1 };
        updateData.errorCount = { increment: 1 };
        updateData.consecutiveErrors = { increment: 1 };
        if (error) {
          updateData.lastError = error;
        }
      }
      updateData.totalSyncs = { increment: 1 };
    }

    // تحديث وقت الاستجابة
    if (metrics?.responseTime !== undefined) {
      const currentAvg = currentHealth?.avgResponseTime || 0;
      const totalSyncs = (currentHealth?.totalSyncs || 0) + 1;
      updateData.avgResponseTime =
        (currentAvg * (totalSyncs - 1) + metrics.responseTime) / totalSyncs;
    }

    // حساب نسبة التشغيل
    if (currentHealth) {
      const totalSyncs = (currentHealth.totalSyncs || 0) + (metrics?.success !== undefined ? 1 : 0);
      const successfulSyncs = currentHealth.successfulSyncs + (metrics?.success ? 1 : 0);
      if (totalSyncs > 0) {
        updateData.uptime = (successfulSyncs / totalSyncs) * 100;
      }
    }

    return this.prisma.integrationHealth.upsert({
      where: { integrationId },
      create: {
        integrationId,
        status,
        lastCheckAt: now,
        statusMessage,
        lastError: error,
        totalSyncs: metrics?.success !== undefined ? 1 : 0,
        successfulSyncs: metrics?.success ? 1 : 0,
        failedSyncs: metrics?.success === false ? 1 : 0,
        errorCount: metrics?.success === false ? 1 : 0,
        consecutiveErrors: metrics?.success === false ? 1 : 0,
        avgResponseTime: metrics?.responseTime,
        uptime: metrics?.success ? 100 : 0,
        lastSuccessAt: metrics?.success ? now : null,
        lastFailureAt: metrics?.success === false ? now : null,
      },
      update: updateData,
    });
  }

  /**
   * سجل عملية تكامل في السجلات
   */
  async logOperation(
    integrationId: string,
    companyId: string,
    action: IntegrationLogAction,
    status: IntegrationStatus,
    message?: string,
    errorCode?: string,
    errorDetails?: any,
    metadata?: any,
    duration?: number,
    recordsProcessed?: number,
  ) {
    return this.prisma.integrationLog.create({
      data: {
        integrationId,
        companyId,
        action,
        status,
        message,
        errorCode,
        errorDetails,
        metadata,
        duration,
        recordsProcessed,
      },
    });
  }

  /**
   * الحصول على صحة التكامل
   */
  async getHealth(integrationId: string) {
    return this.prisma.integrationHealth.findUnique({
      where: { integrationId },
      include: {
        integration: {
          select: {
            name: true,
            nameEn: true,
            category: true,
            status: true,
            enabled: true,
          },
        },
      },
    });
  }

  /**
   * الحصول على سجلات التكامل مع الترقيم والفلترة
   */
  async getIntegrationLogs(query: {
    integrationId?: string;
    companyId?: string;
    action?: IntegrationLogAction;
    status?: IntegrationStatus;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      integrationId,
      companyId,
      action,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = query;

    const where: any = {};

    if (integrationId) where.integrationId = integrationId;
    if (companyId) where.companyId = companyId;
    if (action) where.action = action;
    if (status) where.status = status;
    if (startDate) {
      where.createdAt = { gte: new Date(startDate) };
    }
    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
    }

    const [logs, total] = await Promise.all([
      this.prisma.integrationLog.findMany({
        where,
        include: {
          integration: {
            select: { name: true, nameEn: true, category: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.integrationLog.count({ where }),
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

  /**
   * الحصول على إحصائيات صحة جميع التكاملات لشركة
   */
  async getCompanyHealthOverview(companyId: string) {
    const integrations = await this.prisma.integration.findMany({
      where: { companyId },
      include: {
        health: true,
        config: {
          select: {
            syncEnabled: true,
            lastSyncAt: true,
          },
        },
      },
    });

    const stats = {
      total: integrations.length,
      enabled: integrations.filter((i) => i.enabled).length,
      healthy: integrations.filter((i) => i.health?.status === 'HEALTHY').length,
      degraded: integrations.filter((i) => i.health?.status === 'DEGRADED').length,
      down: integrations.filter((i) => i.health?.status === 'DOWN').length,
      unknown: integrations.filter((i) => !i.health || i.health.status === 'UNKNOWN').length,
    };

    return {
      stats,
      integrations: integrations.map((integration) => ({
        id: integration.id,
        name: integration.name,
        category: integration.category,
        enabled: integration.enabled,
        status: integration.status,
        health: integration.health
          ? {
              status: integration.health.status,
              lastCheckAt: integration.health.lastCheckAt,
              errorCount: integration.health.errorCount,
              uptime: integration.health.uptime,
            }
          : null,
        lastSyncAt: integration.config?.lastSyncAt,
      })),
    };
  }

  // ==================== Helper Methods ====================

  /**
   * تسجيل عملية مزامنة ناجحة
   */
  async logSuccessfulSync(
    integrationId: string,
    companyId: string,
    recordsProcessed: number,
    duration: number,
    metadata?: any,
  ) {
    // تحديث حالة الصحة
    await this.updateHealth(integrationId, IntegrationHealthStatus.HEALTHY, 'عملية المزامنة تمت بنجاح', undefined, {
      responseTime: duration,
      recordsProcessed,
      success: true,
    });

    // تسجيل العملية
    return this.logOperation(
      integrationId,
      companyId,
      IntegrationLogAction.SYNC,
      IntegrationStatus.ACTIVE,
      `تمت مزامنة ${recordsProcessed} سجل بنجاح`,
      undefined,
      undefined,
      metadata,
      duration,
      recordsProcessed,
    );
  }

  /**
   * تسجيل عملية مزامنة فاشلة
   */
  async logFailedSync(
    integrationId: string,
    companyId: string,
    error: string,
    errorCode?: string,
    errorDetails?: any,
    duration?: number,
  ) {
    // تحديث حالة الصحة
    await this.updateHealth(integrationId, IntegrationHealthStatus.DOWN, 'فشلت عملية المزامنة', error, {
      responseTime: duration,
      success: false,
    });

    // تسجيل العملية
    return this.logOperation(
      integrationId,
      companyId,
      IntegrationLogAction.SYNC,
      IntegrationStatus.ERROR,
      'فشلت عملية المزامنة',
      errorCode,
      errorDetails,
      undefined,
      duration,
      0,
    );
  }

  /**
   * تسجيل اختبار الاتصال
   */
  async logConnectionTest(
    integrationId: string,
    companyId: string,
    success: boolean,
    message: string,
    duration?: number,
  ) {
    const status = success ? IntegrationStatus.ACTIVE : IntegrationStatus.ERROR;
    const healthStatus = success ? IntegrationHealthStatus.HEALTHY : IntegrationHealthStatus.DOWN;

    // تحديث حالة الصحة
    await this.updateHealth(integrationId, healthStatus, message, undefined, {
      responseTime: duration,
      success,
    });

    // تسجيل العملية
    return this.logOperation(
      integrationId,
      companyId,
      IntegrationLogAction.TEST,
      status,
      message,
      undefined,
      undefined,
      undefined,
      duration,
    );
  }

  /**
   * تسجيل تفعيل/إيقاف التكامل
   */
  async logToggleIntegration(
    integrationId: string,
    companyId: string,
    enabled: boolean,
  ) {
    const action = enabled ? IntegrationLogAction.ENABLE : IntegrationLogAction.DISABLE;
    const message = enabled ? 'تم تفعيل التكامل' : 'تم إيقاف التكامل';
    const healthStatus = enabled ? IntegrationHealthStatus.UNKNOWN : IntegrationHealthStatus.DOWN;

    // تحديث حالة الصحة
    await this.updateHealth(integrationId, healthStatus, message);

    // تسجيل العملية
    return this.logOperation(
      integrationId,
      companyId,
      action,
      enabled ? IntegrationStatus.ACTIVE : IntegrationStatus.INACTIVE,
      message,
    );
  }

  /**
   * تسجيل تغيير في الإعدادات
   */
  async logConfigurationChange(
    integrationId: string,
    companyId: string,
    message: string,
  ) {
    // تحديث حالة الصحة لتتطلب إعادة اختبار
    await this.updateHealth(
      integrationId,
      IntegrationHealthStatus.UNKNOWN,
      'تم تغيير الإعدادات - يتطلب إعادة اختبار',
    );

    // تسجيل العملية
    return this.logOperation(
      integrationId,
      companyId,
      IntegrationLogAction.CONFIGURE,
      IntegrationStatus.PENDING,
      message,
    );
  }

  /**
   * الحصول على آخر الأخطاء لتكامل معين
   */
  async getRecentErrors(integrationId: string, limit = 10) {
    return this.prisma.integrationLog.findMany({
      where: {
        integrationId,
        status: IntegrationStatus.ERROR,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        action: true,
        message: true,
        errorCode: true,
        errorDetails: true,
        createdAt: true,
      },
    });
  }

  /**
   * التحقق من حالة التكامل وإرجاع تقرير مفصل
   */
  async checkIntegrationStatus(integrationId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { id: integrationId },
      include: {
        health: true,
        config: true,
      },
    });

    if (!integration) {
      throw new Error('التكامل غير موجود');
    }

    const recentErrors = await this.getRecentErrors(integrationId, 5);
    const recentLogs = await this.prisma.integrationLog.findMany({
      where: { integrationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      integration: {
        id: integration.id,
        name: integration.name,
        category: integration.category,
        enabled: integration.enabled,
        status: integration.status,
      },
      health: integration.health,
      config: integration.config
        ? {
            syncEnabled: integration.config.syncEnabled,
            syncInterval: integration.config.syncInterval,
            lastSyncAt: integration.config.lastSyncAt,
          }
        : null,
      recentErrors,
      recentLogs,
    };
  }
}
