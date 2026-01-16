import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
    BadRequestException,
    NotFoundException,
    UnauthorizedException,
    ForbiddenException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ERROR_MESSAGES } from '../constants/smart-policy.constants';

/**
 * 🔒 Smart Policy Exception Filter
 * يتعامل مع جميع الأخطاء في نظام السياسات الذكية
 * 
 * Features:
 * - توحيد صيغة الأخطاء
 * - ترجمة الأخطاء للعربية
 * - إخفاء تفاصيل الأخطاء الداخلية في الإنتاج
 * - تسجيل شامل للأخطاء
 * - دعم أخطاء Prisma
 */

// ============== Types ==============

interface ErrorResponse {
    statusCode: number;
    message: string;
    error: string;
    timestamp: string;
    path: string;
    requestId?: string;
    details?: any;
}

// ============== Custom Exceptions ==============

export class PolicyNotFoundException extends NotFoundException {
    constructor(policyId?: string) {
        super({
            statusCode: HttpStatus.NOT_FOUND,
            message: policyId 
                ? `السياسة ${policyId} غير موجودة`
                : ERROR_MESSAGES.POLICY_NOT_FOUND,
            error: 'Policy Not Found',
        });
    }
}

export class PolicyValidationException extends BadRequestException {
    constructor(errors: string[]) {
        super({
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'فشل التحقق من صحة البيانات',
            error: 'Validation Failed',
            details: errors,
        });
    }
}

export class PolicyParseException extends BadRequestException {
    constructor(originalText: string, parseErrors?: string[]) {
        super({
            statusCode: HttpStatus.BAD_REQUEST,
            message: ERROR_MESSAGES.POLICY_PARSE_FAILED,
            error: 'Policy Parse Failed',
            details: {
                originalText: originalText.substring(0, 100) + '...',
                errors: parseErrors,
            },
        });
    }
}

export class FormulaEvaluationException extends BadRequestException {
    constructor(formula: string, error: string) {
        super({
            statusCode: HttpStatus.BAD_REQUEST,
            message: ERROR_MESSAGES.FORMULA_INVALID,
            error: 'Formula Evaluation Failed',
            details: {
                formula: formula.substring(0, 100),
                error,
            },
        });
    }
}

export class ApprovalRequiredException extends ForbiddenException {
    constructor(requiredLevel: string) {
        super({
            statusCode: HttpStatus.FORBIDDEN,
            message: ERROR_MESSAGES.APPROVAL_REQUIRED,
            error: 'Approval Required',
            details: { requiredLevel },
        });
    }
}

export class ConflictException extends HttpException {
    constructor(conflictingPolicies: string[]) {
        super(
            {
                statusCode: HttpStatus.CONFLICT,
                message: 'تعارض مع سياسات أخرى',
                error: 'Policy Conflict',
                details: { conflictingPolicies },
            },
            HttpStatus.CONFLICT,
        );
    }
}

export class RetroApplicationException extends BadRequestException {
    constructor(message: string, details?: any) {
        super({
            statusCode: HttpStatus.BAD_REQUEST,
            message,
            error: 'Retroactive Application Failed',
            details,
        });
    }
}

// ============== Filter Implementation ==============

@Catch()
export class SmartPolicyExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(SmartPolicyExceptionFilter.name);
    private readonly isProduction = process.env.NODE_ENV === 'production';

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const errorResponse = this.buildErrorResponse(exception, request);

        // تسجيل الخطأ
        this.logError(exception, errorResponse, request);

        response.status(errorResponse.statusCode).json(errorResponse);
    }

    /**
     * بناء استجابة الخطأ
     */
    private buildErrorResponse(exception: unknown, request: Request): ErrorResponse {
        const timestamp = new Date().toISOString();
        const path = request.url;
        const requestId = request.headers['x-request-id'] as string;

        // HttpException
        if (exception instanceof HttpException) {
            const status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'object') {
                const resp = exceptionResponse as any;
                return {
                    statusCode: status,
                    message: resp.message || exception.message,
                    error: resp.error || this.getErrorName(status),
                    timestamp,
                    path,
                    requestId,
                    details: this.isProduction ? undefined : resp.details,
                };
            }

            return {
                statusCode: status,
                message: String(exceptionResponse),
                error: this.getErrorName(status),
                timestamp,
                path,
                requestId,
            };
        }

        // Prisma Errors
        if (exception instanceof Prisma.PrismaClientKnownRequestError) {
            return this.handlePrismaError(exception, timestamp, path, requestId);
        }

        if (exception instanceof Prisma.PrismaClientValidationError) {
            return {
                statusCode: HttpStatus.BAD_REQUEST,
                message: 'خطأ في البيانات المدخلة',
                error: 'Validation Error',
                timestamp,
                path,
                requestId,
                details: this.isProduction ? undefined : {
                    type: 'PrismaValidationError',
                },
            };
        }

        // Generic Error
        if (exception instanceof Error) {
            return {
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: this.isProduction 
                    ? ERROR_MESSAGES.INTERNAL_ERROR 
                    : exception.message,
                error: 'Internal Server Error',
                timestamp,
                path,
                requestId,
                details: this.isProduction ? undefined : {
                    name: exception.name,
                    stack: exception.stack?.split('\n').slice(0, 5),
                },
            };
        }

        // Unknown Error
        return {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: ERROR_MESSAGES.INTERNAL_ERROR,
            error: 'Internal Server Error',
            timestamp,
            path,
            requestId,
        };
    }

    /**
     * معالجة أخطاء Prisma
     */
    private handlePrismaError(
        error: Prisma.PrismaClientKnownRequestError,
        timestamp: string,
        path: string,
        requestId?: string,
    ): ErrorResponse {
        const baseResponse = {
            timestamp,
            path,
            requestId,
        };

        switch (error.code) {
            case 'P2002':
                // Unique constraint violation
                const target = (error.meta?.target as string[])?.join(', ') || 'field';
                return {
                    ...baseResponse,
                    statusCode: HttpStatus.CONFLICT,
                    message: `القيمة موجودة مسبقاً: ${target}`,
                    error: 'Duplicate Entry',
                };

            case 'P2025':
                // Record not found
                return {
                    ...baseResponse,
                    statusCode: HttpStatus.NOT_FOUND,
                    message: 'السجل غير موجود',
                    error: 'Not Found',
                };

            case 'P2003':
                // Foreign key constraint
                return {
                    ...baseResponse,
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: 'لا يمكن الربط مع سجل غير موجود',
                    error: 'Invalid Reference',
                };

            case 'P2014':
                // Required relation violation
                return {
                    ...baseResponse,
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: 'لا يمكن حذف هذا السجل لأنه مرتبط بسجلات أخرى',
                    error: 'Cannot Delete',
                };

            case 'P2024':
                // Connection timeout
                return {
                    ...baseResponse,
                    statusCode: HttpStatus.SERVICE_UNAVAILABLE,
                    message: 'انتهت مهلة الاتصال بقاعدة البيانات',
                    error: 'Database Timeout',
                };

            default:
                return {
                    ...baseResponse,
                    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: this.isProduction
                        ? 'خطأ في قاعدة البيانات'
                        : `Database error: ${error.code}`,
                    error: 'Database Error',
                    details: this.isProduction ? undefined : {
                        code: error.code,
                        meta: error.meta,
                    },
                };
        }
    }

    /**
     * تسجيل الخطأ
     */
    private logError(
        exception: unknown,
        errorResponse: ErrorResponse,
        request: Request,
    ): void {
        const logData = {
            statusCode: errorResponse.statusCode,
            message: errorResponse.message,
            path: errorResponse.path,
            method: request.method,
            requestId: errorResponse.requestId,
            userId: (request as any).user?.id,
            companyId: (request as any).user?.companyId,
            ip: request.ip,
            userAgent: request.headers['user-agent'],
        };

        // تحديد مستوى السجل بناءً على نوع الخطأ
        if (errorResponse.statusCode >= 500) {
            this.logger.error(
                `[${errorResponse.statusCode}] ${errorResponse.message}`,
                exception instanceof Error ? exception.stack : undefined,
                JSON.stringify(logData),
            );
        } else if (errorResponse.statusCode >= 400) {
            this.logger.warn(
                `[${errorResponse.statusCode}] ${errorResponse.message}`,
                JSON.stringify(logData),
            );
        } else {
            this.logger.log(
                `[${errorResponse.statusCode}] ${errorResponse.message}`,
                JSON.stringify(logData),
            );
        }
    }

    /**
     * جلب اسم الخطأ من الـ status code
     */
    private getErrorName(statusCode: number): string {
        const names: Record<number, string> = {
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            405: 'Method Not Allowed',
            409: 'Conflict',
            422: 'Unprocessable Entity',
            429: 'Too Many Requests',
            500: 'Internal Server Error',
            502: 'Bad Gateway',
            503: 'Service Unavailable',
            504: 'Gateway Timeout',
        };

        return names[statusCode] || 'Error';
    }
}

// ============== Exception Helpers ==============

/**
 * رمي خطأ سياسة غير موجودة
 */
export function throwPolicyNotFound(policyId?: string): never {
    throw new PolicyNotFoundException(policyId);
}

/**
 * رمي خطأ تحقق
 */
export function throwValidationError(errors: string[]): never {
    throw new PolicyValidationException(errors);
}

/**
 * رمي خطأ تحليل السياسة
 */
export function throwParseError(originalText: string, errors?: string[]): never {
    throw new PolicyParseException(originalText, errors);
}

/**
 * رمي خطأ المعادلة
 */
export function throwFormulaError(formula: string, error: string): never {
    throw new FormulaEvaluationException(formula, error);
}

/**
 * التحقق من أن السياسة موجودة
 */
export function assertPolicyExists<T>(policy: T | null | undefined, policyId?: string): asserts policy is T {
    if (!policy) {
        throw new PolicyNotFoundException(policyId);
    }
}

/**
 * التحقق من صحة البيانات
 */
export function assertValid(condition: boolean, message: string): asserts condition {
    if (!condition) {
        throw new PolicyValidationException([message]);
    }
}
