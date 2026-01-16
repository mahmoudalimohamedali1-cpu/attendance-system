"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var RetryCircuitBreakerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryCircuitBreakerService = void 0;
const common_1 = require("@nestjs/common");
let RetryCircuitBreakerService = RetryCircuitBreakerService_1 = class RetryCircuitBreakerService {
    constructor() {
        this.logger = new common_1.Logger(RetryCircuitBreakerService_1.name);
        this.DEFAULT_CONFIG = {
            maxRetries: 3,
            baseDelayMs: 1000,
            maxDelayMs: 10000,
            timeoutMs: 30000,
            retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', '429', '503', '504'],
        };
        this.circuits = new Map();
        this.FAILURE_THRESHOLD = 5;
        this.RECOVERY_TIME_MS = 60000;
    }
    async executeWithRetry(operation, operationName, config) {
        const cfg = { ...this.DEFAULT_CONFIG, ...config };
        const startTime = Date.now();
        let attempts = 0;
        let lastError = null;
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
            circuit.state = 'HALF_OPEN';
        }
        while (attempts < cfg.maxRetries) {
            attempts++;
            try {
                const result = await this.withTimeout(operation(), cfg.timeoutMs);
                this.resetCircuit(operationName);
                return {
                    success: true,
                    data: result,
                    attempts,
                    totalTimeMs: Date.now() - startTime,
                };
            }
            catch (error) {
                lastError = error;
                this.logger.warn(`${operationName} attempt ${attempts} failed: ${error.message}`);
                if (!this.isRetryable(error, cfg.retryableErrors)) {
                    break;
                }
                if (attempts < cfg.maxRetries) {
                    const delay = this.calculateDelay(attempts, cfg.baseDelayMs, cfg.maxDelayMs);
                    await this.sleep(delay);
                }
            }
        }
        this.recordFailure(operationName);
        return {
            success: false,
            error: lastError?.message || 'Unknown error',
            attempts,
            totalTimeMs: Date.now() - startTime,
        };
    }
    async withTimeout(promise, timeoutMs) {
        let timeoutHandle;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutHandle = setTimeout(() => {
                reject(new Error(`Operation timed out after ${timeoutMs}ms`));
            }, timeoutMs);
        });
        return Promise.race([promise, timeoutPromise]).finally(() => {
            clearTimeout(timeoutHandle);
        });
    }
    calculateDelay(attempt, baseDelay, maxDelay) {
        const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 0.3 * exponentialDelay;
        return Math.min(exponentialDelay + jitter, maxDelay);
    }
    isRetryable(error, retryablePatterns) {
        const errorStr = error.message + (error.name || '');
        return retryablePatterns.some(pattern => errorStr.toLowerCase().includes(pattern.toLowerCase()));
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    getCircuit(name) {
        if (!this.circuits.has(name)) {
            this.circuits.set(name, {
                failures: 0,
                lastFailure: 0,
                state: 'CLOSED',
                nextRetry: 0,
            });
        }
        return this.circuits.get(name);
    }
    recordFailure(name) {
        const circuit = this.getCircuit(name);
        circuit.failures++;
        circuit.lastFailure = Date.now();
        if (circuit.failures >= this.FAILURE_THRESHOLD) {
            circuit.state = 'OPEN';
            circuit.nextRetry = Date.now() + this.RECOVERY_TIME_MS;
            this.logger.error(`Circuit breaker OPEN for ${name}`);
        }
    }
    resetCircuit(name) {
        const circuit = this.getCircuit(name);
        if (circuit.state !== 'CLOSED') {
            this.logger.log(`Circuit breaker CLOSED for ${name}`);
        }
        circuit.failures = 0;
        circuit.state = 'CLOSED';
    }
    getCircuitStatus() {
        const status = {};
        for (const [name, circuit] of this.circuits) {
            status[name] = {
                state: circuit.state,
                failures: circuit.failures,
            };
        }
        return status;
    }
    resetAllCircuits() {
        for (const circuit of this.circuits.values()) {
            circuit.failures = 0;
            circuit.state = 'CLOSED';
            circuit.nextRetry = 0;
        }
        this.logger.log('All circuits manually reset');
    }
};
exports.RetryCircuitBreakerService = RetryCircuitBreakerService;
exports.RetryCircuitBreakerService = RetryCircuitBreakerService = RetryCircuitBreakerService_1 = __decorate([
    (0, common_1.Injectable)()
], RetryCircuitBreakerService);
//# sourceMappingURL=retry-circuit-breaker.service.js.map