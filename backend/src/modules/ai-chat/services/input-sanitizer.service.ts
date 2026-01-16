import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * 🔒 Input Sanitizer Service
 * Sanitizes user input to prevent injection attacks
 */

@Injectable()
export class InputSanitizerService {
    private readonly logger = new Logger(InputSanitizerService.name);

    // Dangerous patterns to block
    private readonly BLOCKED_PATTERNS = [
        // Shell injection patterns
        /[;&|`$(){}[\]<>]/,
        /\$\{/,
        /\$\(/,
        // SQL injection patterns
        /('|")\s*(OR|AND)\s*('|")?\s*\d/i,
        /;\s*(DROP|DELETE|INSERT|UPDATE|EXEC|EXECUTE)/i,
        /--\s*$/,
        // Path traversal
        /\.\.\//,
        /\.\.\\/,
        // Null bytes
        /\x00/,
    ];

    // Maximum message length
    private readonly MAX_MESSAGE_LENGTH = 5000;

    constructor() { }

    /**
     * 🛡️ Sanitize user message
     */
    sanitize(message: string): { safe: boolean; sanitized: string; warnings: string[] } {
        const warnings: string[] = [];
        let sanitized = message;

        // Check length
        if (sanitized.length > this.MAX_MESSAGE_LENGTH) {
            sanitized = sanitized.substring(0, this.MAX_MESSAGE_LENGTH);
            warnings.push('Message truncated due to length');
        }

        // Remove zero-width characters
        sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, '');

        // Check for blocked patterns
        for (const pattern of this.BLOCKED_PATTERNS) {
            if (pattern.test(sanitized)) {
                this.logger.warn(`Blocked pattern detected: ${pattern}`);
                warnings.push('Suspicious pattern detected and removed');
                sanitized = sanitized.replace(pattern, '');
            }
        }

        // Remove control characters except newlines and tabs
        sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

        // Normalize whitespace
        sanitized = sanitized.replace(/\s+/g, ' ').trim();

        const safe = warnings.length === 0;

        if (!safe) {
            this.logger.warn(`Message sanitized with warnings: ${warnings.join(', ')}`);
        }

        return { safe, sanitized, warnings };
    }

    /**
     * 🔍 Validate file path (for any file operations)
     */
    validateFilePath(path: string, allowedPaths: string[]): boolean {
        // Normalize path
        const normalized = path.replace(/\\/g, '/').toLowerCase();

        // Check for path traversal
        if (normalized.includes('..') || normalized.includes('~')) {
            this.logger.warn(`Path traversal attempted: ${path}`);
            return false;
        }

        // Check against whitelist
        const isAllowed = allowedPaths.some(allowed =>
            normalized.startsWith(allowed.toLowerCase())
        );

        if (!isAllowed) {
            this.logger.warn(`Path not in whitelist: ${path}`);
        }

        return isAllowed;
    }

    /**
     * 🔐 Hash sensitive data for logging
     */
    hashForLog(data: string): string {
        return crypto.createHash('sha256').update(data).digest('hex').substring(0, 12);
    }

    /**
     * 📝 Escape HTML entities (for any HTML output)
     */
    escapeHtml(text: string): string {
        const map: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
        };
        return text.replace(/[&<>"']/g, char => map[char]);
    }

    /**
     * 🔧 Extract safe parameters from message
     */
    extractParameters(
        message: string,
        allowedKeys: string[]
    ): Record<string, string> {
        const params: Record<string, string> = {};

        // Simple key=value extraction
        const matches = message.matchAll(/(\w+)\s*[=:]\s*["']?([^"'\s,]+)["']?/g);

        for (const match of matches) {
            const key = match[1].toLowerCase();
            const value = match[2];

            if (allowedKeys.includes(key)) {
                params[key] = this.sanitize(value).sanitized;
            }
        }

        return params;
    }

    /**
     * ✅ Check if message looks like a valid Arabic/English request
     */
    isValidRequest(message: string): boolean {
        // Must have some Arabic or English letters
        const hasLetters = /[\u0600-\u06FFa-zA-Z]/.test(message);

        // Must be at least 2 characters
        const hasMinLength = message.length >= 2;

        // Must not be all special characters
        const notAllSpecial = /^[^\u0600-\u06FFa-zA-Z0-9\s]+$/.test(message) === false;

        return hasLetters && hasMinLength && notAllSpecial;
    }

    /**
     * 📊 Get sanitization statistics
     */
    getBlockedPatternsCount(): number {
        return this.BLOCKED_PATTERNS.length;
    }
}
