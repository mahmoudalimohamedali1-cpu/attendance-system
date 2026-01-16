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
        this.limiters = new Map();
        this.MAX_REQUESTS = 30;
        this.WINDOW_MS = 60000;
        this.BLOCK_DURATION_MS = 300000;
        this.blocked = new Map();
        setInterval(() => this.cleanup(), 60000);
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const userId = request.user?.id || request.ip;
        const key = `${userId}:ai-chat`;
        const blockedUntil = this.blocked.get(key);
        if (blockedUntil && Date.now() < blockedUntil) {
            const remainingMs = blockedUntil - Date.now();
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.TOO_MANY_REQUESTS,
                message: `تم حظرك مؤقتاً. حاول بعد ${Math.ceil(remainingMs / 1000)} ثانية`,
                retryAfter: Math.ceil(remainingMs / 1000),
            }, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        const now = Date.now();
        let entry = this.limiters.get(key);
        if (!entry || now >= entry.resetTime) {
            entry = {
                count: 1,
                resetTime: now + this.WINDOW_MS,
            };
            this.limiters.set(key, entry);
            return true;
        }
        entry.count++;
        if (entry.count > this.MAX_REQUESTS) {
            if (entry.count > this.MAX_REQUESTS * 2) {
                this.blocked.set(key, now + this.BLOCK_DURATION_MS);
                this.logger.warn(`User ${userId} blocked for rate limit abuse`);
            }
            const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.TOO_MANY_REQUESTS,
                message: `تم تجاوز الحد الأقصى للطلبات. حاول بعد ${retryAfter} ثانية`,
                retryAfter,
            }, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        return true;
    }
    cleanup() {
        const now = Date.now();
        let cleaned = 0;
        for (const [key, entry] of this.limiters.entries()) {
            if (now >= entry.resetTime) {
                this.limiters.delete(key);
                cleaned++;
            }
        }
        for (const [key, blockedUntil] of this.blocked.entries()) {
            if (now >= blockedUntil) {
                this.blocked.delete(key);
            }
        }
        if (cleaned > 0) {
            this.logger.debug(`Cleaned ${cleaned} expired rate limit entries`);
        }
    }
    getStats() {
        return {
            activeEntries: this.limiters.size,
            blockedUsers: this.blocked.size,
        };
    }
    unblockUser(userId) {
        const key = `${userId}:ai-chat`;
        this.blocked.delete(key);
        this.limiters.delete(key);
    }
};
exports.RateLimiterGuard = RateLimiterGuard;
exports.RateLimiterGuard = RateLimiterGuard = RateLimiterGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], RateLimiterGuard);
//# sourceMappingURL=rate-limiter.guard.js.map