import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PolicyCacheService } from './policy-cache.service';
import { PolicyRetryService } from './policy-retry.service';

/**
 * 🏥 Policy Health Service
 * مراقبة صحة نظام السياسات الذكية
 * 
 * Features:
 * - Database health check
 * - Cache health check
 * - Circuit breaker status
 * - System metrics
 * - Dependency checks
 */

// ============== Types ==============

export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    checks: HealthCheck[];
    metrics: SystemMetrics;
}

export interface HealthCheck {
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message?: string;
    responseTime?: number;
    details?: Record<string, any>;
}

export interface SystemMetrics {
    uptime: number;
    memory: {
        used: number;
        total: number;
        percentage: number;
    };
    cache: {
        hitRate: number;
        size: number;
        entries: number;
    };
    circuitBreakers: {
        open: number;
        halfOpen: number;
        closed: number;
    };
}

// ============== Implementation ==============

@Injectable()
export class PolicyHealthService {
    private readonly logger = new Logger(PolicyHealthService.name);
    private readonly startTime = Date.now();

    constructor(
        private readonly prisma: PrismaService,
        private readonly cacheService: PolicyCacheService,
        private readonly retryService: PolicyRetryService,
    ) {}

    /**
     * فحص صحة النظام الكامل
     */
    async getHealthStatus(): Promise<HealthStatus> {
        const checks: HealthCheck[] = [];

        // فحص قاعدة البيانات
        checks.push(await this.checkDatabase());

        // فحص الـ cache
        checks.push(this.checkCache());

        // فحص الـ circuit breakers
        checks.push(this.checkCircuitBreakers());

        // فحص الذاكرة
        checks.push(this.checkMemory());

        // تحديد الحالة العامة
        const status = this.determineOverallStatus(checks);

        return {
            status,
            timestamp: new Date().toISOString(),
            checks,
            metrics: this.getMetrics(),
        };
    }

    /**
     * فحص سريع (للـ load balancer)
     */
    async quickCheck(): Promise<{ status: 'ok' | 'error'; message?: string }> {
        try {
            // فحص سريع لقاعدة البيانات
            await this.prisma.$queryRaw`SELECT 1`;
            return { status: 'ok' };
        } catch (error) {
            this.logger.error('Quick health check failed', error);
            return { status: 'error', message: 'Database connection failed' };
        }
    }

    /**
     * فحص جاهزية النظام
     */
    async readinessCheck(): Promise<{ ready: boolean; checks: HealthCheck[] }> {
        const checks: HealthCheck[] = [];

        // فحص قاعدة البيانات
        checks.push(await this.checkDatabase());

        // التحقق من أن كل الـ checks ناجحة
        const ready = checks.every((check) => check.status !== 'fail');

        return { ready, checks };
    }

    /**
     * فحص قاعدة البيانات
     */
    private async checkDatabase(): Promise<HealthCheck> {
        const startTime = Date.now();

        try {
            // فحص الاتصال
            await this.prisma.$queryRaw`SELECT 1`;

            // فحص جداول السياسات
            const policyCount = await this.prisma.smartPolicy.count();

            return {
                name: 'database',
                status: 'pass',
                responseTime: Date.now() - startTime,
                details: {
                    connected: true,
                    policyCount,
                },
            };
        } catch (error) {
            return {
                name: 'database',
                status: 'fail',
                message: error.message,
                responseTime: Date.now() - startTime,
            };
        }
    }

    /**
     * فحص الـ cache
     */
    private checkCache(): HealthCheck {
        try {
            const stats = this.cacheService.getStats();

            const status = stats.hitRate >= 50 ? 'pass' : 
                          stats.hitRate >= 30 ? 'warn' : 'fail';

            return {
                name: 'cache',
                status,
                details: {
                    hitRate: stats.hitRate,
                    size: stats.size,
                    entries: stats.count,
                },
            };
        } catch (error) {
            return {
                name: 'cache',
                status: 'fail',
                message: error.message,
            };
        }
    }

    /**
     * فحص الـ circuit breakers
     */
    private checkCircuitBreakers(): HealthCheck {
        try {
            const breakers = this.retryService.getAllCircuitBreakerStatus();
            
            let open = 0;
            let halfOpen = 0;
            let closed = 0;

            for (const [, state] of breakers) {
                switch (state.state) {
                    case 'OPEN':
                        open++;
                        break;
                    case 'HALF_OPEN':
                        halfOpen++;
                        break;
                    case 'CLOSED':
                        closed++;
                        break;
                }
            }

            const status = open === 0 ? 'pass' :
                          open < breakers.size / 2 ? 'warn' : 'fail';

            return {
                name: 'circuitBreakers',
                status,
                details: { open, halfOpen, closed, total: breakers.size },
            };
        } catch (error) {
            return {
                name: 'circuitBreakers',
                status: 'fail',
                message: error.message,
            };
        }
    }

    /**
     * فحص الذاكرة
     */
    private checkMemory(): HealthCheck {
        const usage = process.memoryUsage();
        const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
        const totalMB = Math.round(usage.heapTotal / 1024 / 1024);
        const percentage = Math.round((usage.heapUsed / usage.heapTotal) * 100);

        const status = percentage < 70 ? 'pass' :
                      percentage < 85 ? 'warn' : 'fail';

        return {
            name: 'memory',
            status,
            details: {
                usedMB,
                totalMB,
                percentage,
            },
        };
    }

    /**
     * تحديد الحالة العامة
     */
    private determineOverallStatus(checks: HealthCheck[]): 'healthy' | 'degraded' | 'unhealthy' {
        const failCount = checks.filter((c) => c.status === 'fail').length;
        const warnCount = checks.filter((c) => c.status === 'warn').length;

        if (failCount > 0) {
            return 'unhealthy';
        }

        if (warnCount > 0) {
            return 'degraded';
        }

        return 'healthy';
    }

    /**
     * جلب المقاييس
     */
    private getMetrics(): SystemMetrics {
        const usage = process.memoryUsage();
        const cacheStats = this.cacheService.getStats();
        const breakers = this.retryService.getAllCircuitBreakerStatus();

        let openBreakers = 0;
        let halfOpenBreakers = 0;
        let closedBreakers = 0;

        for (const [, state] of breakers) {
            switch (state.state) {
                case 'OPEN':
                    openBreakers++;
                    break;
                case 'HALF_OPEN':
                    halfOpenBreakers++;
                    break;
                case 'CLOSED':
                    closedBreakers++;
                    break;
            }
        }

        return {
            uptime: Date.now() - this.startTime,
            memory: {
                used: Math.round(usage.heapUsed / 1024 / 1024),
                total: Math.round(usage.heapTotal / 1024 / 1024),
                percentage: Math.round((usage.heapUsed / usage.heapTotal) * 100),
            },
            cache: {
                hitRate: cacheStats.hitRate,
                size: cacheStats.size,
                entries: cacheStats.count,
            },
            circuitBreakers: {
                open: openBreakers,
                halfOpen: halfOpenBreakers,
                closed: closedBreakers,
            },
        };
    }

    /**
     * فحص الاعتمادية الخارجية
     */
    async checkExternalDependency(
        name: string,
        checkFn: () => Promise<void>,
        timeoutMs: number = 5000,
    ): Promise<HealthCheck> {
        const startTime = Date.now();

        try {
            await Promise.race([
                checkFn(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), timeoutMs),
                ),
            ]);

            return {
                name,
                status: 'pass',
                responseTime: Date.now() - startTime,
            };
        } catch (error) {
            return {
                name,
                status: 'fail',
                message: error.message,
                responseTime: Date.now() - startTime,
            };
        }
    }
}
