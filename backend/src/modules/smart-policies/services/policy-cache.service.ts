import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { CACHE_CONFIG } from '../constants/smart-policy.constants';

/**
 * 🔒 Policy Cache Service
 * خدمة caching متقدمة مع دعم:
 * - TTL (Time To Live)
 * - LRU eviction
 * - Memory limit
 * - Statistics
 * - Automatic cleanup
 */

// ============== Types ==============

interface CacheEntry<T> {
    value: T;
    createdAt: number;
    expiresAt: number;
    lastAccessedAt: number;
    accessCount: number;
    size: number;
}

interface CacheStats {
    hits: number;
    misses: number;
    evictions: number;
    size: number;
    count: number;
}

interface CacheOptions {
    /** TTL بالـ milliseconds */
    ttl?: number;
    /** الحد الأقصى للعناصر */
    maxSize?: number;
    /** تنظيف تلقائي */
    autoCleanup?: boolean;
    /** فترة التنظيف بالـ milliseconds */
    cleanupInterval?: number;
}

// ============== Implementation ==============

@Injectable()
export class PolicyCacheService implements OnModuleDestroy {
    private readonly logger = new Logger(PolicyCacheService.name);
    
    // Caches مختلفة لأنواع البيانات
    private readonly policyCache = new Map<string, CacheEntry<any>>();
    private readonly contextCache = new Map<string, CacheEntry<any>>();
    private readonly schemaCache = new Map<string, CacheEntry<any>>();
    private readonly queryCache = new Map<string, CacheEntry<any>>();
    
    // إحصائيات
    private stats: CacheStats = {
        hits: 0,
        misses: 0,
        evictions: 0,
        size: 0,
        count: 0,
    };
    
    // مهام التنظيف
    private cleanupTimers: ReturnType<typeof setInterval>[] = [];
    
    // الإعدادات الافتراضية
    private readonly defaultOptions: Required<CacheOptions> = {
        ttl: CACHE_CONFIG.POLICY_CACHE_TTL_MS,
        maxSize: CACHE_CONFIG.MAX_CACHE_SIZE,
        autoCleanup: true,
        cleanupInterval: 60 * 1000, // دقيقة
    };
    
    constructor() {
        this.startCleanupTasks();
    }
    
    onModuleDestroy() {
        this.stopCleanupTasks();
    }
    
    // ============== Policy Cache ==============
    
    /**
     * تخزين السياسات
     */
    setPolicies(companyId: string, policies: any[], ttl?: number): void {
        this.set(this.policyCache, `policies:${companyId}`, policies, {
            ttl: ttl || CACHE_CONFIG.POLICY_CACHE_TTL_MS,
        });
    }
    
    /**
     * جلب السياسات
     */
    getPolicies(companyId: string): any[] | undefined {
        return this.get(this.policyCache, `policies:${companyId}`);
    }
    
    /**
     * إبطال cache السياسات لشركة
     */
    invalidatePolicies(companyId: string): void {
        this.delete(this.policyCache, `policies:${companyId}`);
        this.logger.debug(`Invalidated policies cache for company: ${companyId}`);
    }
    
    /**
     * إبطال كل cache السياسات
     */
    invalidateAllPolicies(): void {
        this.clear(this.policyCache);
        this.logger.log('Invalidated all policies cache');
    }
    
    // ============== Context Cache ==============
    
    /**
     * تخزين سياق الموظف
     */
    setContext(employeeId: string, month: number, year: number, context: any): void {
        const key = `context:${employeeId}:${year}-${month}`;
        this.set(this.contextCache, key, context, {
            ttl: CACHE_CONFIG.CONTEXT_CACHE_TTL_MS,
        });
    }
    
    /**
     * جلب سياق الموظف
     */
    getContext(employeeId: string, month: number, year: number): any | undefined {
        const key = `context:${employeeId}:${year}-${month}`;
        return this.get(this.contextCache, key);
    }
    
    /**
     * إبطال سياق الموظف
     */
    invalidateContext(employeeId: string): void {
        // حذف كل entries المتعلقة بالموظف
        for (const key of this.contextCache.keys()) {
            if (key.startsWith(`context:${employeeId}:`)) {
                this.delete(this.contextCache, key);
            }
        }
    }
    
    // ============== Schema Cache ==============
    
    /**
     * تخزين الـ schema
     */
    setSchema(key: string, schema: any): void {
        this.set(this.schemaCache, `schema:${key}`, schema, {
            ttl: CACHE_CONFIG.SCHEMA_CACHE_TTL_MS,
        });
    }
    
    /**
     * جلب الـ schema
     */
    getSchema(key: string): any | undefined {
        return this.get(this.schemaCache, `schema:${key}`);
    }
    
    /**
     * إبطال الـ schema cache
     */
    invalidateSchema(): void {
        this.clear(this.schemaCache);
        this.logger.log('Invalidated schema cache');
    }
    
    // ============== Query Cache ==============
    
    /**
     * تخزين نتيجة استعلام
     */
    setQueryResult(queryKey: string, result: any, ttl: number = 60000): void {
        this.set(this.queryCache, `query:${queryKey}`, result, { ttl });
    }
    
    /**
     * جلب نتيجة استعلام
     */
    getQueryResult(queryKey: string): any | undefined {
        return this.get(this.queryCache, `query:${queryKey}`);
    }
    
    /**
     * إنشاء مفتاح للاستعلام
     */
    createQueryKey(params: Record<string, any>): string {
        const sorted = Object.keys(params).sort();
        const parts = sorted.map(k => `${k}:${JSON.stringify(params[k])}`);
        return parts.join('|');
    }
    
    // ============== Core Methods ==============
    
    /**
     * تخزين قيمة في الـ cache
     */
    private set<T>(
        cache: Map<string, CacheEntry<T>>,
        key: string,
        value: T,
        options: CacheOptions = {},
    ): void {
        const opts = { ...this.defaultOptions, ...options };
        const now = Date.now();
        
        // فحص إذا نحتاج eviction
        if (cache.size >= opts.maxSize) {
            this.evictLRU(cache);
        }
        
        // حساب حجم القيمة (تقريبي)
        const size = this.estimateSize(value);
        
        cache.set(key, {
            value,
            createdAt: now,
            expiresAt: now + opts.ttl,
            lastAccessedAt: now,
            accessCount: 0,
            size,
        });
        
        this.stats.count = this.getTotalCount();
        this.stats.size = this.getTotalSize();
    }
    
    /**
     * جلب قيمة من الـ cache
     */
    private get<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
        const entry = cache.get(key);
        
        if (!entry) {
            this.stats.misses++;
            return undefined;
        }
        
        // فحص الانتهاء
        if (Date.now() > entry.expiresAt) {
            cache.delete(key);
            this.stats.misses++;
            return undefined;
        }
        
        // تحديث إحصائيات الوصول
        entry.lastAccessedAt = Date.now();
        entry.accessCount++;
        this.stats.hits++;
        
        return entry.value;
    }
    
    /**
     * حذف قيمة من الـ cache
     */
    private delete<T>(cache: Map<string, CacheEntry<T>>, key: string): boolean {
        const result = cache.delete(key);
        if (result) {
            this.stats.count = this.getTotalCount();
            this.stats.size = this.getTotalSize();
        }
        return result;
    }
    
    /**
     * مسح الـ cache بالكامل
     */
    private clear<T>(cache: Map<string, CacheEntry<T>>): void {
        cache.clear();
        this.stats.count = this.getTotalCount();
        this.stats.size = this.getTotalSize();
    }
    
    /**
     * حذف أقل العناصر استخداماً (LRU)
     */
    private evictLRU<T>(cache: Map<string, CacheEntry<T>>): void {
        let oldest: { key: string; lastAccessed: number } | null = null;
        
        for (const [key, entry] of cache.entries()) {
            if (!oldest || entry.lastAccessedAt < oldest.lastAccessed) {
                oldest = { key, lastAccessed: entry.lastAccessedAt };
            }
        }
        
        if (oldest) {
            cache.delete(oldest.key);
            this.stats.evictions++;
            this.logger.debug(`LRU eviction: ${oldest.key}`);
        }
    }
    
    /**
     * تنظيف العناصر المنتهية
     */
    private cleanup<T>(cache: Map<string, CacheEntry<T>>): number {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [key, entry] of cache.entries()) {
            if (now > entry.expiresAt) {
                cache.delete(key);
                cleaned++;
            }
        }
        
        return cleaned;
    }
    
    /**
     * تقدير حجم القيمة
     */
    private estimateSize(value: any): number {
        try {
            return JSON.stringify(value).length * 2; // Unicode characters
        } catch {
            return 0;
        }
    }
    
    /**
     * جلب إجمالي عدد العناصر
     */
    private getTotalCount(): number {
        return (
            this.policyCache.size +
            this.contextCache.size +
            this.schemaCache.size +
            this.queryCache.size
        );
    }
    
    /**
     * جلب إجمالي الحجم
     */
    private getTotalSize(): number {
        let total = 0;
        
        for (const entry of this.policyCache.values()) {
            total += entry.size;
        }
        for (const entry of this.contextCache.values()) {
            total += entry.size;
        }
        for (const entry of this.schemaCache.values()) {
            total += entry.size;
        }
        for (const entry of this.queryCache.values()) {
            total += entry.size;
        }
        
        return total;
    }
    
    // ============== Cleanup Tasks ==============
    
    /**
     * بدء مهام التنظيف
     */
    private startCleanupTasks(): void {
        const interval = this.defaultOptions.cleanupInterval;
        
        const task = setInterval(() => {
            const policyCleanup = this.cleanup(this.policyCache);
            const contextCleanup = this.cleanup(this.contextCache);
            const schemaCleanup = this.cleanup(this.schemaCache);
            const queryCleanup = this.cleanup(this.queryCache);
            
            const total = policyCleanup + contextCleanup + schemaCleanup + queryCleanup;
            
            if (total > 0) {
                this.logger.debug(`Cache cleanup: removed ${total} expired entries`);
                this.stats.count = this.getTotalCount();
                this.stats.size = this.getTotalSize();
            }
        }, interval);
        
        this.cleanupTimers.push(task);
    }
    
    /**
     * إيقاف مهام التنظيف
     */
    private stopCleanupTasks(): void {
        for (const timer of this.cleanupTimers) {
            clearInterval(timer);
        }
        this.cleanupTimers = [];
    }
    
    // ============== Statistics ==============
    
    /**
     * جلب إحصائيات الـ cache
     */
    getStats(): CacheStats & {
        hitRate: number;
        breakdown: {
            policies: number;
            contexts: number;
            schemas: number;
            queries: number;
        };
    } {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
        
        return {
            ...this.stats,
            hitRate: Math.round(hitRate * 100) / 100,
            breakdown: {
                policies: this.policyCache.size,
                contexts: this.contextCache.size,
                schemas: this.schemaCache.size,
                queries: this.queryCache.size,
            },
        };
    }
    
    /**
     * إعادة تعيين الإحصائيات
     */
    resetStats(): void {
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            size: this.getTotalSize(),
            count: this.getTotalCount(),
        };
    }
    
    /**
     * مسح كل الـ caches
     */
    clearAll(): void {
        this.clear(this.policyCache);
        this.clear(this.contextCache);
        this.clear(this.schemaCache);
        this.clear(this.queryCache);
        this.resetStats();
        this.logger.log('Cleared all caches');
    }
}
