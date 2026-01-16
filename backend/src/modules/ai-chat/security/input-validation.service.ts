import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * 🔐 Input Validation Service
 * Fixes: #19, #20, #21, #22, #23, #24, #25, #75 - Input validation & prompt injection
 * 
 * Validates and sanitizes ALL user input before processing.
 * Blocks injection attacks, validates formats, and limits sizes.
 */

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

@Injectable()
export class InputValidationService {
    private readonly logger = new Logger(InputValidationService.name);

    // Size limits
    private readonly MAX_MESSAGE_LENGTH = 2000;
    private readonly MAX_NAME_LENGTH = 100;
    private readonly MAX_DESCRIPTION_LENGTH = 1000;
    private readonly MIN_SALARY = 0;
    private readonly MAX_SALARY = 10000000;

    // Dangerous patterns to block
    private readonly injectionPatterns = [
        // SQL Injection
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC)\b)/i,
        /('|")\s*(OR|AND)\s*('|"|\d)/i,
        /;\s*(DROP|DELETE|UPDATE|INSERT)/i,

        // NoSQL Injection
        /\$where\s*:/i,
        /\$gt\s*:/i,
        /\$lt\s*:/i,
        /\$ne\s*:/i,
        /\$regex\s*:/i,

        // Shell Injection
        /[;&|`$(){}[\]\\]/,
        /\b(bash|sh|cmd|powershell|eval|exec)\b/i,

        // Path Traversal
        /\.\.\//,
        /~\//,

        // Script Injection
        /<script\b/i,
        /javascript:/i,
        /on\w+\s*=/i,
    ];

    // Prompt injection patterns
    private readonly promptInjectionPatterns = [
        /ignore\s+(previous|all)\s+(instructions|prompts)/i,
        /disregard\s+(your|the)\s+(instructions|rules)/i,
        /you\s+are\s+now\s+(a|an)/i,
        /pretend\s+(you|to\s+be)/i,
        /act\s+as\s+(if|a|an)/i,
        /forget\s+(everything|your\s+instructions)/i,
        /new\s+instructions:/i,
        /system\s*:\s*you\s+are/i,
        /\[INST\]/i,
        /\[\[SYSTEM\]\]/i,
        /override\s+(your|the)\s+(behavior|instructions)/i,
        /jailbreak/i,
        /DAN\s+mode/i,
    ];

    /**
     * 🔍 Validate and sanitize a chat message
     */
    validateMessage(message: string): ValidationResult {
        const warnings: string[] = [];
        let sanitized = message;

        // Check for empty
        if (!message || message.trim().length === 0) {
            return {
                valid: false,
                sanitized: '',
                warnings: ['Message is empty'],
                blocked: true,
                blockedReason: 'Empty message',
            };
        }

        // Check length
        if (message.length > this.MAX_MESSAGE_LENGTH) {
            warnings.push(`Message truncated from ${message.length} to ${this.MAX_MESSAGE_LENGTH}`);
            sanitized = message.substring(0, this.MAX_MESSAGE_LENGTH);
        }

        // Check for injection attacks
        for (const pattern of this.injectionPatterns) {
            if (pattern.test(message)) {
                this.logger.warn(`Injection attempt blocked: ${pattern}`);
                return {
                    valid: false,
                    sanitized: '',
                    warnings: ['Potential injection detected'],
                    blocked: true,
                    blockedReason: 'Security violation detected',
                };
            }
        }

        // Check for prompt injection
        for (const pattern of this.promptInjectionPatterns) {
            if (pattern.test(message)) {
                this.logger.warn(`Prompt injection attempt: ${pattern}`);
                warnings.push('Prompt manipulation attempt detected');
                // Don't block, but sanitize
                sanitized = sanitized.replace(pattern, '[FILTERED]');
            }
        }

        // Basic sanitization - remove control characters
        sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

        return {
            valid: true,
            sanitized: sanitized.trim(),
            warnings,
            blocked: false,
        };
    }

    /**
     * 📧 Validate email format
     */
    validateEmail(email: string): EmailValidation {
        if (!email) {
            return { valid: false, sanitized: '', error: 'Email is required' };
        }

        const sanitized = email.toLowerCase().trim();

        // RFC 5322 simplified regex
        const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

        if (!emailRegex.test(sanitized)) {
            return { valid: false, sanitized, error: 'Invalid email format' };
        }

        if (sanitized.length > 254) {
            return { valid: false, sanitized, error: 'Email too long' };
        }

        return { valid: true, sanitized };
    }

    /**
     * 🔢 Validate and parse number
     */
    validateNumber(
        input: any,
        min: number = Number.MIN_SAFE_INTEGER,
        max: number = Number.MAX_SAFE_INTEGER
    ): NumberValidation {
        let value: number;

        if (typeof input === 'number') {
            value = input;
        } else if (typeof input === 'string') {
            // Handle Arabic numerals
            const arabicNumerals = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
            let normalized = input;
            for (const [ar, en] of Object.entries(arabicNumerals)) {
                normalized = normalized.replace(new RegExp(ar, 'g'), en);
            }

            // Handle text numbers
            const textNumbers: Record<string, number> = {
                'واحد': 1, 'اثنين': 2, 'ثلاثة': 3, 'اربعة': 4, 'خمسة': 5,
                'ستة': 6, 'سبعة': 7, 'ثمانية': 8, 'تسعة': 9, 'عشرة': 10,
                'عشرين': 20, 'ثلاثين': 30, 'خمسين': 50, 'مئة': 100, 'ألف': 1000,
            };

            if (textNumbers[normalized.trim()]) {
                value = textNumbers[normalized.trim()];
            } else {
                value = parseFloat(normalized.replace(/[^\d.-]/g, ''));
            }
        } else {
            return { valid: false, value: 0, error: 'Invalid number input' };
        }

        if (isNaN(value)) {
            return { valid: false, value: 0, error: 'Not a valid number' };
        }

        if (value < min) {
            return { valid: false, value, error: `Number must be at least ${min}` };
        }

        if (value > max) {
            return { valid: false, value, error: `Number must be at most ${max}` };
        }

        return { valid: true, value };
    }

    /**
     * 👤 Validate name (Arabic/English)
     */
    validateName(name: string): { valid: boolean; sanitized: string; error?: string } {
        if (!name || name.trim().length === 0) {
            return { valid: false, sanitized: '', error: 'Name is required' };
        }

        let sanitized = name.trim();

        if (sanitized.length > this.MAX_NAME_LENGTH) {
            sanitized = sanitized.substring(0, this.MAX_NAME_LENGTH);
        }

        // Allow Arabic, English, spaces, and hyphens
        const nameRegex = /^[\u0600-\u06FFa-zA-Z\s\-']+$/;

        if (!nameRegex.test(sanitized)) {
            // Remove invalid characters instead of rejecting
            sanitized = sanitized.replace(/[^\u0600-\u06FFa-zA-Z\s\-']/g, '');
        }

        if (sanitized.length < 2) {
            return { valid: false, sanitized, error: 'Name too short' };
        }

        return { valid: true, sanitized };
    }

    /**
     * 💰 Validate salary
     */
    validateSalary(salary: any): NumberValidation {
        return this.validateNumber(salary, this.MIN_SALARY, this.MAX_SALARY);
    }

    /**
     * 📅 Validate date string
     */
    validateDate(dateStr: string): { valid: boolean; date: Date | null; error?: string } {
        if (!dateStr) {
            return { valid: false, date: null, error: 'Date is required' };
        }

        try {
            const date = new Date(dateStr);

            if (isNaN(date.getTime())) {
                return { valid: false, date: null, error: 'Invalid date format' };
            }

            // Check reasonable range (1900-2100)
            const year = date.getFullYear();
            if (year < 1900 || year > 2100) {
                return { valid: false, date: null, error: 'Date out of range' };
            }

            return { valid: true, date };
        } catch {
            return { valid: false, date: null, error: 'Date parsing failed' };
        }
    }

    /**
     * 🔒 Sanitize for safe AI prompt inclusion
     */
    sanitizeForPrompt(input: string): string {
        let sanitized = input;

        // Remove prompt injection attempts
        for (const pattern of this.promptInjectionPatterns) {
            sanitized = sanitized.replace(pattern, '');
        }

        // Escape special prompt characters
        sanitized = sanitized
            .replace(/```/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        // Limit length
        if (sanitized.length > 1000) {
            sanitized = sanitized.substring(0, 1000) + '...';
        }

        return sanitized;
    }

    /**
     * 🔐 Hash sensitive data for logging
     */
    hashForLog(sensitive: string): string {
        return crypto.createHash('sha256').update(sensitive).digest('hex').substring(0, 8);
    }

    /**
     * 🛡️ Validate employee creation params
     */
    validateEmployeeParams(params: any): {
        valid: boolean;
        sanitized: any;
        errors: string[];
    } {
        const errors: string[] = [];
        const sanitized: any = {};

        // First name
        const firstName = this.validateName(params.firstName);
        if (!firstName.valid) {
            errors.push(`First name: ${firstName.error}`);
        } else {
            sanitized.firstName = firstName.sanitized;
        }

        // Last name
        const lastName = this.validateName(params.lastName);
        if (!lastName.valid) {
            errors.push(`Last name: ${lastName.error}`);
        } else {
            sanitized.lastName = lastName.sanitized;
        }

        // Email
        const email = this.validateEmail(params.email);
        if (!email.valid) {
            errors.push(`Email: ${email.error}`);
        } else {
            sanitized.email = email.sanitized;
        }

        // Salary (optional)
        if (params.salary !== undefined) {
            const salary = this.validateSalary(params.salary);
            if (!salary.valid) {
                errors.push(`Salary: ${salary.error}`);
            } else {
                sanitized.salary = salary.value;
            }
        }

        // Phone (optional, basic validation)
        if (params.phone) {
            const phoneClean = params.phone.replace(/[^\d+]/g, '');
            if (phoneClean.length >= 8 && phoneClean.length <= 15) {
                sanitized.phone = phoneClean;
            } else {
                errors.push('Phone: Invalid format');
            }
        }

        return {
            valid: errors.length === 0,
            sanitized,
            errors,
        };
    }
}
