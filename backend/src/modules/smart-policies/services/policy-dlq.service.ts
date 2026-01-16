import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * 📭 Policy Dead Letter Queue Service
 * إدارة العمليات الفاشلة للمعالجة اللاحقة
 * 
 * Features:
 * - تخزين العمليات الفاشلة
 * - إعادة المحاولة التلقائية
 * - تحليل الأخطاء
 * - الإشعارات
 * - التنظيف التلقائي
 */

// ============== Types ==============

export interface FailedOperation {
    id: string;
    type: OperationType;
    payload: any;
    error: ErrorInfo;
    metadata: OperationMetadata;
    retryCount: number;
    maxRetries: number;
    status: DLQStatus;
    createdAt: Date;
    lastRetryAt?: Date;
    resolvedAt?: Date;
}

export type OperationType =
    | 'POLICY_EXECUTION'
    | 'SIMULATION'
    | 'RETRO_CALCULATION'
    | 'AI_ANALYSIS'
    | 'SYSTEM_EXTENSION'
    | 'NOTIFICATION'
    | 'EXPORT';

export type DLQStatus =
    | 'PENDING'
    | 'RETRYING'
    | 'FAILED'
    | 'RESOLVED'
    | 'EXPIRED';

export interface ErrorInfo {
    name: string;
    message: string;
    stack?: string;
    code?: string;
}

export interface OperationMetadata {
    companyId?: string;
    userId?: string;
    policyId?: string;
    employeeId?: string;
    requestId?: string;
    [key: string]: any;
}

export interface DLQStats {
    total: number;
    pending: number;
    retrying: number;
    failed: number;
    resolved: number;
    expired: number;
    byType: Record<OperationType, number>;
}

// ============== Implementation ==============

@Injectable()
export class PolicyDLQService {
    private readonly logger = new Logger(PolicyDLQService.name);
    
    // In-memory store (في الإنتاج، استخدم Redis أو قاعدة بيانات)
    private readonly queue: Map<string, FailedOperation> = new Map();
    
    // الإعدادات
    private readonly DEFAULT_MAX_RETRIES = 3;
    private readonly RETRY_DELAY_BASE_MS = 5000;
    private readonly EXPIRY_HOURS = 72; // 3 أيام
    
    // مهمة التنظيف
    private cleanupTimer: NodeJS.Timer | null = null;

    constructor(private readonly prisma: PrismaService) {
        // بدء مهمة التنظيف
        this.startCleanupTask();
    }

    /**
     * إضافة عملية فاشلة للـ queue
     */
    async enqueue(
        type: OperationType,
        payload: any,
        error: Error,
        metadata: OperationMetadata = {},
        maxRetries: number = this.DEFAULT_MAX_RETRIES,
    ): Promise<string> {
        const id = this.generateId();
        
        const operation: FailedOperation = {
            id,
            type,
            payload,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
                code: (error as any).code,
            },
            metadata,
            retryCount: 0,
            maxRetries,
            status: 'PENDING',
            createdAt: new Date(),
        };

        this.queue.set(id, operation);

        // تسجيل
        this.logger.warn(
            `Operation added to DLQ: ${type} [${id}] - ${error.message}`,
        );

        // محاولة حفظ في قاعدة البيانات (اختياري)
        await this.persistToDB(operation);

        return id;
    }

    /**
     * جلب عملية من الـ queue
     */
    get(id: string): FailedOperation | undefined {
        return this.queue.get(id);
    }

    /**
     * جلب جميع العمليات
     */
    getAll(filter?: { status?: DLQStatus; type?: OperationType }): FailedOperation[] {
        let operations = Array.from(this.queue.values());

        if (filter?.status) {
            operations = operations.filter((op) => op.status === filter.status);
        }

        if (filter?.type) {
            operations = operations.filter((op) => op.type === filter.type);
        }

        return operations.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        );
    }

    /**
     * إعادة محاولة عملية
     */
    async retry(
        id: string,
        processor: (payload: any) => Promise<void>,
    ): Promise<boolean> {
        const operation = this.queue.get(id);

        if (!operation) {
            this.logger.warn(`Operation not found in DLQ: ${id}`);
            return false;
        }

        if (operation.status !== 'PENDING' && operation.status !== 'RETRYING') {
            this.logger.warn(
                `Cannot retry operation with status: ${operation.status}`,
            );
            return false;
        }

        operation.status = 'RETRYING';
        operation.retryCount++;
        operation.lastRetryAt = new Date();

        try {
            await processor(operation.payload);

            // نجاح
            operation.status = 'RESOLVED';
            operation.resolvedAt = new Date();

            this.logger.log(
                `DLQ operation resolved: ${operation.type} [${id}]`,
            );

            return true;
        } catch (error) {
            // فشل
            operation.error = {
                name: error.name,
                message: error.message,
                stack: error.stack,
            };

            if (operation.retryCount >= operation.maxRetries) {
                operation.status = 'FAILED';
                this.logger.error(
                    `DLQ operation permanently failed: ${operation.type} [${id}]`,
                );
            } else {
                operation.status = 'PENDING';
                this.logger.warn(
                    `DLQ operation retry failed (${operation.retryCount}/${operation.maxRetries}): ${operation.type} [${id}]`,
                );
            }

            return false;
        }
    }

    /**
     * إعادة محاولة جميع العمليات المعلقة
     */
    async retryAll(
        processors: Map<OperationType, (payload: any) => Promise<void>>,
    ): Promise<{ succeeded: number; failed: number }> {
        const pending = this.getAll({ status: 'PENDING' });
        let succeeded = 0;
        let failed = 0;

        for (const operation of pending) {
            const processor = processors.get(operation.type);

            if (!processor) {
                this.logger.warn(
                    `No processor found for operation type: ${operation.type}`,
                );
                continue;
            }

            // انتظار قبل المحاولة (exponential backoff)
            const delay = this.RETRY_DELAY_BASE_MS * Math.pow(2, operation.retryCount);
            await this.sleep(Math.min(delay, 60000)); // الحد الأقصى دقيقة

            const success = await this.retry(operation.id, processor);

            if (success) {
                succeeded++;
            } else {
                failed++;
            }
        }

        this.logger.log(
            `DLQ retry completed: ${succeeded} succeeded, ${failed} failed`,
        );

        return { succeeded, failed };
    }

    /**
     * حل عملية يدوياً
     */
    resolve(id: string, notes?: string): boolean {
        const operation = this.queue.get(id);

        if (!operation) {
            return false;
        }

        operation.status = 'RESOLVED';
        operation.resolvedAt = new Date();
        
        if (notes) {
            operation.metadata.resolveNotes = notes;
        }

        this.logger.log(`DLQ operation manually resolved: ${id}`);

        return true;
    }

    /**
     * حذف عملية
     */
    remove(id: string): boolean {
        return this.queue.delete(id);
    }

    /**
     * مسح العمليات المحلولة
     */
    clearResolved(): number {
        let cleared = 0;

        for (const [id, operation] of this.queue.entries()) {
            if (operation.status === 'RESOLVED') {
                this.queue.delete(id);
                cleared++;
            }
        }

        this.logger.log(`Cleared ${cleared} resolved operations from DLQ`);

        return cleared;
    }

    /**
     * جلب الإحصائيات
     */
    getStats(): DLQStats {
        const operations = Array.from(this.queue.values());

        const stats: DLQStats = {
            total: operations.length,
            pending: 0,
            retrying: 0,
            failed: 0,
            resolved: 0,
            expired: 0,
            byType: {} as Record<OperationType, number>,
        };

        for (const op of operations) {
            // حسب الحالة
            switch (op.status) {
                case 'PENDING':
                    stats.pending++;
                    break;
                case 'RETRYING':
                    stats.retrying++;
                    break;
                case 'FAILED':
                    stats.failed++;
                    break;
                case 'RESOLVED':
                    stats.resolved++;
                    break;
                case 'EXPIRED':
                    stats.expired++;
                    break;
            }

            // حسب النوع
            stats.byType[op.type] = (stats.byType[op.type] || 0) + 1;
        }

        return stats;
    }

    /**
     * تحليل الأخطاء الشائعة
     */
    analyzeErrors(): {
        commonErrors: { message: string; count: number }[];
        errorsByType: Record<OperationType, string[]>;
    } {
        const operations = this.getAll({ status: 'FAILED' });
        const errorCounts: Map<string, number> = new Map();
        const errorsByType: Record<OperationType, string[]> = {} as any;

        for (const op of operations) {
            // عد الأخطاء
            const key = op.error.message;
            errorCounts.set(key, (errorCounts.get(key) || 0) + 1);

            // تجميع حسب النوع
            if (!errorsByType[op.type]) {
                errorsByType[op.type] = [];
            }
            if (!errorsByType[op.type].includes(op.error.message)) {
                errorsByType[op.type].push(op.error.message);
            }
        }

        // ترتيب الأخطاء الشائعة
        const commonErrors = Array.from(errorCounts.entries())
            .map(([message, count]) => ({ message, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return { commonErrors, errorsByType };
    }

    // ============== Private Methods ==============

    /**
     * توليد معرف فريد
     */
    private generateId(): string {
        return `dlq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * حفظ في قاعدة البيانات
     */
    private async persistToDB(operation: FailedOperation): Promise<void> {
        try {
            // يمكن إنشاء جدول مخصص للـ DLQ
            // await this.prisma.policyDLQ.create({ data: operation });
        } catch (error) {
            this.logger.error(`Failed to persist DLQ operation: ${error.message}`);
        }
    }

    /**
     * بدء مهمة التنظيف
     */
    private startCleanupTask(): void {
        // كل ساعة
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, 60 * 60 * 1000);
    }

    /**
     * تنظيف العمليات القديمة
     */
    private cleanup(): void {
        const expiryTime = Date.now() - this.EXPIRY_HOURS * 60 * 60 * 1000;
        let expired = 0;

        for (const [id, operation] of this.queue.entries()) {
            // انتهاء الصلاحية للعمليات القديمة غير المحلولة
            if (
                operation.createdAt.getTime() < expiryTime &&
                operation.status !== 'RESOLVED'
            ) {
                operation.status = 'EXPIRED';
                expired++;
            }

            // حذف العمليات المحلولة القديمة
            if (
                operation.status === 'RESOLVED' &&
                operation.resolvedAt &&
                operation.resolvedAt.getTime() < expiryTime
            ) {
                this.queue.delete(id);
            }
        }

        if (expired > 0) {
            this.logger.log(`Expired ${expired} DLQ operations`);
        }
    }

    /**
     * الانتظار
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
