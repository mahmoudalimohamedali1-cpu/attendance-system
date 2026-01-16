import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * 🔄 API Version & Headers Interceptor
 * يضيف headers قياسية لكل الاستجابات
 * 
 * Features:
 * - API versioning
 * - Request ID tracking
 * - Response timing
 * - Deprecation warnings
 * - CORS headers
 */

// ============== Constants ==============

export const API_VERSION = '1.0.0';
export const API_PREFIX = '/api/v1';

// ============== Implementation ==============

@Injectable()
export class ApiVersionInterceptor implements NestInterceptor {
    private readonly logger = new Logger(ApiVersionInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();
        
        // إنشاء request ID
        const requestId = request.headers['x-request-id'] as string || uuidv4();
        const startTime = Date.now();
        
        // إضافة request ID للـ request
        (request as any).requestId = requestId;
        
        // إضافة headers للاستجابة
        response.setHeader('X-Request-ID', requestId);
        response.setHeader('X-API-Version', API_VERSION);
        response.setHeader('X-Powered-By', 'SmartPolicies');
        
        // تسجيل الطلب
        this.logger.debug(
            `[${requestId}] ${request.method} ${request.url} - Started`,
        );

        return next.handle().pipe(
            tap(() => {
                const duration = Date.now() - startTime;
                
                // إضافة header المدة
                response.setHeader('X-Response-Time', `${duration}ms`);
                
                // تسجيل إكمال الطلب
                this.logger.debug(
                    `[${requestId}] ${request.method} ${request.url} - ${response.statusCode} (${duration}ms)`,
                );
                
                // تحذير إذا كان الطلب بطيء
                if (duration > 5000) {
                    this.logger.warn(
                        `[${requestId}] Slow request detected: ${request.url} took ${duration}ms`,
                    );
                }
            }),
            map((data) => {
                // إضافة metadata للاستجابة
                if (data && typeof data === 'object' && !Array.isArray(data)) {
                    return {
                        ...data,
                        _meta: {
                            apiVersion: API_VERSION,
                            requestId,
                            timestamp: new Date().toISOString(),
                            duration: Date.now() - startTime,
                        },
                    };
                }
                return data;
            }),
        );
    }
}

/**
 * 📌 Deprecation Warning Interceptor
 * يضيف تحذيرات للـ endpoints المهملة
 */
@Injectable()
export class DeprecationInterceptor implements NestInterceptor {
    private readonly logger = new Logger(DeprecationInterceptor.name);
    
    // قائمة الـ endpoints المهملة
    private readonly deprecatedEndpoints: Map<string, DeprecatedEndpoint> = new Map([
        // مثال
        // ['/smart-policies/old-endpoint', { sunset: '2025-06-01', replacement: '/smart-policies/new-endpoint' }],
    ]);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();
        
        const path = request.path;
        const deprecated = this.deprecatedEndpoints.get(path);
        
        if (deprecated) {
            // إضافة Deprecation headers
            response.setHeader('Deprecation', 'true');
            response.setHeader('Sunset', deprecated.sunset);
            
            if (deprecated.replacement) {
                response.setHeader('Link', `<${deprecated.replacement}>; rel="successor-version"`);
            }
            
            this.logger.warn(
                `Deprecated endpoint accessed: ${path}. ` +
                `Sunset: ${deprecated.sunset}. ` +
                `Replacement: ${deprecated.replacement || 'None'}`,
            );
        }

        return next.handle();
    }
}

interface DeprecatedEndpoint {
    sunset: string;
    replacement?: string;
}

/**
 * ⏱️ Performance Monitoring Interceptor
 * يراقب أداء الـ endpoints
 */
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
    private readonly logger = new Logger(PerformanceInterceptor.name);
    
    // حدود الأداء
    private readonly thresholds = {
        warning: 3000,  // 3 ثواني
        critical: 10000, // 10 ثواني
    };
    
    // إحصائيات
    private stats: Map<string, EndpointStats> = new Map();

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();
        
        const startTime = Date.now();
        const endpoint = `${request.method} ${request.route?.path || request.path}`;

        return next.handle().pipe(
            tap(() => {
                const duration = Date.now() - startTime;
                
                // تحديث الإحصائيات
                this.updateStats(endpoint, duration);
                
                // تحذيرات الأداء
                if (duration > this.thresholds.critical) {
                    this.logger.error(
                        `CRITICAL: ${endpoint} took ${duration}ms`,
                    );
                } else if (duration > this.thresholds.warning) {
                    this.logger.warn(
                        `WARNING: ${endpoint} took ${duration}ms`,
                    );
                }
                
                // إضافة Server-Timing header
                response.setHeader(
                    'Server-Timing',
                    `total;dur=${duration}`,
                );
            }),
        );
    }

    /**
     * تحديث الإحصائيات
     */
    private updateStats(endpoint: string, duration: number): void {
        let stats = this.stats.get(endpoint);
        
        if (!stats) {
            stats = {
                count: 0,
                totalDuration: 0,
                minDuration: Infinity,
                maxDuration: 0,
                lastAccess: new Date(),
            };
            this.stats.set(endpoint, stats);
        }
        
        stats.count++;
        stats.totalDuration += duration;
        stats.minDuration = Math.min(stats.minDuration, duration);
        stats.maxDuration = Math.max(stats.maxDuration, duration);
        stats.lastAccess = new Date();
    }

    /**
     * جلب إحصائيات الأداء
     */
    getStats(): Map<string, EndpointStats & { avgDuration: number }> {
        const result = new Map<string, EndpointStats & { avgDuration: number }>();
        
        for (const [endpoint, stats] of this.stats.entries()) {
            result.set(endpoint, {
                ...stats,
                avgDuration: Math.round(stats.totalDuration / stats.count),
            });
        }
        
        return result;
    }

    /**
     * إعادة تعيين الإحصائيات
     */
    resetStats(): void {
        this.stats.clear();
    }
}

interface EndpointStats {
    count: number;
    totalDuration: number;
    minDuration: number;
    maxDuration: number;
    lastAccess: Date;
}

/**
 * 🔄 Response Transform Interceptor
 * يوحد صيغة الاستجابة
 */
@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
            map((data) => {
                // إذا كانت الاستجابة بالفعل بالصيغة الموحدة
                if (data && data.success !== undefined) {
                    return data;
                }
                
                // إذا كانت الاستجابة null أو undefined
                if (data === null || data === undefined) {
                    return {
                        success: true,
                        message: 'تمت العملية بنجاح',
                        data: null,
                        timestamp: new Date().toISOString(),
                    };
                }
                
                // تحويل الاستجابة للصيغة الموحدة
                return {
                    success: true,
                    message: 'تمت العملية بنجاح',
                    data,
                    timestamp: new Date().toISOString(),
                };
            }),
        );
    }
}
