export declare enum ErrorCode {
    VALIDATION_FAILED = 1001,
    INVALID_FORMAT = 1002,
    MISSING_REQUIRED = 1003,
    OUT_OF_RANGE = 1004,
    NOT_AUTHENTICATED = 2001,
    NOT_AUTHORIZED = 2002,
    RATE_LIMITED = 2003,
    SESSION_EXPIRED = 2004,
    AI_UNAVAILABLE = 3001,
    AI_RESPONSE_INVALID = 3002,
    AI_TIMEOUT = 3003,
    AI_QUOTA_EXCEEDED = 3004,
    DB_OPERATION_FAILED = 4001,
    DB_NOT_FOUND = 4002,
    DB_DUPLICATE = 4003,
    DB_CONNECTION_FAILED = 4004,
    INTERNAL_ERROR = 5001,
    SERVICE_UNAVAILABLE = 5002,
    FILE_OPERATION_FAILED = 5003,
    COMMAND_FAILED = 5004,
    EMPLOYEE_NOT_FOUND = 6001,
    INSUFFICIENT_BALANCE = 6002,
    OPERATION_NOT_ALLOWED = 6003,
    ALREADY_EXISTS = 6004
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
export declare class ErrorHandlerService {
    private readonly logger;
    private readonly sensitivePatterns;
    private readonly errorMessages;
    classifyError(error: Error | any): ErrorClassification;
    createErrorResponse(error: Error | any, overrideCode?: ErrorCode, details?: string): ErrorResponse;
    sanitize(input: string): string;
    getUserMessage(code: ErrorCode): string;
    notFound(entity: string): ErrorResponse;
    notAuthorized(): ErrorResponse;
    validationFailed(details: string): ErrorResponse;
    aiError(details?: string): ErrorResponse;
}
