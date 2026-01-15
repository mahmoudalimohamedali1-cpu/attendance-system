import { Injectable, Logger } from '@nestjs/common';
import { IntegrationHealthStatus } from '@prisma/client';
import {
  IIntegrationProvider,
  IntegrationConfig,
  IntegrationHealth,
  IntegrationInfo,
  ConnectionTestResult,
  SyncResult,
  SyncOptions,
  SyncError,
} from '../interfaces/integration-provider.interface';

/**
 * موفر التكامل الأساسي
 * يوفر وظائف مشتركة لجميع التكاملات
 */
@Injectable()
export abstract class BaseIntegrationProvider implements IIntegrationProvider {
  protected readonly logger: Logger;
  protected config: IntegrationConfig;
  protected lastHealthCheck?: IntegrationHealth;
  protected errorHistory: SyncError[] = [];
  protected readonly maxErrorHistory = 100;

  constructor(
    protected readonly integrationId: string,
    protected readonly companyId: string,
    initialConfig?: IntegrationConfig,
  ) {
    this.logger = new Logger(this.constructor.name);
    this.config = initialConfig || {};
  }

  /**
   * اختبار الاتصال - يجب تنفيذها في كل تكامل
   */
  abstract testConnection(): Promise<ConnectionTestResult>;

  /**
   * مزامنة البيانات - يجب تنفيذها في كل تكامل
   */
  abstract sync(options?: SyncOptions): Promise<SyncResult>;

  /**
   * الحصول على معلومات التكامل - يجب تنفيذها في كل تكامل
   */
  abstract getInfo(): IntegrationInfo;

  /**
   * الحصول على حالة صحة التكامل
   */
  async getHealth(): Promise<IntegrationHealth> {
    try {
      // اختبار الاتصال أولاً
      const testResult = await this.testConnection();

      const health: IntegrationHealth = {
        status: testResult.success
          ? IntegrationHealthStatus.HEALTHY
          : IntegrationHealthStatus.ERROR,
        lastCheckAt: new Date(),
        errorCount: this.errorHistory.length,
        consecutiveErrors: this.getConsecutiveErrorCount(),
        message: testResult.message,
        messageEn: testResult.messageEn,
        details: {
          ...testResult.details,
          configValid: this.validateConfig(),
        },
      };

      // إضافة معلومات المزامنة الأخيرة إذا كانت متوفرة
      if (this.lastHealthCheck?.lastSyncAt) {
        health.lastSyncAt = this.lastHealthCheck.lastSyncAt;
        health.lastSuccessfulSyncAt = this.lastHealthCheck.lastSuccessfulSyncAt;
      }

      // حساب وقت التشغيل
      health.uptime = this.calculateUptime();

      this.lastHealthCheck = health;
      return health;
    } catch (error) {
      this.logger.error(
        `Error checking health for integration ${this.integrationId}:`,
        error,
      );

      return {
        status: IntegrationHealthStatus.ERROR,
        lastCheckAt: new Date(),
        errorCount: this.errorHistory.length,
        consecutiveErrors: this.getConsecutiveErrorCount(),
        message: 'فشل فحص صحة التكامل',
        messageEn: 'Health check failed',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * تحديث إعدادات التكامل
   */
  updateConfig(config: IntegrationConfig): void {
    this.config = { ...this.config, ...config };
    this.logger.log(
      `Configuration updated for integration ${this.integrationId}`,
    );
  }

  /**
   * الحصول على الإعدادات الحالية
   */
  getConfig(): IntegrationConfig {
    return { ...this.config };
  }

  /**
   * التحقق من صحة الإعدادات
   */
  protected validateConfig(): boolean {
    // التحقق الأساسي - يمكن تخصيصه في كل تكامل
    return !!(this.config.apiKey || this.config.baseUrl);
  }

  /**
   * تسجيل خطأ في المزامنة
   */
  protected recordError(error: SyncError): void {
    this.errorHistory.unshift(error);

    // الاحتفاظ بعدد محدود من الأخطاء
    if (this.errorHistory.length > this.maxErrorHistory) {
      this.errorHistory = this.errorHistory.slice(0, this.maxErrorHistory);
    }

    this.logger.error(
      `Sync error for integration ${this.integrationId}:`,
      error,
    );
  }

  /**
   * حساب عدد الأخطاء المتتالية
   */
  protected getConsecutiveErrorCount(): number {
    let count = 0;
    for (const error of this.errorHistory) {
      // في التنفيذ الحقيقي، يجب فحص الطابع الزمني
      // للتأكد من أن الأخطاء متتالية
      count++;
    }
    return count;
  }

  /**
   * حساب نسبة وقت التشغيل
   */
  protected calculateUptime(): number {
    if (this.errorHistory.length === 0) {
      return 100;
    }

    // حساب بسيط - يمكن تحسينه بناءً على سجل الصحة
    const totalChecks = 100; // افتراضي
    const successfulChecks = totalChecks - this.errorHistory.length;
    return Math.max(0, (successfulChecks / totalChecks) * 100);
  }

  /**
   * تحديث وقت المزامنة الأخيرة
   */
  protected updateLastSync(success: boolean): void {
    const now = new Date();

    if (!this.lastHealthCheck) {
      this.lastHealthCheck = {
        status: success
          ? IntegrationHealthStatus.HEALTHY
          : IntegrationHealthStatus.WARNING,
        lastCheckAt: now,
        errorCount: 0,
        consecutiveErrors: 0,
      };
    }

    this.lastHealthCheck.lastSyncAt = now;

    if (success) {
      this.lastHealthCheck.lastSuccessfulSyncAt = now;
      this.lastHealthCheck.consecutiveErrors = 0;
    } else {
      this.lastHealthCheck.consecutiveErrors++;
    }
  }

  /**
   * إنشاء نتيجة مزامنة فارغة
   */
  protected createEmptySyncResult(success: boolean = true): SyncResult {
    return {
      success,
      recordsSynced: 0,
      recordsFailed: 0,
      errors: [],
      duration: 0,
      timestamp: new Date(),
    };
  }

  /**
   * قياس وقت تنفيذ العملية
   */
  protected async measureDuration<T>(
    operation: () => Promise<T>,
  ): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    const result = await operation();
    const duration = Date.now() - startTime;

    return { result, duration };
  }

  /**
   * إنشاء نتيجة اختبار اتصال ناجحة
   */
  protected createSuccessConnectionResult(
    message?: string,
  ): ConnectionTestResult {
    return {
      success: true,
      message: message || 'الاتصال ناجح',
      messageEn: 'Connection successful',
      timestamp: new Date(),
    };
  }

  /**
   * إنشاء نتيجة اختبار اتصال فاشلة
   */
  protected createFailedConnectionResult(
    error: Error | string,
  ): ConnectionTestResult {
    const message = error instanceof Error ? error.message : error;
    return {
      success: false,
      message: 'فشل الاتصال',
      messageEn: 'Connection failed',
      details: { error: message },
      timestamp: new Date(),
    };
  }

  /**
   * معالجة خطأ المزامنة
   */
  protected async handleSyncError(
    error: Error | string,
    recordId?: string,
  ): Promise<SyncError> {
    const message = error instanceof Error ? error.message : error;

    const syncError: SyncError = {
      recordId,
      message: 'خطأ في المزامنة',
      messageEn: message,
      code: error instanceof Error ? error.name : 'SYNC_ERROR',
      details: {
        timestamp: new Date(),
      },
    };

    this.recordError(syncError);
    return syncError;
  }

  /**
   * تنفيذ عملية مع إعادة المحاولة
   */
  protected async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000,
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          this.logger.warn(
            `Retry attempt ${attempt + 1}/${maxRetries} for integration ${this.integrationId}`,
          );
          await this.delay(delayMs * (attempt + 1));
        }
      }
    }

    throw lastError;
  }

  /**
   * تأخير التنفيذ
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
