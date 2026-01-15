import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class IntegrationsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) { }

  async getAvailableIntegrations(companyId: string) {
    // TODO: Return list of available integrations from marketplace
    return [];
  }

  async getInstalledIntegrations(companyId: string) {
    return this.prisma.integration.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getIntegrationDetails(integrationId: string, companyId: string) {
    return this.prisma.integration.findUnique({
      where: {
        id: integrationId,
        companyId,
      },
    });
  }

  async installIntegration(
    integrationId: string,
    companyId: string,
    userId: string,
    config?: Record<string, any>,
  ) {
    const integration = await this.prisma.integration.create({
      data: {
        id: integrationId,
        companyId,
        name: integrationId, // TODO: Get name from marketplace
        provider: integrationId,
        config: config || {},
        enabled: true,
      },
    });

    await this.auditService.log(
      'CREATE',
      'Integration',
      integrationId,
      userId,
      null,
      { integrationId, enabled: true },
      `تثبيت تكامل: ${integrationId}`,
    );

    return integration;
  }

  async configureIntegration(
    integrationId: string,
    companyId: string,
    userId: string,
    config: Record<string, any>,
  ) {
    const oldIntegration = await this.getIntegrationDetails(integrationId, companyId);

    const integration = await this.prisma.integration.update({
      where: {
        id: integrationId,
        companyId,
      },
      data: {
        config,
      },
    });

    await this.auditService.log(
      'UPDATE',
      'Integration',
      integrationId,
      userId,
      { config: oldIntegration?.config },
      { config },
      `تعديل إعدادات التكامل: ${integrationId}`,
    );

    return integration;
  }

  async toggleIntegration(
    integrationId: string,
    companyId: string,
    userId: string,
    enabled: boolean,
  ) {
    const integration = await this.prisma.integration.update({
      where: {
        id: integrationId,
        companyId,
      },
      data: {
        enabled,
      },
    });

    await this.auditService.log(
      'UPDATE',
      'Integration',
      integrationId,
      userId,
      { enabled: !enabled },
      { enabled },
      `${enabled ? 'تفعيل' : 'تعطيل'} التكامل: ${integrationId}`,
    );

    return integration;
  }

  async uninstallIntegration(
    integrationId: string,
    companyId: string,
    userId: string,
  ) {
    const integration = await this.prisma.integration.delete({
      where: {
        id: integrationId,
        companyId,
      },
    });

    await this.auditService.log(
      'DELETE',
      'Integration',
      integrationId,
      userId,
      { integrationId, enabled: integration.enabled },
      null,
      `إلغاء تثبيت التكامل: ${integrationId}`,
    );

    return integration;
  }

  async getIntegrationLogs(
    integrationId: string,
    companyId: string,
    limit: number = 50,
    offset: number = 0,
  ) {
    return this.prisma.integrationLog.findMany({
      where: {
        integrationId,
        integration: {
          companyId,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }
}
