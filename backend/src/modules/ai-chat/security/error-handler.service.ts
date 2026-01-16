import { Injectable, Logger } from '@nestjs/common';

/**
 * 🛡️ Centralized Error Handler Service
 * Fixes: #15, #17, #18, #48, #49, #50, #51, #53
 * 
 * - Classifies errors properly
 * - Returns consistent, sanitized error messages
 * - Provides error codes for programmatic handling
 * - Removes sensitive data (paths, PII, stack traces)
 */

export enum ErrorCode {
    // Validation errors (1xxx)
    VALIDATION_FAILED = 1001,
    INVALID_FORMAT = 1002,
    MISSING_REQUIRED = 1003,
    OUT_OF_RANGE = 1004,

    // Authentication/Authorization errors (2xxx)
    NOT_AUTHENTICATED = 2001,
    NOT_AUTHORIZED = 2002,
    RATE_LIMITED = 2003,
    SESSION_EXPIRED = 2004,

    // AI errors (3xxx)
    AI_UNAVAILABLE = 3001,
    AI_RESPONSE_INVALID = 3002,
    AI_TIMEOUT = 3003,
    AI_QUOTA_EXCEEDED = 3004,

    // Database errors (4xxx)
    DB_OPERATION_FAILED = 4001,
    DB_NOT_FOUND = 4002,
    DB_DUPLICATE = 4003,
    DB_CONNECTION_FAILED = 4004,

    // System errors (5xxx)
    INTERNAL_ERROR = 5001,
    SERVICE_UNAVAILABLE = 5002,
    FILE_OPERATION_FAILED = 5003,
    COMMAND_FAILED = 5004,

    // Business logic errors (6xxx)
    EMPLOYEE_NOT_FOUND = 6001,
    INSUFFICIENT_BALANCE = 6002,
    OPERATION_NOT_ALLOWED = 6003,
    ALREADY_EXISTS = 6004,
}

export interface ErrorResponse {
    success: false;
    code: ErrorCode;
    message: string;
    messageAr: string;
    details?: string;
    retryable: boolean;
    timestamp: Date;
}

export interface ErrorClassification {
    code: ErrorCode;
    retryable: boolean;
    userFacing: boolean;
}

@Injectable()
export class ErrorHandlerService {
    private readonly logger = new Logger(ErrorHandlerService.name);

    // Patterns to detect and sanitize
    private readonly sensitivePatterns = [
        // File paths
        /[A-Z]:\\[^\s]+/gi,          // Windows paths
        /\/(?:var|home|etc|usr|opt)[^\s]+/gi,  // Unix paths
        /node_modules[^\s]+/gi,       // Node paths

        // Credentials
        /password[=:]\s*[^\s]+/gi,
        /api[_-]?key[=:]\s*[^\s]+/gi,
        /token[=:]\s*[^\s]+/gi,
        /secret[=:]\s*[^\s]+/gi,

        // PII patterns
        /\b[\w.-]+@[\w.-]+\.\w+\b/g,  // Emails
        /\b05\d{8}\b/g,               // Saudi phone numbers

        // Technical details
        /at\s+[\w.]+\s+\([^)]+\)/g,   // Stack traces
        /Error:\s+[A-Z][a-z]+Error/g,  // Error class names
    ];

    // Error message mappings (English -> Arabic)
    private readonly errorMessages: Record<ErrorCode, { en: string; ar: string }> = {
        [ErrorCode.VALIDATION_FAILED]: {
            en: 'Input validation failed',
            ar: 'فشل التحقق من البيانات المدخلة',
        },
        [ErrorCode.INVALID_FORMAT]: {
            en: 'Invalid format',
            ar: 'صيغة غير صالحة',
        },
        [ErrorCode.MISSING_REQUIRED]: {
            en: 'Required field missing',
            ar: 'حقل مطلوب مفقود',
        },
        [ErrorCode.OUT_OF_RANGE]: {
            en: 'Value out of allowed range',
            ar: 'القيمة خارج النطاق المسموح',
        },
        [ErrorCode.NOT_AUTHENTICATED]: {
            en: 'Authentication required',
            ar: 'يجب تسجيل الدخول',
        },
        [ErrorCode.NOT_AUTHORIZED]: {
            en: 'Not authorized',
            ar: 'غير مصرح لك',
        },
        [ErrorCode.RATE_LIMITED]: {
            en: 'Too many requests',
            ar: 'طلبات كثيرة جداً',
        },
        [ErrorCode.SESSION_EXPIRED]: {
            en: 'Session expired',
            ar: 'انتهت الجلسة',
        },
        [ErrorCode.AI_UNAVAILABLE]: {
            en: 'AI service temporarily unavailable',
            ar: 'خدمة الذكاء الاصطناعي غير متاحة مؤقتاً',
        },
        [ErrorCode.AI_RESPONSE_INVALID]: {
            en: 'Could not understand request',
            ar: 'لم أستطع فهم الطلب',
        },
        [ErrorCode.AI_TIMEOUT]: {
            en: 'Request timed out',
            ar: 'انتهت مهلة الطلب',
        },
        [ErrorCode.AI_QUOTA_EXCEEDED]: {
            en: 'AI quota exceeded',
            ar: 'تم تجاوز الحد المسموح',
        },
        [ErrorCode.DB_OPERATION_FAILED]: {
            en: 'Database operation failed',
            ar: 'فشل في عملية قاعدة البيانات',
        },
        [ErrorCode.DB_NOT_FOUND]: {
            en: 'Record not found',
            ar: 'السجل غير موجود',
        },
        [ErrorCode.DB_DUPLICATE]: {
            en: 'Record already exists',
            ar: 'السجل موجود مسبقاً',
        },
        [ErrorCode.DB_CONNECTION_FAILED]: {
            en: 'Database connection failed',
            ar: 'فشل الاتصال بقاعدة البيانات',
        },
        [ErrorCode.INTERNAL_ERROR]: {
            en: 'Internal error occurred',
            ar: 'حدث خطأ داخلي',
        },
        [ErrorCode.SERVICE_UNAVAILABLE]: {
            en: 'Service temporarily unavailable',
            ar: 'الخدمة غير متاحة مؤقتاً',
        },
        [ErrorCode.FILE_OPERATION_FAILED]: {
            en: 'File operation failed',
            ar: 'فشل في عملية الملف',
        },
        [ErrorCode.COMMAND_FAILED]: {
            en: 'Command execution failed',
            ar: 'فشل تنفيذ الأمر',
        },
        [ErrorCode.EMPLOYEE_NOT_FOUND]: {
            en: 'Employee not found',
            ar: 'الموظف غير موجود',
        },
        [ErrorCode.INSUFFICIENT_BALANCE]: {
            en: 'Insufficient balance',
            ar: 'الرصيد غير كافي',
        },
        [ErrorCode.OPERATION_NOT_ALLOWED]: {
            en: 'Operation not allowed',
            ar: 'العملية غير مسموحة',
        },
        [ErrorCode.ALREADY_EXISTS]: {
            en: 'Already exists',
            ar: 'موجود مسبقاً',
        },
    };

    /**
     * 🔍 Classify an error and determine handling
     */
    classifyError(error: Error | any): ErrorClassification {
        const message = error?.message?.toLowerCase() || '';
        const code = error?.code || '';

        // Prisma/DB errors
        if (code.startsWith('P2') || message.includes('prisma')) {
            if (code === 'P2025' || message.includes('not found')) {
                return { code: ErrorCode.DB_NOT_FOUND, retryable: false, userFacing: true };
            }
            if (code === 'P2002' || message.includes('unique constraint')) {
                return { code: ErrorCode.DB_DUPLICATE, retryable: false, userFacing: true };
            }
            return { code: ErrorCode.DB_OPERATION_FAILED, retryable: true, userFacing: false };
        }

        // Network/timeout errors
        if (message.includes('timeout') || message.includes('etimedout')) {
            return { code: ErrorCode.AI_TIMEOUT, retryable: true, userFacing: true };
        }

        // Rate limiting
        if (message.includes('rate limit') || message.includes('too many')) {
            return { code: ErrorCode.RATE_LIMITED, retryable: true, userFacing: true };
        }

        // Auth errors
        if (message.includes('unauthorized') || message.includes('forbidden')) {
            return { code: ErrorCode.NOT_AUTHORIZED, retryable: false, userFacing: true };
        }

        // Validation errors
        if (message.includes('validation') || message.includes('invalid')) {
            return { code: ErrorCode.VALIDATION_FAILED, retryable: false, userFacing: true };
        }

        // Default to internal error
        return { code: ErrorCode.INTERNAL_ERROR, retryable: false, userFacing: false };
    }

    /**
     * 🛡️ Create a sanitized error response
     */
    createErrorResponse(
        error: Error | any,
        overrideCode?: ErrorCode,
        details?: string
    ): ErrorResponse {
        const classification = this.classifyError(error);
        const code = overrideCode || classification.code;
        const messages = this.errorMessages[code];

        // Log the full error internally
        this.logger.error(`[${code}] ${error?.message || 'Unknown error'}`, error?.stack);

        // Sanitize details if provided
        const sanitizedDetails = details ? this.sanitize(details) : undefined;

        return {
            success: false,
            code,
            message: messages.en,
            messageAr: messages.ar,
            details: sanitizedDetails,
            retryable: classification.retryable,
            timestamp: new Date(),
        };
    }

    /**
     * 🧹 Sanitize a string by removing sensitive patterns
     */
    sanitize(input: string): string {
        let result = input;

        for (const pattern of this.sensitivePatterns) {
            result = result.replace(pattern, '[REDACTED]');
        }

        // Truncate if too long
        if (result.length > 200) {
            result = result.substring(0, 200) + '...';
        }

        return result;
    }

    /**
     * 🔒 Create a user-facing error message (Arabic)
     */
    getUserMessage(code: ErrorCode): string {
        return this.errorMessages[code]?.ar || 'حدث خطأ';
    }

    /**
     * ⚡ Quick error response helpers
     */
    notFound(entity: string): ErrorResponse {
        return this.createErrorResponse(
            new Error(`${entity} not found`),
            ErrorCode.DB_NOT_FOUND,
            entity
        );
    }

    notAuthorized(): ErrorResponse {
        return this.createErrorResponse(
            new Error('Not authorized'),
            ErrorCode.NOT_AUTHORIZED
        );
    }

    validationFailed(details: string): ErrorResponse {
        return this.createErrorResponse(
            new Error('Validation failed'),
            ErrorCode.VALIDATION_FAILED,
            details
        );
    }

    aiError(details?: string): ErrorResponse {
        return this.createErrorResponse(
            new Error('AI service error'),
            ErrorCode.AI_RESPONSE_INVALID,
            details
        );
    }
}
