"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ErrorHandlerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandlerService = exports.ErrorCode = void 0;
const common_1 = require("@nestjs/common");
var ErrorCode;
(function (ErrorCode) {
    ErrorCode[ErrorCode["VALIDATION_FAILED"] = 1001] = "VALIDATION_FAILED";
    ErrorCode[ErrorCode["INVALID_FORMAT"] = 1002] = "INVALID_FORMAT";
    ErrorCode[ErrorCode["MISSING_REQUIRED"] = 1003] = "MISSING_REQUIRED";
    ErrorCode[ErrorCode["OUT_OF_RANGE"] = 1004] = "OUT_OF_RANGE";
    ErrorCode[ErrorCode["NOT_AUTHENTICATED"] = 2001] = "NOT_AUTHENTICATED";
    ErrorCode[ErrorCode["NOT_AUTHORIZED"] = 2002] = "NOT_AUTHORIZED";
    ErrorCode[ErrorCode["RATE_LIMITED"] = 2003] = "RATE_LIMITED";
    ErrorCode[ErrorCode["SESSION_EXPIRED"] = 2004] = "SESSION_EXPIRED";
    ErrorCode[ErrorCode["AI_UNAVAILABLE"] = 3001] = "AI_UNAVAILABLE";
    ErrorCode[ErrorCode["AI_RESPONSE_INVALID"] = 3002] = "AI_RESPONSE_INVALID";
    ErrorCode[ErrorCode["AI_TIMEOUT"] = 3003] = "AI_TIMEOUT";
    ErrorCode[ErrorCode["AI_QUOTA_EXCEEDED"] = 3004] = "AI_QUOTA_EXCEEDED";
    ErrorCode[ErrorCode["DB_OPERATION_FAILED"] = 4001] = "DB_OPERATION_FAILED";
    ErrorCode[ErrorCode["DB_NOT_FOUND"] = 4002] = "DB_NOT_FOUND";
    ErrorCode[ErrorCode["DB_DUPLICATE"] = 4003] = "DB_DUPLICATE";
    ErrorCode[ErrorCode["DB_CONNECTION_FAILED"] = 4004] = "DB_CONNECTION_FAILED";
    ErrorCode[ErrorCode["INTERNAL_ERROR"] = 5001] = "INTERNAL_ERROR";
    ErrorCode[ErrorCode["SERVICE_UNAVAILABLE"] = 5002] = "SERVICE_UNAVAILABLE";
    ErrorCode[ErrorCode["FILE_OPERATION_FAILED"] = 5003] = "FILE_OPERATION_FAILED";
    ErrorCode[ErrorCode["COMMAND_FAILED"] = 5004] = "COMMAND_FAILED";
    ErrorCode[ErrorCode["EMPLOYEE_NOT_FOUND"] = 6001] = "EMPLOYEE_NOT_FOUND";
    ErrorCode[ErrorCode["INSUFFICIENT_BALANCE"] = 6002] = "INSUFFICIENT_BALANCE";
    ErrorCode[ErrorCode["OPERATION_NOT_ALLOWED"] = 6003] = "OPERATION_NOT_ALLOWED";
    ErrorCode[ErrorCode["ALREADY_EXISTS"] = 6004] = "ALREADY_EXISTS";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
let ErrorHandlerService = ErrorHandlerService_1 = class ErrorHandlerService {
    constructor() {
        this.logger = new common_1.Logger(ErrorHandlerService_1.name);
        this.sensitivePatterns = [
            /[A-Z]:\\[^\s]+/gi,
            /\/(?:var|home|etc|usr|opt)[^\s]+/gi,
            /node_modules[^\s]+/gi,
            /password[=:]\s*[^\s]+/gi,
            /api[_-]?key[=:]\s*[^\s]+/gi,
            /token[=:]\s*[^\s]+/gi,
            /secret[=:]\s*[^\s]+/gi,
            /\b[\w.-]+@[\w.-]+\.\w+\b/g,
            /\b05\d{8}\b/g,
            /at\s+[\w.]+\s+\([^)]+\)/g,
            /Error:\s+[A-Z][a-z]+Error/g,
        ];
        this.errorMessages = {
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
    }
    classifyError(error) {
        const message = error?.message?.toLowerCase() || '';
        const code = error?.code || '';
        if (code.startsWith('P2') || message.includes('prisma')) {
            if (code === 'P2025' || message.includes('not found')) {
                return { code: ErrorCode.DB_NOT_FOUND, retryable: false, userFacing: true };
            }
            if (code === 'P2002' || message.includes('unique constraint')) {
                return { code: ErrorCode.DB_DUPLICATE, retryable: false, userFacing: true };
            }
            return { code: ErrorCode.DB_OPERATION_FAILED, retryable: true, userFacing: false };
        }
        if (message.includes('timeout') || message.includes('etimedout')) {
            return { code: ErrorCode.AI_TIMEOUT, retryable: true, userFacing: true };
        }
        if (message.includes('rate limit') || message.includes('too many')) {
            return { code: ErrorCode.RATE_LIMITED, retryable: true, userFacing: true };
        }
        if (message.includes('unauthorized') || message.includes('forbidden')) {
            return { code: ErrorCode.NOT_AUTHORIZED, retryable: false, userFacing: true };
        }
        if (message.includes('validation') || message.includes('invalid')) {
            return { code: ErrorCode.VALIDATION_FAILED, retryable: false, userFacing: true };
        }
        return { code: ErrorCode.INTERNAL_ERROR, retryable: false, userFacing: false };
    }
    createErrorResponse(error, overrideCode, details) {
        const classification = this.classifyError(error);
        const code = overrideCode || classification.code;
        const messages = this.errorMessages[code];
        this.logger.error(`[${code}] ${error?.message || 'Unknown error'}`, error?.stack);
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
    sanitize(input) {
        let result = input;
        for (const pattern of this.sensitivePatterns) {
            result = result.replace(pattern, '[REDACTED]');
        }
        if (result.length > 200) {
            result = result.substring(0, 200) + '...';
        }
        return result;
    }
    getUserMessage(code) {
        return this.errorMessages[code]?.ar || 'حدث خطأ';
    }
    notFound(entity) {
        return this.createErrorResponse(new Error(`${entity} not found`), ErrorCode.DB_NOT_FOUND, entity);
    }
    notAuthorized() {
        return this.createErrorResponse(new Error('Not authorized'), ErrorCode.NOT_AUTHORIZED);
    }
    validationFailed(details) {
        return this.createErrorResponse(new Error('Validation failed'), ErrorCode.VALIDATION_FAILED, details);
    }
    aiError(details) {
        return this.createErrorResponse(new Error('AI service error'), ErrorCode.AI_RESPONSE_INVALID, details);
    }
};
exports.ErrorHandlerService = ErrorHandlerService;
exports.ErrorHandlerService = ErrorHandlerService = ErrorHandlerService_1 = __decorate([
    (0, common_1.Injectable)()
], ErrorHandlerService);
//# sourceMappingURL=error-handler.service.js.map