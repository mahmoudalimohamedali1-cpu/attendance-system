import { Injectable, Logger, Scope } from '@nestjs/common';

/**
 * 📝 Policy Logger Service
 * خدمة تسجيل مُحسّنة للسياسات الذكية
 * 
 * Features:
 * - Structured logging
 * - Request correlation
 * - Performance tracking
 * - Sensitive data masking
 * - Log levels
 */

// ============== Types ==============

export interface LogContext {
    requestId?: string;
    userId?: string;
    companyId?: string;
    policyId?: string;
    action?: string;
    duration?: number;
    [key: string]: any;
}

export interface PerformanceLog {
    operation: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    success?: boolean;
    metadata?: Record<string, any>;
}

// ============== Implementation ==============

@Injectable({ scope: Scope.TRANSIENT })
export class PolicyLoggerService {
    private readonly logger: Logger;
    private context: LogContext = {};
    private performanceLogs: Map<string, PerformanceLog> = new Map();
    
    // الحقول الحساسة التي يجب إخفاؤها
    private readonly sensitiveFields = [
        'password',
        'token',
        'secret',
        'apiKey',
        'api_key',
        'authorization',
        'cookie',
        'session',
        'creditCard',
        'ssn',
        'nationalId',
    ];

    constructor() {
        this.logger = new Logger('SmartPolicies');
    }

    /**
     * تعيين السياق
     */
    setContext(context: LogContext): void {
        this.context = { ...this.context, ...context };
    }

    /**
     * إضافة للسياق
     */
    addContext(key: string, value: any): void {
        this.context[key] = value;
    }

    /**
     * مسح السياق
     */
    clearContext(): void {
        this.context = {};
    }

    /**
     * تسجيل معلومات
     */
    log(message: string, context?: LogContext): void {
        const fullContext = this.buildContext(context);
        this.logger.log(this.formatMessage(message, fullContext));
    }

    /**
     * تسجيل تحذير
     */
    warn(message: string, context?: LogContext): void {
        const fullContext = this.buildContext(context);
        this.logger.warn(this.formatMessage(message, fullContext));
    }

    /**
     * تسجيل خطأ
     */
    error(message: string, error?: Error, context?: LogContext): void {
        const fullContext = this.buildContext(context);
        
        if (error) {
            fullContext.error = {
                name: error.name,
                message: error.message,
                stack: error.stack?.split('\n').slice(0, 5),
            };
        }
        
        this.logger.error(this.formatMessage(message, fullContext));
    }

    /**
     * تسجيل debug
     */
    debug(message: string, context?: LogContext): void {
        const fullContext = this.buildContext(context);
        this.logger.debug(this.formatMessage(message, fullContext));
    }

    /**
     * تسجيل verbose
     */
    verbose(message: string, context?: LogContext): void {
        const fullContext = this.buildContext(context);
        this.logger.verbose(this.formatMessage(message, fullContext));
    }

    // ============== Performance Tracking ==============

    /**
     * بدء تتبع الأداء
     */
    startPerformanceTracking(operationId: string, operation: string, metadata?: Record<string, any>): void {
        this.performanceLogs.set(operationId, {
            operation,
            startTime: Date.now(),
            metadata,
        });
    }

    /**
     * إنهاء تتبع الأداء
     */
    endPerformanceTracking(operationId: string, success: boolean = true): PerformanceLog | undefined {
        const log = this.performanceLogs.get(operationId);
        
        if (!log) {
            return undefined;
        }
        
        log.endTime = Date.now();
        log.duration = log.endTime - log.startTime;
        log.success = success;
        
        // تسجيل الأداء
        const level = log.duration > 5000 ? 'warn' : 'debug';
        this[level](
            `Performance: ${log.operation} completed in ${log.duration}ms`,
            { performanceLog: log },
        );
        
        this.performanceLogs.delete(operationId);
        return log;
    }

    /**
     * قياس مدة عملية
     */
    async measureAsync<T>(
        operation: string,
        fn: () => Promise<T>,
        metadata?: Record<string, any>,
    ): Promise<T> {
        const operationId = `${operation}-${Date.now()}`;
        this.startPerformanceTracking(operationId, operation, metadata);
        
        try {
            const result = await fn();
            this.endPerformanceTracking(operationId, true);
            return result;
        } catch (error) {
            this.endPerformanceTracking(operationId, false);
            throw error;
        }
    }

    // ============== Policy Specific Logging ==============

    /**
     * تسجيل إنشاء سياسة
     */
    logPolicyCreation(policyId: string, policyName: string, userId: string): void {
        this.log('Policy created', {
            action: 'POLICY_CREATE',
            policyId,
            policyName,
            userId,
        });
    }

    /**
     * تسجيل تحديث سياسة
     */
    logPolicyUpdate(policyId: string, changes: string[], userId: string): void {
        this.log('Policy updated', {
            action: 'POLICY_UPDATE',
            policyId,
            changes,
            userId,
        });
    }

    /**
     * تسجيل تنفيذ سياسة
     */
    logPolicyExecution(
        policyId: string,
        employeeId: string,
        result: 'APPLIED' | 'SKIPPED' | 'ERROR',
        details?: any,
    ): void {
        const context = {
            action: 'POLICY_EXECUTE',
            policyId,
            employeeId,
            result,
            details: this.maskSensitiveData(details),
        };
        if (result === 'ERROR') {
            this.error('Policy execution', undefined, context);
        } else {
            this.log('Policy execution', context);
        }
    }

    /**
     * تسجيل محاكاة
     */
    logSimulation(policyId: string, employeesCount: number, duration: number): void {
        this.log('Policy simulation completed', {
            action: 'POLICY_SIMULATE',
            policyId,
            employeesCount,
            duration,
        });
    }

    /**
     * تسجيل موافقة
     */
    logApproval(policyId: string, action: 'SUBMIT' | 'APPROVE' | 'REJECT', userId: string, notes?: string): void {
        this.log('Policy approval action', {
            action: `POLICY_${action}`,
            policyId,
            userId,
            notes,
        });
    }

    /**
     * تسجيل تطبيق رجعي
     */
    logRetroApplication(
        applicationId: string,
        policyId: string,
        action: 'CREATE' | 'CALCULATE' | 'APPROVE' | 'APPLY',
        details?: any,
    ): void {
        this.log('Retro application action', {
            action: `RETRO_${action}`,
            applicationId,
            policyId,
            details: this.maskSensitiveData(details),
        });
    }

    /**
     * تسجيل توسيع النظام
     */
    logSystemExtension(modelName: string, fields: string[], success: boolean): void {
        const context = {
            action: 'SYSTEM_EXTEND',
            modelName,
            fieldsCount: fields.length,
            fields,
            success,
        };
        if (success) {
            this.log('System extension', context);
        } else {
            this.error('System extension', undefined, context);
        }
    }

    // ============== Private Methods ==============

    /**
     * بناء السياق الكامل
     */
    private buildContext(additionalContext?: LogContext): LogContext {
        return {
            ...this.context,
            ...additionalContext,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * تنسيق الرسالة
     */
    private formatMessage(message: string, context: LogContext): string {
        const { requestId, userId, action, duration, ...rest } = context;
        
        let formatted = message;
        
        if (requestId) {
            formatted = `[${requestId}] ${formatted}`;
        }
        
        if (userId) {
            formatted = `${formatted} | user: ${userId}`;
        }
        
        if (action) {
            formatted = `${formatted} | action: ${action}`;
        }
        
        if (duration !== undefined) {
            formatted = `${formatted} | duration: ${duration}ms`;
        }
        
        // إضافة السياق الإضافي
        const contextKeys = Object.keys(rest).filter(k => k !== 'timestamp');
        if (contextKeys.length > 0) {
            const contextStr = contextKeys
                .map(k => `${k}=${this.stringify(rest[k])}`)
                .join(', ');
            formatted = `${formatted} | ${contextStr}`;
        }
        
        return formatted;
    }

    /**
     * تحويل للنص
     */
    private stringify(value: any): string {
        if (value === null || value === undefined) {
            return String(value);
        }
        
        if (typeof value === 'object') {
            try {
                return JSON.stringify(this.maskSensitiveData(value));
            } catch {
                return '[Object]';
            }
        }
        
        return String(value);
    }

    /**
     * إخفاء البيانات الحساسة
     */
    private maskSensitiveData(data: any): any {
        if (!data || typeof data !== 'object') {
            return data;
        }
        
        if (Array.isArray(data)) {
            return data.map(item => this.maskSensitiveData(item));
        }
        
        const masked: Record<string, any> = {};
        
        for (const [key, value] of Object.entries(data)) {
            const lowerKey = key.toLowerCase();
            
            if (this.sensitiveFields.some(f => lowerKey.includes(f))) {
                masked[key] = '***MASKED***';
            } else if (typeof value === 'object' && value !== null) {
                masked[key] = this.maskSensitiveData(value);
            } else {
                masked[key] = value;
            }
        }
        
        return masked;
    }
}
