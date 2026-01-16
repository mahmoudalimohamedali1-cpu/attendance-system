export interface RetryOptions {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    exponentialBackoff: boolean;
}
interface CircuitState {
    state: 'closed' | 'open' | 'half-open';
    failures: number;
    lastFailure: number;
    successesSinceHalfOpen: number;
}
export declare class RetryService {
    private readonly logger;
    private readonly FAILURE_THRESHOLD;
    private readonly RECOVERY_TIMEOUT_MS;
    private readonly SUCCESS_THRESHOLD;
    private circuits;
    constructor();
    executeWithRetry<T>(operation: () => Promise<T>, serviceName: string, options?: Partial<RetryOptions>): Promise<T>;
    private calculateDelay;
    private sleep;
    private canExecute;
    private recordSuccess;
    private recordFailure;
    private getCircuit;
    getCircuitStatus(serviceName: string): CircuitState;
    resetCircuit(serviceName: string): void;
    getAllCircuitStatuses(): Record<string, CircuitState>;
}
export {};
