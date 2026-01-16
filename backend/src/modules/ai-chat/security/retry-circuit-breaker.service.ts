import { Injectable, Logger } from '@nestjs/common';

/**
 * 🔄 Retry & Circuit Breaker Service
 * Fixes: #54, #55, #56, #57, #60 - Error handling issues
 * 
 * Implements retry logic with exponential backoff.
 * Circuit breaker prevents cascading failures.
 * Request timeout handling.
 */

export interface RetryConfig {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    timeoutMs: number;
    retryableErrors?: string[];
}

export interface RetryResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    attempts: number;
    totalTimeMs: number;
}

interface CircuitState {
    failures: number;
    lastFailure: number;
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    nextRetry: number;
}

@Injectable()
export class RetryCircuitBreakerService {
    private readonly logger = new Logger(RetryCircuitBreakerService.name);

    // Default config
    private readonly DEFAULT_CONFIG: RetryConfig = {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        timeoutMs: 30000,
        retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', '429', '503', '504'],
    };

    // Circuit breaker states per operation
    private readonly circuits: Map<string, CircuitState> = new Map();

    // Circuit breaker config
    private readonly FAILURE_THRESHOLD = 5;
    private readonly RECOVERY_TIME_MS = 60000; // 1 minute

    /**
     * 🔄 Execute with retry and timeout
     */
    async executeWithRetry<T>(
        operation: () => Promise<T>,
        operationName: string,
        config?: Partial<RetryConfig>
    ): Promise<RetryResult<T>> {
        const cfg = { ...this.DEFAULT_CONFIG, ...config };
        const startTime = Date.now();
        let attempts = 0;
        let lastError: Error | null = null;

        // Check circuit breaker
        const circuit = this.getCircuit(operationName);
        if (circuit.state === 'OPEN') {
            const remainingMs = circuit.nextRetry - Date.now();
            if (remainingMs > 0) {
                return {
                    success: false,
                    error: `Circuit open. Retry in ${Math.ceil(remainingMs / 1000)}s`,
                    attempts: 0,
                    totalTimeMs: 0,
                };
            }
            // Try half-open
            circuit.state = 'HALF_OPEN';
        }

        while (attempts < cfg.maxRetries) {
            attempts++;

            try {
                // Execute with timeout
                const result = await this.withTimeout(operation(), cfg.timeoutMs);

                // Success - reset circuit
                this.resetCircuit(operationName);

                return {
                    success: true,
                    data: result,
                    attempts,
                    totalTimeMs: Date.now() - startTime,
                };
            } catch (error: any) {
                lastError = error;
                this.logger.warn(`${operationName} attempt ${attempts} failed: ${error.message}`);

                // Check if error is retryable
                if (!this.isRetryable(error, cfg.retryableErrors!)) {
                    break;
                }

                // Don't wait after last attempt
                if (attempts < cfg.maxRetries) {
                    const delay = this.calculateDelay(attempts, cfg.baseDelayMs, cfg.maxDelayMs);
                    await this.sleep(delay);
                }
            }
        }

        // All retries failed - update circuit breaker
        this.recordFailure(operationName);

        return {
            success: false,
            error: lastError?.message || 'Unknown error',
            attempts,
            totalTimeMs: Date.now() - startTime,
        };
    }

    /**
     * ⏱️ Execute with timeout
     */
    private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
        let timeoutHandle: NodeJS.Timeout;

        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(() => {
                reject(new Error(`Operation timed out after ${timeoutMs}ms`));
            }, timeoutMs);
        });

        return Promise.race([promise, timeoutPromise]).finally(() => {
            clearTimeout(timeoutHandle);
        });
    }

    /**
     * 🔢 Calculate delay with exponential backoff + jitter
     */
    private calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
        const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 0.3 * exponentialDelay; // 30% jitter
        return Math.min(exponentialDelay + jitter, maxDelay);
    }

    /**
     * 🔍 Check if error is retryable
     */
    private isRetryable(error: Error, retryablePatterns: string[]): boolean {
        const errorStr = error.message + (error.name || '');
        return retryablePatterns.some(pattern =>
            errorStr.toLowerCase().includes(pattern.toLowerCase())
        );
    }

    /**
     * 💤 Sleep helper
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 🔌 Get or create circuit state
     */
    private getCircuit(name: string): CircuitState {
        if (!this.circuits.has(name)) {
            this.circuits.set(name, {
                failures: 0,
                lastFailure: 0,
                state: 'CLOSED',
                nextRetry: 0,
            });
        }
        return this.circuits.get(name)!;
    }

    /**
     * ❌ Record failure for circuit breaker
     */
    private recordFailure(name: string): void {
        const circuit = this.getCircuit(name);
        circuit.failures++;
        circuit.lastFailure = Date.now();

        if (circuit.failures >= this.FAILURE_THRESHOLD) {
            circuit.state = 'OPEN';
            circuit.nextRetry = Date.now() + this.RECOVERY_TIME_MS;
            this.logger.error(`Circuit breaker OPEN for ${name}`);
        }
    }

    /**
     * ✅ Reset circuit on success
     */
    private resetCircuit(name: string): void {
        const circuit = this.getCircuit(name);
        if (circuit.state !== 'CLOSED') {
            this.logger.log(`Circuit breaker CLOSED for ${name}`);
        }
        circuit.failures = 0;
        circuit.state = 'CLOSED';
    }

    /**
     * 📊 Get circuit status (for monitoring)
     */
    getCircuitStatus(): Record<string, { state: string; failures: number }> {
        const status: Record<string, { state: string; failures: number }> = {};
        for (const [name, circuit] of this.circuits) {
            status[name] = {
                state: circuit.state,
                failures: circuit.failures,
            };
        }
        return status;
    }

    /**
     * 🔄 Manual circuit reset (admin only)
     */
    resetAllCircuits(): void {
        for (const circuit of this.circuits.values()) {
            circuit.failures = 0;
            circuit.state = 'CLOSED';
            circuit.nextRetry = 0;
        }
        this.logger.log('All circuits manually reset');
    }
}
