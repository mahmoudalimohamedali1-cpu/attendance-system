import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class RateLimiterGuard implements CanActivate {
    private readonly logger;
    private readonly limiters;
    private readonly MAX_REQUESTS;
    private readonly WINDOW_MS;
    private readonly BLOCK_DURATION_MS;
    private readonly blocked;
    constructor();
    canActivate(context: ExecutionContext): Promise<boolean>;
    private cleanup;
    getStats(): {
        activeEntries: number;
        blockedUsers: number;
    };
    unblockUser(userId: string): void;
}
