"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var InputSanitizerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputSanitizerService = void 0;
const common_1 = require("@nestjs/common");
const crypto = require("crypto");
let InputSanitizerService = InputSanitizerService_1 = class InputSanitizerService {
    constructor() {
        this.logger = new common_1.Logger(InputSanitizerService_1.name);
        this.BLOCKED_PATTERNS = [
            /[;&|`$(){}[\]<>]/,
            /\$\{/,
            /\$\(/,
            /('|")\s*(OR|AND)\s*('|")?\s*\d/i,
            /;\s*(DROP|DELETE|INSERT|UPDATE|EXEC|EXECUTE)/i,
            /--\s*$/,
            /\.\.\//,
            /\.\.\\/,
            /\x00/,
        ];
        this.MAX_MESSAGE_LENGTH = 5000;
    }
    sanitize(message) {
        const warnings = [];
        let sanitized = message;
        if (sanitized.length > this.MAX_MESSAGE_LENGTH) {
            sanitized = sanitized.substring(0, this.MAX_MESSAGE_LENGTH);
            warnings.push('Message truncated due to length');
        }
        sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, '');
        for (const pattern of this.BLOCKED_PATTERNS) {
            if (pattern.test(sanitized)) {
                this.logger.warn(`Blocked pattern detected: ${pattern}`);
                warnings.push('Suspicious pattern detected and removed');
                sanitized = sanitized.replace(pattern, '');
            }
        }
        sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        sanitized = sanitized.replace(/\s+/g, ' ').trim();
        const safe = warnings.length === 0;
        if (!safe) {
            this.logger.warn(`Message sanitized with warnings: ${warnings.join(', ')}`);
        }
        return { safe, sanitized, warnings };
    }
    validateFilePath(path, allowedPaths) {
        const normalized = path.replace(/\\/g, '/').toLowerCase();
        if (normalized.includes('..') || normalized.includes('~')) {
            this.logger.warn(`Path traversal attempted: ${path}`);
            return false;
        }
        const isAllowed = allowedPaths.some(allowed => normalized.startsWith(allowed.toLowerCase()));
        if (!isAllowed) {
            this.logger.warn(`Path not in whitelist: ${path}`);
        }
        return isAllowed;
    }
    hashForLog(data) {
        return crypto.createHash('sha256').update(data).digest('hex').substring(0, 12);
    }
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
        };
        return text.replace(/[&<>"']/g, char => map[char]);
    }
    extractParameters(message, allowedKeys) {
        const params = {};
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
    isValidRequest(message) {
        const hasLetters = /[\u0600-\u06FFa-zA-Z]/.test(message);
        const hasMinLength = message.length >= 2;
        const notAllSpecial = /^[^\u0600-\u06FFa-zA-Z0-9\s]+$/.test(message) === false;
        return hasLetters && hasMinLength && notAllSpecial;
    }
    getBlockedPatternsCount() {
        return this.BLOCKED_PATTERNS.length;
    }
};
exports.InputSanitizerService = InputSanitizerService;
exports.InputSanitizerService = InputSanitizerService = InputSanitizerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], InputSanitizerService);
//# sourceMappingURL=input-sanitizer.service.js.map