import { Injectable, Logger } from '@nestjs/common';

/**
 * 🔒 Policy Retry Service
 * خدمة إعادة المحاولة للعمليات الفاشلة
 * 
 * Features:
 * - Exponential backoff
 * - Circuit breaker pattern
 * - Jitter لتجنب thundering herd
 * - Configurable retry strategies
 * - Timeout handling
 */

// ============== Types ==============

export interface RetryOptions {
    /** الحد الأقصى للمحاولات */
    maxAttempts?: number;
    /** التأخير الأولي بالـ milliseconds */
    initialDelay?: number;
    /** الحد الأقصى للتأخير */
    maxDelay?: number;
    /** معامل الضرب للـ exponential backoff */
    multiplier?: number;
    /** إضافة jitter */
    jitter?: boolean;
    /** timeout للعملية */
    timeout?: number;
    /** فحص إذا الخطأ قابل لإعادة المحاولة */
    retryCondition?: (error: Error) => boolean;
    /** callback عند كل محاولة */
    onRetry?: (attempt: number, error: Error) => void;
}

export interface RetryResult<T> {
    success: boolean;
    result?: T;
    error?: Error;
    attempts: number;
    totalDuration: number;
}

export interface CircuitBreakerState {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failureCount: number;
    lastFailure: number | null;
    successCount: number;
}

// ============== Implementation ==============

@Injectable()
export class PolicyRetryService {
    private readonly logger = new Logger(PolicyRetryService.name);
    
    // Circuit breakers لكل service
    private readonly circuitBreakers = new Map<string, CircuitBreakerState>();
    
    // إعدادات الـ circuit breaker
    private readonly FAILURE_THRESHOLD = 5;
    private readonly RECOVERY_TIMEOUT_MS = 60000; // دقيقة
    private readonly HALF_OPEN_MAX_ATTEMPTS = 3;

    /**
     * تنفيذ عملية مع retry
     */
    async retry<T>(
        operation: () => Promise<T>,
        options: RetryOptions = {},
    ): Promise<RetryResult<T>> {
        const {
            maxAttempts = 3,
            initialDelay = 1000,
            maxDelay = 30000,
            multiplier = 2,
            jitter = true,
            timeout,
            retryCondition = this.defaultRetryCondition,
            onRetry,
        } = options;

        const startTime = Date.now();
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                // تنفيذ العملية مع timeout إذا محدد
                const result = timeout
                    ? await this.withTimeout(operation(), timeout)
                    : await operation();

                return {
                    success: true,
                    result,
                    attempts: attempt,
                    totalDuration: Date.now() - startTime,
                };
            } catch (error) {
                lastError = error as Error;

                this.logger.warn(
                    `Attempt ${attempt}/${maxAttempts} failed: ${error.message}`,
                );

                // التحقق من إمكانية إعادة المحاولة
                if (!retryCondition(lastError)) {
                    this.logger.debug(
                        `Error is not retryable, stopping retry`,
                    );
                    break;
                }

                // callback إذا موجود
                if (onRetry) {
                    onRetry(attempt, lastError);
                }

                // إذا هذه آخر محاولة، لا ننتظر
                if (attempt < maxAttempts) {
                    const delay = this.calculateDelay(
                        attempt,
                        initialDelay,
                        maxDelay,
                        multiplier,
                        jitter,
                    );
                    this.logger.debug(`Waiting ${delay}ms before retry`);
                    await this.sleep(delay);
                }
            }
        }

        return {
            success: false,
            error: lastError || new Error('Unknown error'),
            attempts: maxAttempts,
            totalDuration: Date.now() - startTime,
        };
    }

    /**
     * تنفيذ عملية مع circuit breaker
     */
    async executeWithCircuitBreaker<T>(
        serviceKey: string,
        operation: () => Promise<T>,
        options: RetryOptions = {},
    ): Promise<RetryResult<T>> {
        const state = this.getCircuitBreakerState(serviceKey);

        // التحقق من حالة الـ circuit breaker
        if (state.state === 'OPEN') {
            // التحقق من انتهاء فترة الانتظار
            if (Date.now() - (state.lastFailure || 0) > this.RECOVERY_TIMEOUT_MS) {
                // الانتقال لـ HALF_OPEN
                state.state = 'HALF_OPEN';
                state.successCount = 0;
                this.logger.log(
                    `Circuit breaker for ${serviceKey} moving to HALF_OPEN`,
                );
            } else {
                // Circuit مفتوح، نرفض العملية
                return {
                    success: false,
                    error: new Error(`Circuit breaker is OPEN for ${serviceKey}`),
                    attempts: 0,
                    totalDuration: 0,
                };
            }
        }

        try {
            const result = await this.retry(operation, options);

            if (result.success) {
                this.recordSuccess(serviceKey, state);
            } else {
                this.recordFailure(serviceKey, state, result.error!);
            }

            return result;
        } catch (error) {
            this.recordFailure(serviceKey, state, error as Error);
            throw error;
        }
    }

    /**
     * تنفيذ عملية AI مع retry مُحسّن
     */
    async retryAIOperation<T>(
        operation: () => Promise<T>,
        serviceName: string = 'AI',
    ): Promise<T> {
        const result = await this.executeWithCircuitBreaker(
            serviceName,
            operation,
            {
                maxAttempts: 3,
                initialDelay: 2000,
                maxDelay: 30000,
                multiplier: 2,
                jitter: true,
                timeout: 60000, // دقيقة
                retryCondition: this.aiRetryCondition,
                onRetry: (attempt, error) => {
                    this.logger.warn(
                        `${serviceName} operation retry ${attempt}: ${error.message}`,
                    );
                },
            },
        );

        if (result.success) {
            return result.result!;
        }

        throw result.error;
    }

    /**
     * إعادة تعيين circuit breaker
     */
    resetCircuitBreaker(serviceKey: string): void {
        this.circuitBreakers.delete(serviceKey);
        this.logger.log(`Circuit breaker reset for ${serviceKey}`);
    }

    /**
     * جلب حالة circuit breaker
     */
    getCircuitBreakerStatus(serviceKey: string): CircuitBreakerState {
        return this.getCircuitBreakerState(serviceKey);
    }

    /**
     * جلب حالات جميع الـ circuit breakers
     */
    getAllCircuitBreakerStatus(): Map<string, CircuitBreakerState> {
        return new Map(this.circuitBreakers);
    }

    // ============== Private Methods ==============

    /**
     * جلب أو إنشاء حالة circuit breaker
     */
    private getCircuitBreakerState(serviceKey: string): CircuitBreakerState {
        let state = this.circuitBreakers.get(serviceKey);
        
        if (!state) {
            state = {
                state: 'CLOSED',
                failureCount: 0,
                lastFailure: null,
                successCount: 0,
            };
            this.circuitBreakers.set(serviceKey, state);
        }

        return state;
    }

    /**
     * تسجيل نجاح
     */
    private recordSuccess(serviceKey: string, state: CircuitBreakerState): void {
        if (state.state === 'HALF_OPEN') {
            state.successCount++;
            
            if (state.successCount >= this.HALF_OPEN_MAX_ATTEMPTS) {
                state.state = 'CLOSED';
                state.failureCount = 0;
                state.lastFailure = null;
                this.logger.log(
                    `Circuit breaker for ${serviceKey} is now CLOSED`,
                );
            }
        } else if (state.state === 'CLOSED') {
            // إعادة تعيين failure count عند النجاح
            state.failureCount = 0;
        }
    }

    /**
     * تسجيل فشل
     */
    private recordFailure(
        serviceKey: string,
        state: CircuitBreakerState,
        error: Error,
    ): void {
        state.failureCount++;
        state.lastFailure = Date.now();

        if (state.state === 'HALF_OPEN') {
            // فشل في HALF_OPEN = العودة لـ OPEN
            state.state = 'OPEN';
            this.logger.warn(
                `Circuit breaker for ${serviceKey} returned to OPEN after failure in HALF_OPEN`,
            );
        } else if (state.state === 'CLOSED') {
            if (state.failureCount >= this.FAILURE_THRESHOLD) {
                state.state = 'OPEN';
                this.logger.error(
                    `Circuit breaker for ${serviceKey} is now OPEN after ${state.failureCount} failures`,
                );
            }
        }
    }

    /**
     * حساب التأخير مع exponential backoff
     */
    private calculateDelay(
        attempt: number,
        initialDelay: number,
        maxDelay: number,
        multiplier: number,
        jitter: boolean,
    ): number {
        // Exponential backoff
        let delay = initialDelay * Math.pow(multiplier, attempt - 1);
        
        // تطبيق الحد الأقصى
        delay = Math.min(delay, maxDelay);
        
        // إضافة jitter (±25%)
        if (jitter) {
            const jitterFactor = 0.25;
            const jitterAmount = delay * jitterFactor * (Math.random() * 2 - 1);
            delay = Math.max(0, delay + jitterAmount);
        }
        
        return Math.round(delay);
    }

    /**
     * تنفيذ عملية مع timeout
     */
    private async withTimeout<T>(
        promise: Promise<T>,
        timeout: number,
    ): Promise<T> {
        return Promise.race([
            promise,
            new Promise<T>((_, reject) =>
                setTimeout(
                    () => reject(new Error(`Operation timed out after ${timeout}ms`)),
                    timeout,
                ),
            ),
        ]);
    }

    /**
     * الانتظار
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * شرط إعادة المحاولة الافتراضي
     */
    private defaultRetryCondition(error: Error): boolean {
        const message = error.message?.toLowerCase() || '';
        
        // أخطاء قابلة لإعادة المحاولة
        const retryablePatterns = [
            'timeout',
            'econnrefused',
            'econnreset',
            'etimedout',
            'network',
            'socket hang up',
            'connection',
            'rate limit',
            '429',
            '500',
            '502',
            '503',
            '504',
        ];

        return retryablePatterns.some((pattern) => message.includes(pattern));
    }

    /**
     * شرط إعادة المحاولة للـ AI
     */
    private aiRetryCondition(error: Error): boolean {
        const message = error.message?.toLowerCase() || '';
        
        // أخطاء AI قابلة لإعادة المحاولة
        const retryablePatterns = [
            'timeout',
            'rate limit',
            'overloaded',
            '429',
            '500',
            '502',
            '503',
            '504',
            'capacity',
            'busy',
        ];

        // أخطاء غير قابلة لإعادة المحاولة
        const nonRetryablePatterns = [
            'invalid',
            'unauthorized',
            '401',
            '403',
            'forbidden',
            'not found',
            '404',
        ];

        if (nonRetryablePatterns.some((p) => message.includes(p))) {
            return false;
        }

        return retryablePatterns.some((pattern) => message.includes(pattern));
    }
}
