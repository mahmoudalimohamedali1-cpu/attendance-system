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
var RateLimiterGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiterGuard = void 0;
const common_1 = require("@nestjs/common");
let RateLimiterGuard = RateLimiterGuard_1 = class RateLimiterGuard {
    constructor() {
        this.logger = new common_1.Logger(RateLimiterGuard_1.name);
        this.WINDOW_MS = 60 * 1000;
        this.MAX_REQUESTS = 30;
        this.VIOLATION_THRESHOLD = 3;
        this.BLOCK_DURATION_MS = 5 * 60 * 1000;
        this.CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
        this.requestMap = new Map();
        setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL_MS);
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const userId = request.user?.id || request.ip || 'anonymous';
        const now = Date.now();
        let entry = this.requestMap.get(userId);
        if (!entry) {
            entry = {
                requests: 0,
                windowStart: now,
                blocked: false,
                violations: 0,
            };
            this.requestMap.set(userId, entry);
        }
        if (entry.blocked && entry.blockedUntil) {
            if (now < entry.blockedUntil) {
                const remainingMs = entry.blockedUntil - now;
                const remainingSec = Math.ceil(remainingMs / 1000);
                this.logger.warn(`Blocked request from ${userId} - ${remainingSec}s remaining`);
                throw new common_1.HttpException({
                    statusCode: common_1.HttpStatus.TOO_MANY_REQUESTS,
                    message: `تم حظرك مؤقتاً. حاول بعد ${remainingSec} ثانية`,
                    retryAfter: remainingSec,
                }, common_1.HttpStatus.TOO_MANY_REQUESTS);
            }
            else {
                entry.blocked = false;
                entry.blockedUntil = undefined;
                entry.requests = 0;
                entry.windowStart = now;
            }
        }
        if (now - entry.windowStart > this.WINDOW_MS) {
            entry.requests = 0;
            entry.windowStart = now;
        }
        entry.requests++;
        if (entry.requests > this.MAX_REQUESTS) {
            entry.violations++;
            this.logger.warn(`Rate limit exceeded for ${userId} - violation ${entry.violations}`);
            if (entry.violations >= this.VIOLATION_THRESHOLD) {
                const blockDuration = this.BLOCK_DURATION_MS * Math.pow(2, entry.violations - this.VIOLATION_THRESHOLD);
                entry.blocked = true;
                entry.blockedUntil = now + Math.min(blockDuration, 60 * 60 * 1000);
                this.logger.warn(`User ${userId} blocked for ${blockDuration / 1000}s`);
            }
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.TOO_MANY_REQUESTS,
                message: 'طلبات كثيرة جداً. انتظر دقيقة ثم حاول مرة أخرى',
                retryAfter: 60,
            }, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        return true;
    }
    cleanup() {
        const now = Date.now();
        const cutoff = now - this.WINDOW_MS * 2;
        let cleaned = 0;
        for (const [userId, entry] of this.requestMap) {
            if (entry.windowStart < cutoff && !entry.blocked) {
                this.requestMap.delete(userId);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            this.logger.debug(`Cleaned up ${cleaned} rate limit entries`);
        }
    }
    getStatus() {
        const blockedUsers = [];
        const offenders = [];
        for (const [userId, entry] of this.requestMap) {
            if (entry.blocked) {
                blockedUsers.push(userId);
            }
            if (entry.violations > 0) {
                offenders.push({ userId, violations: entry.violations });
            }
        }
        return {
            totalTracked: this.requestMap.size,
            blockedUsers: blockedUsers.length,
            topOffenders: offenders.sort((a, b) => b.violations - a.violations).slice(0, 10),
        };
    }
    unblockUser(userId) {
        const entry = this.requestMap.get(userId);
        if (entry) {
            entry.blocked = false;
            entry.blockedUntil = undefined;
            entry.violations = 0;
            entry.requests = 0;
            return true;
        }
        return false;
    }
};
exports.RateLimiterGuard = RateLimiterGuard;
exports.RateLimiterGuard = RateLimiterGuard = RateLimiterGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], RateLimiterGuard);
//# sourceMappingURL=rate-limiter.guard.js.map