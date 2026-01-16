"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RetryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryService = void 0;
const common_1 = require("@nestjs/common");
const DEFAULT_RETRY_OPTIONS = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    exponentialBackoff: true,
};
let RetryService = RetryService_1 = class RetryService {
    constructor() {
        this.logger = new common_1.Logger(RetryService_1.name);
        this.FAILURE_THRESHOLD = 5;
        this.RECOVERY_TIMEOUT_MS = 30000;
        this.SUCCESS_THRESHOLD = 2;
        this.circuits = new Map();
    }
    async executeWithRetry(operation, serviceName, options = {}) {
        const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
        if (!this.canExecute(serviceName)) {
            throw new Error(`Circuit breaker open for ${serviceName}`);
        }
        let lastError;
        for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
            try {
                const result = await operation();
                this.recordSuccess(serviceName);
                return result;
            }
            catch (error) {
                lastError = error;
                this.logger.warn(`Attempt ${attempt + 1}/${opts.maxRetries + 1} failed for ${serviceName}: ${error.message}`);
                this.recordFailure(serviceName);
                if (attempt < opts.maxRetries) {
                    const delay = this.calculateDelay(attempt, opts);
                    await this.sleep(delay);
                }
            }
        }
        throw lastError || new Error(`All ${opts.maxRetries + 1} attempts failed`);
    }
    calculateDelay(attempt, options) {
        if (!options.exponentialBackoff) {
            return options.baseDelayMs;
        }
        const delay = options.baseDelayMs * Math.pow(2, attempt);
        const jitter = Math.random() * 0.3 * delay;
        return Math.min(delay + jitter, options.maxDelayMs);
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    canExecute(serviceName) {
        const circuit = this.getCircuit(serviceName);
        switch (circuit.state) {
            case 'closed':
                return true;
            case 'open':
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
    recordSuccess(serviceName) {
        const circuit = this.getCircuit(serviceName);
        if (circuit.state === 'half-open') {
            circuit.successesSinceHalfOpen++;
            if (circuit.successesSinceHalfOpen >= this.SUCCESS_THRESHOLD) {
                circuit.state = 'closed';
                circuit.failures = 0;
                this.logger.log(`Circuit ${serviceName} closed after recovery`);
            }
        }
        else if (circuit.state === 'closed') {
            circuit.failures = Math.max(0, circuit.failures - 1);
        }
    }
    recordFailure(serviceName) {
        const circuit = this.getCircuit(serviceName);
        circuit.failures++;
        circuit.lastFailure = Date.now();
        if (circuit.state === 'half-open') {
            circuit.state = 'open';
            this.logger.warn(`Circuit ${serviceName} re-opened after failure in half-open`);
        }
        else if (circuit.state === 'closed' && circuit.failures >= this.FAILURE_THRESHOLD) {
            circuit.state = 'open';
            this.logger.warn(`Circuit ${serviceName} opened after ${this.FAILURE_THRESHOLD} failures`);
        }
    }
    getCircuit(serviceName) {
        if (!this.circuits.has(serviceName)) {
            this.circuits.set(serviceName, {
                state: 'closed',
                failures: 0,
                lastFailure: 0,
                successesSinceHalfOpen: 0,
            });
        }
        return this.circuits.get(serviceName);
    }
    getCircuitStatus(serviceName) {
        return { ...this.getCircuit(serviceName) };
    }
    resetCircuit(serviceName) {
        this.circuits.delete(serviceName);
        this.logger.log(`Circuit ${serviceName} reset`);
    }
    getAllCircuitStatuses() {
        const result = {};
        for (const [name, state] of this.circuits.entries()) {
            result[name] = { ...state };
        }
        return result;
    }
};
exports.RetryService = RetryService;
exports.RetryService = RetryService = RetryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], RetryService);
//# sourceMappingURL=retry.service.js.map