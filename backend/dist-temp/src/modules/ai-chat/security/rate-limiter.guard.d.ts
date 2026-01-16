import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class RateLimiterGuard implements CanActivate {
    private readonly logger;
    private readonly WINDOW_MS;
    private readonly MAX_REQUESTS;
    private readonly VIOLATION_THRESHOLD;
    private readonly BLOCK_DURATION_MS;
    private readonly CLEANUP_INTERVAL_MS;
    private readonly requestMap;
    constructor();
    canActivate(context: ExecutionContext): Promise<boolean>;
    private cleanup;
    getStatus(): {
        totalTracked: number;
        blockedUsers: number;
        topOffenders: {
            userId: string;
            violations: number;
        }[];
    };
    unblockUser(userId: string): boolean;
}
