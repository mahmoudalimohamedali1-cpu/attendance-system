import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { BATCH_CONFIG } from '../constants/smart-policy.constants';
import { chunk } from '../helpers/smart-policy.helpers';

/**
 * 🔒 Policy Transaction Service
 * خدمة إدارة المعاملات والـ batch processing
 * 
 * Features:
 * - Transaction management مع rollback
 * - Batch processing مع retry
 * - Deadlock handling
 * - Progress tracking
 * - Timeout management
 */

// ============== Types ==============

export interface TransactionOptions {
    /** timeout بالـ milliseconds */
    timeout?: number;
    /** عدد محاولات إعادة المحاولة */
    maxRetries?: number;
    /** isolation level */
    isolationLevel?: Prisma.TransactionIsolationLevel;
}

export interface BatchOptions {
    /** حجم الدفعة */
    batchSize?: number;
    /** عدد العمليات المتوازية */
    concurrency?: number;
    /** توقف عند أول خطأ */
    stopOnError?: boolean;
    /** callback للتقدم */
    onProgress?: (progress: BatchProgress) => void;
}

export interface BatchProgress {
    total: number;
    completed: number;
    failed: number;
    percentage: number;
    currentBatch: number;
    totalBatches: number;
}

export interface BatchResult<T> {
    success: boolean;
    results: T[];
    errors: BatchError[];
    summary: {
        total: number;
        succeeded: number;
        failed: number;
        duration: number;
    };
}

export interface BatchError {
    index: number;
    item: any;
    error: string;
}

// ============== Implementation ==============

@Injectable()
export class PolicyTransactionService {
    private readonly logger = new Logger(PolicyTransactionService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * تنفيذ عملية في transaction مع retry وـ timeout
     */
    async executeInTransaction<T>(
        operation: (tx: Prisma.TransactionClient) => Promise<T>,
        options: TransactionOptions = {},
    ): Promise<T> {
        const {
            timeout = BATCH_CONFIG.BATCH_TIMEOUT_MS,
            maxRetries = 3,
            isolationLevel = Prisma.TransactionIsolationLevel.ReadCommitted,
        } = options;

        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.logger.debug(
                    `Transaction attempt ${attempt}/${maxRetries}`,
                );

                const result = await this.prisma.$transaction(
                    operation,
                    {
                        timeout,
                        isolationLevel,
                    },
                );

                return result;
            } catch (error) {
                lastError = error as Error;

                // التحقق من نوع الخطأ
                const isRetryable = this.isRetryableError(error);

                if (!isRetryable || attempt === maxRetries) {
                    this.logger.error(
                        `Transaction failed after ${attempt} attempts: ${error.message}`,
                    );
                    throw error;
                }

                // انتظار قبل إعادة المحاولة (exponential backoff)
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                this.logger.warn(
                    `Transaction attempt ${attempt} failed, retrying in ${delay}ms: ${error.message}`,
                );
                await this.sleep(delay);
            }
        }

        throw lastError || new Error('Transaction failed');
    }

    /**
     * معالجة دفعات (batch processing)
     */
    async processBatch<T, R>(
        items: T[],
        processor: (item: T, index: number) => Promise<R>,
        options: BatchOptions = {},
    ): Promise<BatchResult<R>> {
        const {
            batchSize = BATCH_CONFIG.BATCH_SIZE,
            concurrency = BATCH_CONFIG.MAX_CONCURRENCY,
            stopOnError = false,
            onProgress,
        } = options;

        const startTime = Date.now();
        const results: R[] = [];
        const errors: BatchError[] = [];
        
        const batches = chunk(items, batchSize);
        const totalBatches = batches.length;

        this.logger.log(
            `Starting batch processing: ${items.length} items in ${totalBatches} batches`,
        );

        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            const batchStartIndex = batchIndex * batchSize;

            // معالجة الدفعة بشكل متوازي (مع حد للتوازي)
            const batchPromises = batch.map((item, localIndex) => ({
                item,
                index: batchStartIndex + localIndex,
            }));

            // تقسيم الدفعة للتوازي
            const concurrentBatches = chunk(batchPromises, concurrency);

            for (const concurrentBatch of concurrentBatches) {
                const batchResults = await Promise.allSettled(
                    concurrentBatch.map(async ({ item, index }) => {
                        try {
                            return await processor(item, index);
                        } catch (error) {
                            throw { index, item, error };
                        }
                    }),
                );

                for (const result of batchResults) {
                    if (result.status === 'fulfilled') {
                        results.push(result.value);
                    } else {
                        const { index, item, error } = result.reason;
                        errors.push({
                            index,
                            item,
                            error: error.message || String(error),
                        });

                        if (stopOnError) {
                            this.logger.error(
                                `Batch processing stopped at item ${index} due to error`,
                            );
                            break;
                        }
                    }
                }

                if (stopOnError && errors.length > 0) break;
            }

            if (stopOnError && errors.length > 0) break;

            // تحديث التقدم
            if (onProgress) {
                const completed = Math.min(
                    (batchIndex + 1) * batchSize,
                    items.length,
                );
                onProgress({
                    total: items.length,
                    completed,
                    failed: errors.length,
                    percentage: Math.round((completed / items.length) * 100),
                    currentBatch: batchIndex + 1,
                    totalBatches,
                });
            }
        }

        const duration = Date.now() - startTime;

        this.logger.log(
            `Batch processing completed: ${results.length} succeeded, ${errors.length} failed in ${duration}ms`,
        );

        return {
            success: errors.length === 0,
            results,
            errors,
            summary: {
                total: items.length,
                succeeded: results.length,
                failed: errors.length,
                duration,
            },
        };
    }

    /**
     * معالجة دفعات في transaction واحد
     */
    async processBatchInTransaction<T, R>(
        items: T[],
        processor: (item: T, tx: Prisma.TransactionClient) => Promise<R>,
        options: BatchOptions & TransactionOptions = {},
    ): Promise<BatchResult<R>> {
        const {
            batchSize = BATCH_CONFIG.BATCH_SIZE,
            timeout = BATCH_CONFIG.BATCH_TIMEOUT_MS,
            maxRetries = 3,
            onProgress,
        } = options;

        const startTime = Date.now();
        const batches = chunk(items, batchSize);
        const allResults: R[] = [];
        const allErrors: BatchError[] = [];

        this.logger.log(
            `Starting batch transaction: ${items.length} items in ${batches.length} batches`,
        );

        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            const batchStartIndex = batchIndex * batchSize;

            try {
                const batchResults = await this.executeInTransaction(
                    async (tx) => {
                        const results: R[] = [];
                        for (let i = 0; i < batch.length; i++) {
                            const result = await processor(batch[i], tx);
                            results.push(result);
                        }
                        return results;
                    },
                    { timeout, maxRetries },
                );

                allResults.push(...batchResults);
            } catch (error) {
                // في حالة فشل الـ transaction، نسجل كل عناصر الدفعة كفشل
                for (let i = 0; i < batch.length; i++) {
                    allErrors.push({
                        index: batchStartIndex + i,
                        item: batch[i],
                        error: error.message,
                    });
                }
            }

            // تحديث التقدم
            if (onProgress) {
                const completed = Math.min(
                    (batchIndex + 1) * batchSize,
                    items.length,
                );
                onProgress({
                    total: items.length,
                    completed,
                    failed: allErrors.length,
                    percentage: Math.round((completed / items.length) * 100),
                    currentBatch: batchIndex + 1,
                    totalBatches: batches.length,
                });
            }
        }

        const duration = Date.now() - startTime;

        return {
            success: allErrors.length === 0,
            results: allResults,
            errors: allErrors,
            summary: {
                total: items.length,
                succeeded: allResults.length,
                failed: allErrors.length,
                duration,
            },
        };
    }

    /**
     * تنفيذ عمليات متوازية مع حد للتوازي
     */
    async executeWithConcurrencyLimit<T, R>(
        items: T[],
        processor: (item: T) => Promise<R>,
        concurrencyLimit: number = BATCH_CONFIG.MAX_CONCURRENCY,
    ): Promise<{ results: R[]; errors: Error[] }> {
        const results: R[] = [];
        const errors: Error[] = [];
        const executing: Promise<void>[] = [];

        for (const item of items) {
            const promise = (async () => {
                try {
                    const result = await processor(item);
                    results.push(result);
                } catch (error) {
                    errors.push(error as Error);
                }
            })();

            executing.push(promise);

            if (executing.length >= concurrencyLimit) {
                await Promise.race(executing);
                // إزالة الـ promises المكتملة
                const completed = executing.findIndex(
                    (p) => p === Promise.resolve(p),
                );
                if (completed !== -1) {
                    executing.splice(completed, 1);
                }
            }
        }

        // انتظار كل الـ promises المتبقية
        await Promise.all(executing);

        return { results, errors };
    }

    /**
     * التحقق من أن الخطأ قابل لإعادة المحاولة
     */
    private isRetryableError(error: any): boolean {
        // Prisma errors
        if (error.code) {
            const retryableCodes = [
                'P1008', // Operations timed out
                'P1017', // Server has closed the connection
                'P2024', // Connection timed out
                'P2034', // Transaction failed due to conflict
            ];
            return retryableCodes.includes(error.code);
        }

        // Generic errors
        const message = error.message?.toLowerCase() || '';
        const retryableMessages = [
            'deadlock',
            'timeout',
            'connection',
            'econnrefused',
            'econnreset',
        ];
        return retryableMessages.some((m) => message.includes(m));
    }

    /**
     * انتظار
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
