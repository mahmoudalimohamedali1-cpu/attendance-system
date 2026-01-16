import { Injectable, Logger } from '@nestjs/common';

/**
 * 🔄 Retry Service with Circuit Breaker
 * Provides retry logic and circuit breaker pattern for AI calls
 */

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

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    exponentialBackoff: true,
};

@Injectable()
export class RetryService {
    private readonly logger = new Logger(RetryService.name);

    // Circuit breaker settings
    private readonly FAILURE_THRESHOLD = 5;
    private readonly RECOVERY_TIMEOUT_MS = 30000;
    private readonly SUCCESS_THRESHOLD = 2;

    // Circuit states per service
    private circuits: Map<string, CircuitState> = new Map();

    constructor() { }

    /**
     * 🔄 Execute with retry and circuit breaker
     */
    async executeWithRetry<T>(
        operation: () => Promise<T>,
        serviceName: string,
        options: Partial<RetryOptions> = {}
    ): Promise<T> {
        const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };

        // Check circuit breaker
        if (!this.canExecute(serviceName)) {
            throw new Error(`Circuit breaker open for ${serviceName}`);
        }

        let lastError: Error | undefined;

        for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
            try {
                const result = await operation();
                this.recordSuccess(serviceName);
                return result;
            } catch (error) {
                lastError = error as Error;
                this.logger.warn(
                    `Attempt ${attempt + 1}/${opts.maxRetries + 1} failed for ${serviceName}: ${error.message}`
                );

                this.recordFailure(serviceName);

                // Don't wait after last attempt
                if (attempt < opts.maxRetries) {
                    const delay = this.calculateDelay(attempt, opts);
                    await this.sleep(delay);
                }
            }
        }

        throw lastError || new Error(`All ${opts.maxRetries + 1} attempts failed`);
    }

    /**
     * ⏱️ Calculate delay with exponential backoff
     */
    private calculateDelay(attempt: number, options: RetryOptions): number {
        if (!options.exponentialBackoff) {
            return options.baseDelayMs;
        }

        const delay = options.baseDelayMs * Math.pow(2, attempt);
        const jitter = Math.random() * 0.3 * delay; // Add up to 30% jitter
        return Math.min(delay + jitter, options.maxDelayMs);
    }

    /**
     * 😴 Sleep helper
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * ✅ Check if circuit allows execution
     */
    private canExecute(serviceName: string): boolean {
        const circuit = this.getCircuit(serviceName);

        switch (circuit.state) {
            case 'closed':
                return true;

            case 'open':
                // Check if recovery timeout has passed
                if (Date.now() - circuit.lastFailure > this.RECOVERY_TIMEOUT_MS) {
                    circuit.state = 'half-open';
                    circuit.successesSinceHalfOpen = 0;
                    this.logger.log(`Circuit ${serviceName} moved to half-open`);
                    return true;
                }
                return false;

            case 'half-open':
                return true;
        }
    }

    /**
     * ✅ Record successful execution
     */
    private recordSuccess(serviceName: string): void {
        const circuit = this.getCircuit(serviceName);

        if (circuit.state === 'half-open') {
            circuit.successesSinceHalfOpen++;

            if (circuit.successesSinceHalfOpen >= this.SUCCESS_THRESHOLD) {
                circuit.state = 'closed';
                circuit.failures = 0;
                this.logger.log(`Circuit ${serviceName} closed after recovery`);
            }
        } else if (circuit.state === 'closed') {
            // Reset failure count on success
            circuit.failures = Math.max(0, circuit.failures - 1);
        }
    }

    /**
     * ❌ Record failed execution
     */
    private recordFailure(serviceName: string): void {
        const circuit = this.getCircuit(serviceName);
        circuit.failures++;
        circuit.lastFailure = Date.now();

        if (circuit.state === 'half-open') {
            circuit.state = 'open';
            this.logger.warn(`Circuit ${serviceName} re-opened after failure in half-open`);
        } else if (circuit.state === 'closed' && circuit.failures >= this.FAILURE_THRESHOLD) {
            circuit.state = 'open';
            this.logger.warn(`Circuit ${serviceName} opened after ${this.FAILURE_THRESHOLD} failures`);
        }
    }

    /**
     * 🔧 Get or create circuit state
     */
    private getCircuit(serviceName: string): CircuitState {
        if (!this.circuits.has(serviceName)) {
            this.circuits.set(serviceName, {
                state: 'closed',
                failures: 0,
                lastFailure: 0,
                successesSinceHalfOpen: 0,
            });
        }
        return this.circuits.get(serviceName)!;
    }

    /**
     * 📊 Get circuit status
     */
    getCircuitStatus(serviceName: string): CircuitState {
        return { ...this.getCircuit(serviceName) };
    }

    /**
     * 🔄 Reset circuit
     */
    resetCircuit(serviceName: string): void {
        this.circuits.delete(serviceName);
        this.logger.log(`Circuit ${serviceName} reset`);
    }

    /**
     * 📋 Get all circuit statuses
     */
    getAllCircuitStatuses(): Record<string, CircuitState> {
        const result: Record<string, CircuitState> = {};
        for (const [name, state] of this.circuits.entries()) {
            result[name] = { ...state };
        }
        return result;
    }
}
