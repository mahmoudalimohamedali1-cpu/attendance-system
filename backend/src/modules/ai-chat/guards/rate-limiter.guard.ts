import {
    Injectable,
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';

/**
 * 🚦 Rate Limiter Guard
 * Prevents API abuse by limiting requests per user
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

@Injectable()
export class RateLimiterGuard implements CanActivate {
    private readonly logger = new Logger(RateLimiterGuard.name);
    private readonly limiters: Map<string, RateLimitEntry> = new Map();

    // Configuration
    private readonly MAX_REQUESTS = 30; // requests per window
    private readonly WINDOW_MS = 60000; // 1 minute window
    private readonly BLOCK_DURATION_MS = 300000; // 5 minute block for abuse

    // Track blocked users
    private readonly blocked: Map<string, number> = new Map();

    constructor() {
        // Periodic cleanup
        setInterval(() => this.cleanup(), 60000);
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const userId = request.user?.id || request.ip;
        const key = `${userId}:ai-chat`;

        // Check if blocked
        const blockedUntil = this.blocked.get(key);
        if (blockedUntil && Date.now() < blockedUntil) {
            const remainingMs = blockedUntil - Date.now();
            throw new HttpException(
                {
                    statusCode: HttpStatus.TOO_MANY_REQUESTS,
                    message: `تم حظرك مؤقتاً. حاول بعد ${Math.ceil(remainingMs / 1000)} ثانية`,
                    retryAfter: Math.ceil(remainingMs / 1000),
                },
                HttpStatus.TOO_MANY_REQUESTS
            );
        }

        const now = Date.now();
        let entry = this.limiters.get(key);

        if (!entry || now >= entry.resetTime) {
            // New window
            entry = {
                count: 1,
                resetTime: now + this.WINDOW_MS,
            };
            this.limiters.set(key, entry);
            return true;
        }

        entry.count++;

        if (entry.count > this.MAX_REQUESTS) {
            // Too many requests - check if should block
            if (entry.count > this.MAX_REQUESTS * 2) {
                // Severe abuse - block for longer
                this.blocked.set(key, now + this.BLOCK_DURATION_MS);
                this.logger.warn(`User ${userId} blocked for rate limit abuse`);
            }

            const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
            throw new HttpException(
                {
                    statusCode: HttpStatus.TOO_MANY_REQUESTS,
                    message: `تم تجاوز الحد الأقصى للطلبات. حاول بعد ${retryAfter} ثانية`,
                    retryAfter,
                },
                HttpStatus.TOO_MANY_REQUESTS
            );
        }

        return true;
    }

    /**
     * 🧹 Cleanup expired entries
     */
    private cleanup(): void {
        const now = Date.now();
        let cleaned = 0;

        // Clean rate limit entries
        for (const [key, entry] of this.limiters.entries()) {
            if (now >= entry.resetTime) {
                this.limiters.delete(key);
                cleaned++;
            }
        }

        // Clean expired blocks
        for (const [key, blockedUntil] of this.blocked.entries()) {
            if (now >= blockedUntil) {
                this.blocked.delete(key);
            }
        }

        if (cleaned > 0) {
            this.logger.debug(`Cleaned ${cleaned} expired rate limit entries`);
        }
    }

    /**
     * 📊 Get rate limit stats
     */
    getStats(): {
        activeEntries: number;
        blockedUsers: number;
    } {
        return {
            activeEntries: this.limiters.size,
            blockedUsers: this.blocked.size,
        };
    }

    /**
     * 🔓 Manually unblock a user
     */
    unblockUser(userId: string): void {
        const key = `${userId}:ai-chat`;
        this.blocked.delete(key);
        this.limiters.delete(key);
    }
}
