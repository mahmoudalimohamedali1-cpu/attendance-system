import {
    Injectable,
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

/**
 * 🔒 Rate Limiting Guard
 * يحمي الـ endpoints من الاستخدام المفرط
 * 
 * Features:
 * - حماية من الـ DDoS attacks
 * - تحديد عدد الطلبات حسب الـ IP
 * - تحديد عدد الطلبات حسب المستخدم
 * - دعم الـ sliding window algorithm
 */

// ============== Types ==============

interface RateLimitEntry {
    count: number;
    resetTime: number;
    requests: number[];
}

interface RateLimitOptions {
    /** الحد الأقصى للطلبات */
    limit: number;
    /** الفترة الزمنية بالثواني */
    windowSec: number;
    /** رسالة الخطأ */
    message?: string;
    /** استخدام الـ sliding window */
    slidingWindow?: boolean;
}

// ============== Decorator ==============

export const RATE_LIMIT_KEY = 'rateLimit';

/**
 * Decorator لتحديد Rate Limit على endpoint
 */
export const RateLimit = (options: RateLimitOptions) => {
    return (target: any, key?: string, descriptor?: PropertyDescriptor) => {
        if (descriptor) {
            Reflect.defineMetadata(RATE_LIMIT_KEY, options, descriptor.value);
            return descriptor;
        }
        Reflect.defineMetadata(RATE_LIMIT_KEY, options, target);
        return target;
    };
};

// ============== Default Limits ==============

export const DEFAULT_RATE_LIMITS = {
    /** الـ AI endpoints - محدودة */
    AI_ENDPOINTS: { limit: 10, windowSec: 60 },
    
    /** الـ Auto-Extend - محدودة جداً */
    AUTO_EXTEND: { limit: 5, windowSec: 300 },
    
    /** الـ Simulation - متوسطة */
    SIMULATION: { limit: 20, windowSec: 60 },
    
    /** القراءة - مرتفعة */
    READ: { limit: 100, windowSec: 60 },
    
    /** الكتابة - متوسطة */
    WRITE: { limit: 30, windowSec: 60 },
    
    /** التصدير - منخفضة */
    EXPORT: { limit: 10, windowSec: 60 },
} as const;

// ============== Guard Implementation ==============

@Injectable()
export class RateLimitGuard implements CanActivate {
    private readonly logger = new Logger(RateLimitGuard.name);
    
    // In-memory store للـ rate limiting
    // في الإنتاج، استخدم Redis
    private readonly store = new Map<string, RateLimitEntry>();
    
    // تنظيف الـ store كل 5 دقائق
    private readonly cleanupInterval = 5 * 60 * 1000;
    
    constructor(private readonly reflector: Reflector) {
        // بدء مهمة التنظيف
        setInterval(() => this.cleanup(), this.cleanupInterval);
    }
    
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        
        // جلب إعدادات الـ rate limit من الـ decorator
        const options = this.reflector.get<RateLimitOptions>(
            RATE_LIMIT_KEY,
            context.getHandler(),
        ) || this.reflector.get<RateLimitOptions>(
            RATE_LIMIT_KEY,
            context.getClass(),
        );
        
        // إذا لم يكن هناك rate limit محدد، السماح بالمرور
        if (!options) {
            return true;
        }
        
        // إنشاء مفتاح فريد للعميل
        const key = this.generateKey(request, context);
        
        // التحقق من الـ rate limit
        const result = options.slidingWindow
            ? this.checkSlidingWindow(key, options)
            : this.checkFixedWindow(key, options);
        
        if (!result.allowed) {
            this.logger.warn(
                `Rate limit exceeded for key: ${key}, ` +
                `count: ${result.count}/${options.limit}`
            );
            
            // إضافة headers للاستجابة
            const response = context.switchToHttp().getResponse();
            response.setHeader('X-RateLimit-Limit', options.limit);
            response.setHeader('X-RateLimit-Remaining', Math.max(0, options.limit - result.count));
            response.setHeader('X-RateLimit-Reset', result.resetTime);
            response.setHeader('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000));
            
            throw new HttpException(
                {
                    statusCode: HttpStatus.TOO_MANY_REQUESTS,
                    message: options.message || 'تم تجاوز الحد المسموح للطلبات. حاول مرة أخرى لاحقاً.',
                    error: 'Too Many Requests',
                    retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
                },
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }
        
        // إضافة headers للاستجابة
        const response = context.switchToHttp().getResponse();
        response.setHeader('X-RateLimit-Limit', options.limit);
        response.setHeader('X-RateLimit-Remaining', Math.max(0, options.limit - result.count));
        response.setHeader('X-RateLimit-Reset', result.resetTime);
        
        return true;
    }
    
    /**
     * إنشاء مفتاح فريد للعميل
     */
    private generateKey(request: Request, context: ExecutionContext): string {
        // محاولة استخدام ID المستخدم أولاً
        const user = (request as any).user;
        if (user?.id) {
            return `user:${user.id}:${context.getHandler().name}`;
        }
        
        // استخدام الـ IP address
        const ip = this.getClientIp(request);
        return `ip:${ip}:${context.getHandler().name}`;
    }
    
    /**
     * جلب IP العميل
     */
    private getClientIp(request: Request): string {
        const forwarded = request.headers['x-forwarded-for'];
        if (forwarded) {
            const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
            return ips.trim();
        }
        
        const realIp = request.headers['x-real-ip'];
        if (realIp) {
            return Array.isArray(realIp) ? realIp[0] : realIp;
        }
        
        return request.ip || request.socket.remoteAddress || 'unknown';
    }
    
    /**
     * التحقق باستخدام Fixed Window
     */
    private checkFixedWindow(
        key: string,
        options: RateLimitOptions,
    ): { allowed: boolean; count: number; resetTime: number } {
        const now = Date.now();
        const windowMs = options.windowSec * 1000;
        
        let entry = this.store.get(key);
        
        // إذا لم يكن هناك entry أو انتهت الفترة
        if (!entry || now >= entry.resetTime) {
            entry = {
                count: 1,
                resetTime: now + windowMs,
                requests: [now],
            };
            this.store.set(key, entry);
            
            return { allowed: true, count: 1, resetTime: entry.resetTime };
        }
        
        // زيادة العداد
        entry.count++;
        entry.requests.push(now);
        
        return {
            allowed: entry.count <= options.limit,
            count: entry.count,
            resetTime: entry.resetTime,
        };
    }
    
    /**
     * التحقق باستخدام Sliding Window
     */
    private checkSlidingWindow(
        key: string,
        options: RateLimitOptions,
    ): { allowed: boolean; count: number; resetTime: number } {
        const now = Date.now();
        const windowMs = options.windowSec * 1000;
        const windowStart = now - windowMs;
        
        let entry = this.store.get(key);
        
        if (!entry) {
            entry = {
                count: 1,
                resetTime: now + windowMs,
                requests: [now],
            };
            this.store.set(key, entry);
            
            return { allowed: true, count: 1, resetTime: entry.resetTime };
        }
        
        // إزالة الطلبات القديمة
        entry.requests = entry.requests.filter(time => time > windowStart);
        
        // إضافة الطلب الجديد
        entry.requests.push(now);
        entry.count = entry.requests.length;
        
        // تحديث وقت إعادة التعيين
        if (entry.requests.length > 0) {
            entry.resetTime = entry.requests[0] + windowMs;
        } else {
            entry.resetTime = now + windowMs;
        }
        
        return {
            allowed: entry.count <= options.limit,
            count: entry.count,
            resetTime: entry.resetTime,
        };
    }
    
    /**
     * تنظيف الـ entries القديمة
     */
    private cleanup(): void {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [key, entry] of this.store.entries()) {
            if (now >= entry.resetTime) {
                this.store.delete(key);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            this.logger.debug(`Rate limit store cleanup: removed ${cleaned} entries`);
        }
    }
    
    /**
     * إعادة تعيين الـ rate limit لمفتاح معين
     */
    resetForKey(key: string): void {
        this.store.delete(key);
        this.logger.debug(`Rate limit reset for key: ${key}`);
    }
    
    /**
     * جلب حالة الـ rate limit لمفتاح معين
     */
    getStatus(key: string): RateLimitEntry | undefined {
        return this.store.get(key);
    }
}

// ============== Pre-configured Rate Limit Decorators ==============

/**
 * Rate limit للـ AI endpoints
 */
export const AIRateLimit = () => RateLimit({
    ...DEFAULT_RATE_LIMITS.AI_ENDPOINTS,
    message: 'تم تجاوز الحد المسموح لطلبات الذكاء الاصطناعي. انتظر دقيقة وحاول مرة أخرى.',
});

/**
 * Rate limit للـ Auto-Extend
 */
export const AutoExtendRateLimit = () => RateLimit({
    ...DEFAULT_RATE_LIMITS.AUTO_EXTEND,
    message: 'تم تجاوز الحد المسموح لطلبات توسيع النظام. انتظر 5 دقائق وحاول مرة أخرى.',
});

/**
 * Rate limit للـ Simulation
 */
export const SimulationRateLimit = () => RateLimit({
    ...DEFAULT_RATE_LIMITS.SIMULATION,
    message: 'تم تجاوز الحد المسموح لطلبات المحاكاة. حاول مرة أخرى لاحقاً.',
});

/**
 * Rate limit للقراءة
 */
export const ReadRateLimit = () => RateLimit(DEFAULT_RATE_LIMITS.READ);

/**
 * Rate limit للكتابة
 */
export const WriteRateLimit = () => RateLimit(DEFAULT_RATE_LIMITS.WRITE);

/**
 * Rate limit للتصدير
 */
export const ExportRateLimit = () => RateLimit({
    ...DEFAULT_RATE_LIMITS.EXPORT,
    message: 'تم تجاوز الحد المسموح لطلبات التصدير. حاول مرة أخرى لاحقاً.',
});
