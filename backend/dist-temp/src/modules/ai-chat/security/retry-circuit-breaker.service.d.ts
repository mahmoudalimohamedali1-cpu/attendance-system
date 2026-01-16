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
export declare class RetryCircuitBreakerService {
    private readonly logger;
    private readonly DEFAULT_CONFIG;
    private readonly circuits;
    private readonly FAILURE_THRESHOLD;
    private readonly RECOVERY_TIME_MS;
    executeWithRetry<T>(operation: () => Promise<T>, operationName: string, config?: Partial<RetryConfig>): Promise<RetryResult<T>>;
    private withTimeout;
    private calculateDelay;
    private isRetryable;
    private sleep;
    private getCircuit;
    private recordFailure;
    private resetCircuit;
    getCircuitStatus(): Record<string, {
        state: string;
        failures: number;
    }>;
    resetAllCircuits(): void;
}
