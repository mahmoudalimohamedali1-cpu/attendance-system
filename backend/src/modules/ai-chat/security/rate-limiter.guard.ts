import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, Logger } from '@nestjs/common';

/**
 * 🔐 Rate Limiter Guard
 * Fixes: #11 - No rate limiting vulnerability
 * 
 * Prevents API abuse by limiting requests per user.
 * Uses sliding window algorithm with exponential backoff for abusers.
 */

interface RateLimitEntry {
    requests: number;
    windowStart: number;
    blocked: boolean;
    blockedUntil?: number;
    violations: number;
}

@Injectable()
export class RateLimiterGuard implements CanActivate {
    private readonly logger = new Logger(RateLimiterGuard.name);

    // Configuration
    private readonly WINDOW_MS = 60 * 1000; // 1 minute window
    private readonly MAX_REQUESTS = 30; // 30 requests per minute
    private readonly VIOLATION_THRESHOLD = 3; // Block after 3 violations
    private readonly BLOCK_DURATION_MS = 5 * 60 * 1000; // 5 minute block
    private readonly CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // Cleanup every 10 min

    // Request tracking (in production, use Redis)
    private readonly requestMap: Map<string, RateLimitEntry> = new Map();

    constructor() {
        // Periodic cleanup to prevent memory leak
        setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL_MS);
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const userId = request.user?.id || request.ip || 'anonymous';
        const now = Date.now();

        let entry = this.requestMap.get(userId);

        // Initialize new entry
        if (!entry) {
            entry = {
                requests: 0,
                windowStart: now,
                blocked: false,
                violations: 0,
            };
            this.requestMap.set(userId, entry);
        }

        // Check if currently blocked
        if (entry.blocked && entry.blockedUntil) {
            if (now < entry.blockedUntil) {
                const remainingMs = entry.blockedUntil - now;
                const remainingSec = Math.ceil(remainingMs / 1000);

                this.logger.warn(`Blocked request from ${userId} - ${remainingSec}s remaining`);

                throw new HttpException(
                    {
                        statusCode: HttpStatus.TOO_MANY_REQUESTS,
                        message: `تم حظرك مؤقتاً. حاول بعد ${remainingSec} ثانية`,
                        retryAfter: remainingSec,
                    },
                    HttpStatus.TOO_MANY_REQUESTS
                );
            } else {
                // Block expired
                entry.blocked = false;
                entry.blockedUntil = undefined;
                entry.requests = 0;
                entry.windowStart = now;
            }
        }

        // Reset window if expired
        if (now - entry.windowStart > this.WINDOW_MS) {
            entry.requests = 0;
            entry.windowStart = now;
        }

        // Increment request count
        entry.requests++;

        // Check if over limit
        if (entry.requests > this.MAX_REQUESTS) {
            entry.violations++;

            this.logger.warn(`Rate limit exceeded for ${userId} - violation ${entry.violations}`);

            // Block if too many violations
            if (entry.violations >= this.VIOLATION_THRESHOLD) {
                const blockDuration = this.BLOCK_DURATION_MS * Math.pow(2, entry.violations - this.VIOLATION_THRESHOLD);
                entry.blocked = true;
                entry.blockedUntil = now + Math.min(blockDuration, 60 * 60 * 1000); // Max 1 hour

                this.logger.warn(`User ${userId} blocked for ${blockDuration / 1000}s`);
            }

            throw new HttpException(
                {
                    statusCode: HttpStatus.TOO_MANY_REQUESTS,
                    message: 'طلبات كثيرة جداً. انتظر دقيقة ثم حاول مرة أخرى',
                    retryAfter: 60,
                },
                HttpStatus.TOO_MANY_REQUESTS
            );
        }

        return true;
    }

    /**
     * 🧹 Cleanup old entries to prevent memory leak
     */
    private cleanup(): void {
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

    /**
     * 📊 Get rate limit status (for admin)
     */
    getStatus(): {
        totalTracked: number;
        blockedUsers: number;
        topOffenders: { userId: string; violations: number }[];
    } {
        const blockedUsers = [];
        const offenders: { userId: string; violations: number }[] = [];

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

    /**
     * 🔓 Unblock a user (admin only)
     */
    unblockUser(userId: string): boolean {
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
}
