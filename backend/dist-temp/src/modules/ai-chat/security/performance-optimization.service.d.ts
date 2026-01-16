import { OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}
export interface PaginationParams {
    page?: number;
    limit?: number;
    skip?: number;
    take?: number;
}
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}
export declare class PerformanceOptimizationService implements OnModuleDestroy {
    private readonly prisma;
    private readonly logger;
    private readonly queryCache;
    private readonly QUERY_CACHE_TTL;
    private readonly MAX_CACHE_ENTRIES;
    private readonly aiQueue;
    private aiConcurrency;
    private readonly MAX_AI_CONCURRENCY;
    private cleanupInterval;
    constructor(prisma: PrismaService);
    onModuleDestroy(): void;
    getCachedOrExecute<T>(key: string, queryFn: () => Promise<T>, ttl?: number): Promise<T>;
    invalidateCache(pattern?: string): number;
    private cleanupCache;
    parsePagination(params: PaginationParams): {
        skip: number;
        take: number;
        page: number;
        limit: number;
    };
    createPaginatedResult<T>(data: T[], total: number, pagination: {
        page: number;
        limit: number;
    }): PaginatedResult<T>;
    getPaginatedEmployees(companyId: string, params: PaginationParams, filters?: {
        department?: string;
        status?: string;
        search?: string;
    }): Promise<PaginatedResult<any>>;
    parallelExecute<T, R>(items: T[], processor: (item: T) => Promise<R>, concurrency?: number): Promise<R[]>;
    batchProcess<T>(items: T[], batchSize: number, processor: (batch: T[]) => Promise<void>): Promise<void>;
    queueAIRequest<T>(fn: () => Promise<T>, priority?: number): Promise<T>;
    private processAIQueue;
    private hashKey;
    getCacheStats(): {
        size: number;
        maxSize: number;
        aiQueueLength: number;
        aiConcurrency: number;
    };
    cleanupOldBackups(directory: string, maxAgeDays?: number): Promise<number>;
    slimEmployeeResponse(employee: any): any;
    slimEmployeeResponses(employees: any[]): any[];
}
