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
    // Catalog of available integrations
    const availableIntegrations = [
      {
        slug: 'quickbooks',
        name: 'QuickBooks',
        nameEn: 'QuickBooks',
        description: 'تكامل مع QuickBooks لمزامنة البيانات المالية والرواتب تلقائياً',
        category: 'ACCOUNTING',
        logo: 'https://cdn.worldvectorlogo.com/logos/quickbooks-2.svg',
        version: '1.0.0',
        developerName: 'Intuit',
        websiteUrl: 'https://quickbooks.intuit.com',
        documentationUrl: 'https://developer.intuit.com/app/developer/qbo/docs/get-started',
      },
      {
        slug: 'xero',
        name: 'Xero',
        nameEn: 'Xero',
        description: 'تكامل مع Xero للمحاسبة السحابية ومزامنة بيانات الرواتب',
        category: 'ACCOUNTING',
        logo: 'https://cdn.worldvectorlogo.com/logos/xero-1.svg',
        version: '1.0.0',
        developerName: 'Xero Limited',
        websiteUrl: 'https://www.xero.com',
        documentationUrl: 'https://developer.xero.com/documentation',
      },
      {
        slug: 'sap',
        name: 'SAP ERP',
        nameEn: 'SAP ERP',
        description: 'تكامل مع SAP لمزامنة بيانات الموظفين والرواتب',
        category: 'ERP',
        logo: 'https://cdn.worldvectorlogo.com/logos/sap.svg',
        version: '1.0.0',
        developerName: 'SAP SE',
        websiteUrl: 'https://www.sap.com',
        documentationUrl: 'https://api.sap.com',
      },
      {
        slug: 'oracle-erp',
        name: 'Oracle ERP Cloud',
        nameEn: 'Oracle ERP Cloud',
        description: 'تكامل مع Oracle ERP Cloud لإدارة موارد المؤسسات',
        category: 'ERP',
        logo: 'https://cdn.worldvectorlogo.com/logos/oracle-6.svg',
        version: '1.0.0',
        developerName: 'Oracle Corporation',
        websiteUrl: 'https://www.oracle.com/erp',
        documentationUrl: 'https://docs.oracle.com/en/cloud/saas/financials',
      },
      {
        slug: 'slack',
        name: 'Slack',
        nameEn: 'Slack',
        description: 'تكامل مع Slack لإرسال الإشعارات والتنبيهات للموظفين',
        category: 'COMMUNICATION',
        logo: 'https://cdn.worldvectorlogo.com/logos/slack-new-logo.svg',
        version: '1.0.0',
        developerName: 'Slack Technologies',
        websiteUrl: 'https://slack.com',
        documentationUrl: 'https://api.slack.com',
      },
      {
        slug: 'microsoft-teams',
        name: 'Microsoft Teams',
        nameEn: 'Microsoft Teams',
        description: 'تكامل مع Microsoft Teams للإشعارات والتواصل الفوري',
        category: 'COMMUNICATION',
        logo: 'https://cdn.worldvectorlogo.com/logos/microsoft-teams-1.svg',
        version: '1.0.0',
        developerName: 'Microsoft Corporation',
        websiteUrl: 'https://www.microsoft.com/microsoft-teams',
        documentationUrl: 'https://docs.microsoft.com/en-us/microsoftteams/platform',
      },
      {
        slug: 'google-workspace',
        name: 'Google Workspace',
        nameEn: 'Google Workspace',
        description: 'تكامل مع Google Workspace لمزامنة التقويم والبريد الإلكتروني',
        category: 'COMMUNICATION',
        logo: 'https://cdn.worldvectorlogo.com/logos/google-workspace.svg',
        version: '1.0.0',
        developerName: 'Google LLC',
        websiteUrl: 'https://workspace.google.com',
        documentationUrl: 'https://developers.google.com/workspace',
      },
      {
        slug: 'workday',
        name: 'Workday HCM',
        nameEn: 'Workday HCM',
        description: 'تكامل مع Workday لإدارة رأس المال البشري',
        category: 'HR',
        logo: 'https://cdn.worldvectorlogo.com/logos/workday-1.svg',
        version: '1.0.0',
        developerName: 'Workday Inc.',
        websiteUrl: 'https://www.workday.com',
        documentationUrl: 'https://doc.workday.com',
      },
      {
        slug: 'adp',
        name: 'ADP Workforce Now',
        nameEn: 'ADP Workforce Now',
        description: 'تكامل مع ADP لإدارة الرواتب والموارد البشرية',
        category: 'PAYROLL',
        logo: 'https://cdn.worldvectorlogo.com/logos/adp-2.svg',
        version: '1.0.0',
        developerName: 'ADP Inc.',
        websiteUrl: 'https://www.adp.com',
        documentationUrl: 'https://developers.adp.com',
      },
      {
        slug: 'bamboohr',
        name: 'BambooHR',
        nameEn: 'BambooHR',
        description: 'تكامل مع BambooHR لإدارة بيانات الموظفين والإجازات',
        category: 'HR',
        logo: 'https://cdn.worldvectorlogo.com/logos/bamboohr-1.svg',
        version: '1.0.0',
        developerName: 'BambooHR LLC',
        websiteUrl: 'https://www.bamboohr.com',
        documentationUrl: 'https://documentation.bamboohr.com',
      },
      {
        slug: 'stripe',
        name: 'Stripe',
        nameEn: 'Stripe',
        description: 'تكامل مع Stripe لمعالجة المدفوعات والاشتراكات',
        category: 'BANKING',
        logo: 'https://cdn.worldvectorlogo.com/logos/stripe-4.svg',
        version: '1.0.0',
        developerName: 'Stripe Inc.',
        websiteUrl: 'https://stripe.com',
        documentationUrl: 'https://stripe.com/docs/api',
      },
      {
        slug: 'paypal',
        name: 'PayPal',
        nameEn: 'PayPal',
        description: 'تكامل مع PayPal للمدفوعات الإلكترونية',
        category: 'BANKING',
        logo: 'https://cdn.worldvectorlogo.com/logos/paypal-2.svg',
        version: '1.0.0',
        developerName: 'PayPal Holdings Inc.',
        websiteUrl: 'https://www.paypal.com',
        documentationUrl: 'https://developer.paypal.com/docs/api',
      },
    ];

    // Get installed integrations for this company
    const installedIntegrations = await this.prisma.integration.findMany({
      where: { companyId },
      select: {
        slug: true,
        enabled: true,
        status: true,
      },
    });

    // Create a map of installed integrations
    const installedMap = new Map(
      installedIntegrations.map((int) => [int.slug, int]),
    );

    // Merge available integrations with installation status
    return availableIntegrations.map((integration) => {
      const installed = installedMap.get(integration.slug);
      return {
        ...integration,
        installed: !!installed,
        enabled: installed?.enabled || false,
        status: installed?.status || 'INACTIVE',
      };
    });
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
    configDto: {
      apiKey?: string;
      apiSecret?: string;
      webhookUrl?: string;
      configData?: Record<string, any>;
      syncEnabled?: boolean;
      syncInterval?: number;
    },
  ) {
    const oldIntegration = await this.getIntegrationDetails(integrationId, companyId);

    // Build the config object from the DTO
    const config: Record<string, any> = {};

    if (configDto.apiKey !== undefined) {
      config.apiKey = configDto.apiKey;
    }
    if (configDto.apiSecret !== undefined) {
      config.apiSecret = configDto.apiSecret;
    }
    if (configDto.webhookUrl !== undefined) {
      config.webhookUrl = configDto.webhookUrl;
    }
    if (configDto.syncEnabled !== undefined) {
      config.syncEnabled = configDto.syncEnabled;
    }
    if (configDto.syncInterval !== undefined) {
      config.syncInterval = configDto.syncInterval;
    }
    if (configDto.configData !== undefined) {
      // Merge custom config data
      Object.assign(config, configDto.configData);
    }

    // Merge with existing config to preserve other settings
    const mergedConfig = {
      ...(oldIntegration?.config || {}),
      ...config,
    };

    const integration = await this.prisma.integration.update({
      where: {
        id: integrationId,
        companyId,
      },
      data: {
        config: mergedConfig,
      },
    });

    await this.auditService.log(
      'UPDATE',
      'Integration',
      integrationId,
      userId,
      { config: oldIntegration?.config },
      { config: mergedConfig },
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

  async testConnection(
    integrationId: string,
    companyId: string,
    userId: string,
  ) {
    // التحقق من وجود التكامل
    const integration = await this.prisma.integration.findUnique({
      where: {
        id: integrationId,
        companyId,
      },
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    // محاكاة اختبار الاتصال
    // في التنفيذ الحقيقي، يتم إنشاء مثيل من provider المناسب واستدعاء testConnection()
    const startTime = Date.now();

    try {
      // محاكاة تأخير الشبكة
      await new Promise((resolve) => setTimeout(resolve, 500));

      // التحقق من وجود الإعدادات المطلوبة
      const config = integration.config as Record<string, any>;
      const hasRequiredConfig = config?.apiKey || config?.baseUrl;

      const duration = Date.now() - startTime;

      if (hasRequiredConfig) {
        // تسجيل اختبار الاتصال الناجح
        await this.auditService.log(
          'UPDATE',
          'Integration',
          integrationId,
          userId,
          null,
          { connectionTest: 'success' },
          `اختبار اتصال ناجح: ${integration.name}`,
        );

        return {
          success: true,
          message: 'تم اختبار الاتصال بنجاح',
          messageEn: 'Connection test successful',
          timestamp: new Date(),
          details: {
            latency: duration,
            integrationName: integration.name,
            status: integration.status,
          },
        };
      } else {
        // تسجيل فشل اختبار الاتصال
        await this.auditService.log(
          'UPDATE',
          'Integration',
          integrationId,
          userId,
          null,
          { connectionTest: 'failed' },
          `فشل اختبار الاتصال: ${integration.name}`,
        );

        return {
          success: false,
          message: 'فشل اختبار الاتصال - إعدادات غير مكتملة',
          messageEn: 'Connection test failed - incomplete configuration',
          timestamp: new Date(),
          details: {
            error: 'Missing required configuration (apiKey or baseUrl)',
          },
        };
      }
    } catch (error) {
      await this.auditService.log(
        'UPDATE',
        'Integration',
        integrationId,
        userId,
        null,
        { connectionTest: 'error', error: error.message },
        `خطأ في اختبار الاتصال: ${integration.name}`,
      );

      return {
        success: false,
        message: 'خطأ في اختبار الاتصال',
        messageEn: 'Connection test error',
        timestamp: new Date(),
        details: {
          error: error.message || 'Unknown error',
        },
      };
    }
  }

  async getIntegrationHealth(
    integrationId: string,
    companyId: string,
  ) {
    // التحقق من وجود التكامل
    const integration = await this.prisma.integration.findUnique({
      where: {
        id: integrationId,
        companyId,
      },
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    // محاكاة فحص الصحة
    // في التنفيذ الحقيقي، يتم إنشاء مثيل من provider المناسب واستدعاء getHealth()
    const config = integration.config as Record<string, any>;
    const hasRequiredConfig = config?.apiKey || config?.baseUrl;

    // حساب حالة الصحة بناءً على التكامل
    let status = 'HEALTHY';
    let message = 'التكامل يعمل بشكل طبيعي';
    let messageEn = 'Integration is healthy';

    if (!integration.enabled) {
      status = 'INACTIVE';
      message = 'التكامل معطل';
      messageEn = 'Integration is disabled';
    } else if (!hasRequiredConfig) {
      status = 'ERROR';
      message = 'إعدادات التكامل غير مكتملة';
      messageEn = 'Integration configuration incomplete';
    } else if (integration.status === 'ERROR') {
      status = 'ERROR';
      message = 'يوجد خطأ في التكامل';
      messageEn = 'Integration has errors';
    } else if (integration.status === 'WARNING') {
      status = 'WARNING';
      message = 'التكامل يعمل مع تحذيرات';
      messageEn = 'Integration has warnings';
    }

    return {
      status,
      lastCheckAt: new Date(),
      message,
      messageEn,
      details: {
        integrationName: integration.name,
        enabled: integration.enabled,
        configValid: hasRequiredConfig,
        provider: integration.provider,
      },
    };
  }
}
