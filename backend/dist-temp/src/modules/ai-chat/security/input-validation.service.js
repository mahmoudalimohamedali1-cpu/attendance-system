"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var InputValidationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputValidationService = void 0;
const common_1 = require("@nestjs/common");
const crypto = require("crypto");
let InputValidationService = InputValidationService_1 = class InputValidationService {
    constructor() {
        this.logger = new common_1.Logger(InputValidationService_1.name);
        this.MAX_MESSAGE_LENGTH = 2000;
        this.MAX_NAME_LENGTH = 100;
        this.MAX_DESCRIPTION_LENGTH = 1000;
        this.MIN_SALARY = 0;
        this.MAX_SALARY = 10000000;
        this.injectionPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC)\b)/i,
            /('|")\s*(OR|AND)\s*('|"|\d)/i,
            /;\s*(DROP|DELETE|UPDATE|INSERT)/i,
            /\$where\s*:/i,
            /\$gt\s*:/i,
            /\$lt\s*:/i,
            /\$ne\s*:/i,
            /\$regex\s*:/i,
            /[;&|`$(){}[\]\\]/,
            /\b(bash|sh|cmd|powershell|eval|exec)\b/i,
            /\.\.\//,
            /~\//,
            /<script\b/i,
            /javascript:/i,
            /on\w+\s*=/i,
        ];
        this.promptInjectionPatterns = [
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
    }
    validateMessage(message) {
        const warnings = [];
        let sanitized = message;
        if (!message || message.trim().length === 0) {
            return {
                valid: false,
                sanitized: '',
                warnings: ['Message is empty'],
                blocked: true,
                blockedReason: 'Empty message',
            };
        }
        if (message.length > this.MAX_MESSAGE_LENGTH) {
            warnings.push(`Message truncated from ${message.length} to ${this.MAX_MESSAGE_LENGTH}`);
            sanitized = message.substring(0, this.MAX_MESSAGE_LENGTH);
        }
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
        for (const pattern of this.promptInjectionPatterns) {
            if (pattern.test(message)) {
                this.logger.warn(`Prompt injection attempt: ${pattern}`);
                warnings.push('Prompt manipulation attempt detected');
                sanitized = sanitized.replace(pattern, '[FILTERED]');
            }
        }
        sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        return {
            valid: true,
            sanitized: sanitized.trim(),
            warnings,
            blocked: false,
        };
    }
    validateEmail(email) {
        if (!email) {
            return { valid: false, sanitized: '', error: 'Email is required' };
        }
        const sanitized = email.toLowerCase().trim();
        const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
        if (!emailRegex.test(sanitized)) {
            return { valid: false, sanitized, error: 'Invalid email format' };
        }
        if (sanitized.length > 254) {
            return { valid: false, sanitized, error: 'Email too long' };
        }
        return { valid: true, sanitized };
    }
    validateNumber(input, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
        let value;
        if (typeof input === 'number') {
            value = input;
        }
        else if (typeof input === 'string') {
            const arabicNumerals = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
            let normalized = input;
            for (const [ar, en] of Object.entries(arabicNumerals)) {
                normalized = normalized.replace(new RegExp(ar, 'g'), en);
            }
            const textNumbers = {
                'واحد': 1, 'اثنين': 2, 'ثلاثة': 3, 'اربعة': 4, 'خمسة': 5,
                'ستة': 6, 'سبعة': 7, 'ثمانية': 8, 'تسعة': 9, 'عشرة': 10,
                'عشرين': 20, 'ثلاثين': 30, 'خمسين': 50, 'مئة': 100, 'ألف': 1000,
            };
            if (textNumbers[normalized.trim()]) {
                value = textNumbers[normalized.trim()];
            }
            else {
                value = parseFloat(normalized.replace(/[^\d.-]/g, ''));
            }
        }
        else {
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
    validateName(name) {
        if (!name || name.trim().length === 0) {
            return { valid: false, sanitized: '', error: 'Name is required' };
        }
        let sanitized = name.trim();
        if (sanitized.length > this.MAX_NAME_LENGTH) {
            sanitized = sanitized.substring(0, this.MAX_NAME_LENGTH);
        }
        const nameRegex = /^[\u0600-\u06FFa-zA-Z\s\-']+$/;
        if (!nameRegex.test(sanitized)) {
            sanitized = sanitized.replace(/[^\u0600-\u06FFa-zA-Z\s\-']/g, '');
        }
        if (sanitized.length < 2) {
            return { valid: false, sanitized, error: 'Name too short' };
        }
        return { valid: true, sanitized };
    }
    validateSalary(salary) {
        return this.validateNumber(salary, this.MIN_SALARY, this.MAX_SALARY);
    }
    validateDate(dateStr) {
        if (!dateStr) {
            return { valid: false, date: null, error: 'Date is required' };
        }
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                return { valid: false, date: null, error: 'Invalid date format' };
            }
            const year = date.getFullYear();
            if (year < 1900 || year > 2100) {
                return { valid: false, date: null, error: 'Date out of range' };
            }
            return { valid: true, date };
        }
        catch {
            return { valid: false, date: null, error: 'Date parsing failed' };
        }
    }
    sanitizeForPrompt(input) {
        let sanitized = input;
        for (const pattern of this.promptInjectionPatterns) {
            sanitized = sanitized.replace(pattern, '');
        }
        sanitized = sanitized
            .replace(/```/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        if (sanitized.length > 1000) {
            sanitized = sanitized.substring(0, 1000) + '...';
        }
        return sanitized;
    }
    hashForLog(sensitive) {
        return crypto.createHash('sha256').update(sensitive).digest('hex').substring(0, 8);
    }
    validateEmployeeParams(params) {
        const errors = [];
        const sanitized = {};
        const firstName = this.validateName(params.firstName);
        if (!firstName.valid) {
            errors.push(`First name: ${firstName.error}`);
        }
        else {
            sanitized.firstName = firstName.sanitized;
        }
        const lastName = this.validateName(params.lastName);
        if (!lastName.valid) {
            errors.push(`Last name: ${lastName.error}`);
        }
        else {
            sanitized.lastName = lastName.sanitized;
        }
        const email = this.validateEmail(params.email);
        if (!email.valid) {
            errors.push(`Email: ${email.error}`);
        }
        else {
            sanitized.email = email.sanitized;
        }
        if (params.salary !== undefined) {
            const salary = this.validateSalary(params.salary);
            if (!salary.valid) {
                errors.push(`Salary: ${salary.error}`);
            }
            else {
                sanitized.salary = salary.value;
            }
        }
        if (params.phone) {
            const phoneClean = params.phone.replace(/[^\d+]/g, '');
            if (phoneClean.length >= 8 && phoneClean.length <= 15) {
                sanitized.phone = phoneClean;
            }
            else {
                errors.push('Phone: Invalid format');
            }
        }
        return {
            valid: errors.length === 0,
            sanitized,
            errors,
        };
    }
};
exports.InputValidationService = InputValidationService;
exports.InputValidationService = InputValidationService = InputValidationService_1 = __decorate([
    (0, common_1.Injectable)()
], InputValidationService);
//# sourceMappingURL=input-validation.service.js.map