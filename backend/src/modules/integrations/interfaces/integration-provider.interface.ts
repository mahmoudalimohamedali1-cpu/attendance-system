import { IntegrationHealthStatus } from '@prisma/client';

/**
 * نتيجة اختبار الاتصال
 */
export interface ConnectionTestResult {
  success: boolean;
  message: string;
  messageEn?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

/**
 * نتيجة المزامنة
 */
export interface SyncResult {
  success: boolean;
  recordsSynced: number;
  recordsFailed: number;
  errors: SyncError[];
  duration: number; // milliseconds
  timestamp: Date;
  details?: Record<string, any>;
}

/**
 * خطأ في المزامنة
 */
export interface SyncError {
  recordId?: string;
  message: string;
  messageEn?: string;
  code?: string;
  details?: Record<string, any>;
}

/**
 * حالة صحة التكامل
 */
export interface IntegrationHealth {
  status: IntegrationHealthStatus;
  lastCheckAt: Date;
  lastSyncAt?: Date;
  lastSuccessfulSyncAt?: Date;
  errorCount: number;
  consecutiveErrors: number;
  uptime?: number; // percentage
  latency?: number; // milliseconds
  message?: string;
  messageEn?: string;
  details?: Record<string, any>;
}

/**
 * إعدادات التكامل
 */
export interface IntegrationConfig {
  apiKey?: string;
  apiSecret?: string;
  webhookUrl?: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  syncEnabled?: boolean;
  syncInterval?: number; // minutes
  configData?: Record<string, any>;
}

/**
 * واجهة موفر التكامل
 * جميع التكاملات يجب أن تنفذ هذه الواجهة
 */
export interface IIntegrationProvider {
  /**
   * اختبار الاتصال بالخدمة الخارجية
   * يستخدم للتحقق من صحة الإعدادات والاتصال
   */
  testConnection(): Promise<ConnectionTestResult>;

  /**
   * مزامنة البيانات بين النظام والخدمة الخارجية
   * @param options خيارات المزامنة (اختياري)
   */
  sync(options?: SyncOptions): Promise<SyncResult>;

  /**
   * الحصول على حالة صحة التكامل
   */
  getHealth(): Promise<IntegrationHealth>;

  /**
   * تحديث إعدادات التكامل
   * @param config الإعدادات الجديدة
   */
  updateConfig(config: IntegrationConfig): void;

  /**
   * الحصول على معلومات التكامل
   */
  getInfo(): IntegrationInfo;
}

/**
 * معلومات التكامل
 */
export interface IntegrationInfo {
  slug: string;
  name: string;
  nameEn: string;
  description: string;
  version: string;
  category: string;
  capabilities: string[];
}

/**
 * خيارات المزامنة
 */
export interface SyncOptions {
  fullSync?: boolean; // مزامنة كاملة أم تزايدية
  entities?: string[]; // الكيانات المراد مزامنتها (موظفين، رواتب، إلخ)
  startDate?: Date;
  endDate?: Date;
  batchSize?: number;
  [key: string]: any;
}
