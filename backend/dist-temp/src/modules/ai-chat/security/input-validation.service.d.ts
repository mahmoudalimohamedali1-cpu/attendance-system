export interface ValidationResult {
    valid: boolean;
    sanitized: string;
    warnings: string[];
    blocked: boolean;
    blockedReason?: string;
}
export interface EmailValidation {
    valid: boolean;
    sanitized: string;
    error?: string;
}
export interface NumberValidation {
    valid: boolean;
    value: number;
    error?: string;
}
export declare class InputValidationService {
    private readonly logger;
    private readonly MAX_MESSAGE_LENGTH;
    private readonly MAX_NAME_LENGTH;
    private readonly MAX_DESCRIPTION_LENGTH;
    private readonly MIN_SALARY;
    private readonly MAX_SALARY;
    private readonly injectionPatterns;
    private readonly promptInjectionPatterns;
    validateMessage(message: string): ValidationResult;
    validateEmail(email: string): EmailValidation;
    validateNumber(input: any, min?: number, max?: number): NumberValidation;
    validateName(name: string): {
        valid: boolean;
        sanitized: string;
        error?: string;
    };
    validateSalary(salary: any): NumberValidation;
    validateDate(dateStr: string): {
        valid: boolean;
        date: Date | null;
        error?: string;
    };
    sanitizeForPrompt(input: string): string;
    hashForLog(sensitive: string): string;
    validateEmployeeParams(params: any): {
        valid: boolean;
        sanitized: any;
        errors: string[];
    };
}
