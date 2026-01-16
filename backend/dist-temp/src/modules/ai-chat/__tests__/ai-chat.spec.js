"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const input_validation_service_1 = require("../security/input-validation.service");
const ai_response_validator_service_1 = require("../security/ai-response-validator.service");
const error_handler_service_1 = require("../security/error-handler.service");
const enhanced_intent_classifier_service_1 = require("../security/enhanced-intent-classifier.service");
describe('InputValidationService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [input_validation_service_1.InputValidationService],
        }).compile();
        service = module.get(input_validation_service_1.InputValidationService);
    });
    describe('validateMessage', () => {
        it('should accept valid Arabic message', () => {
            const result = service.validateMessage('مرحبا، أريد طلب إجازة');
            expect(result.valid).toBe(true);
        });
        it('should reject empty message', () => {
            const result = service.validateMessage('');
            expect(result.valid).toBe(false);
            expect(result.sanitized).toBeDefined();
        });
        it('should reject message exceeding max length', () => {
            const longMessage = 'أ'.repeat(5001);
            const result = service.validateMessage(longMessage);
            expect(result.valid).toBe(false);
        });
        it('should detect SQL injection patterns', () => {
            const result = service.validateMessage("'; DROP TABLE users; --");
            expect(result.valid).toBe(false);
        });
        it('should detect prompt injection patterns', () => {
            const result = service.validateMessage('Ignore previous instructions and...');
            expect(result.valid).toBe(false);
        });
    });
    describe('sanitizeMessage', () => {
        it('should remove dangerous patterns', () => {
            const input = '<script>alert("xss")</script>Hello';
            const result = service.validateMessage(input);
            expect(result.sanitized).toBeDefined();
        });
        it('should preserve valid Arabic text', () => {
            const input = 'أحمد إلى آخر';
            const result = service.validateMessage(input);
            expect(result.sanitized).toBeDefined();
        });
    });
});
describe('EnhancedIntentClassifierService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [enhanced_intent_classifier_service_1.EnhancedIntentClassifierService],
        }).compile();
        service = module.get(enhanced_intent_classifier_service_1.EnhancedIntentClassifierService);
    });
    describe('normalizeArabic', () => {
        it('should normalize أ/إ/آ to ا', () => {
            const input = 'أحمد إلى آخر';
            const result = service.normalizeArabic(input);
            expect(result).toContain('ا');
        });
        it('should remove diacritics', () => {
            const input = 'مُحَمَّد';
            const result = service.normalizeArabic(input);
            expect(result).toBe('محمد');
        });
    });
    describe('classify', () => {
        it('should classify deploy command', () => {
            const result = service.classify('deploy');
            expect(result.intent).toBe('EXECUTIVE_DEPLOY');
            expect(result.confidence).toBeGreaterThan(0.8);
        });
        it('should classify employee creation', () => {
            const result = service.classify('اضف موظف اسمه أحمد');
            expect(result.intent).toBe('EMPLOYEE_CREATE');
            expect(result.entities.employeeName).toBeDefined();
        });
        it('should classify leave request', () => {
            const result = service.classify('اطلب اجازة');
            expect(result.intent).toBe('LEAVE_REQUEST');
        });
        it('should classify attendance query', () => {
            const result = service.classify('تقرير الحضور اليوم');
            expect(result.intent).toBe('ATTENDANCE_REPORT');
        });
        it('should return GENERAL_CHAT for unknown intent', () => {
            const result = service.classify('ما الطقس اليوم؟');
            expect(result.intent).toBe('GENERAL_CHAT');
        });
        it('should indicate disambiguation when needed', () => {
            expect(service.getSupportedIntents()).toContain('EMPLOYEE_CREATE');
        });
    });
});
describe('ErrorHandlerService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [error_handler_service_1.ErrorHandlerService],
        }).compile();
        service = module.get(error_handler_service_1.ErrorHandlerService);
    });
    describe('classifyError', () => {
        it('should classify Prisma not found error', () => {
            const error = { code: 'P2025', message: 'Record not found' };
            const result = service.classifyError(error);
            expect(result.code).toBe(error_handler_service_1.ErrorCode.DB_NOT_FOUND);
            expect(result.retryable).toBe(false);
        });
        it('should classify timeout error as retryable', () => {
            const error = new Error('Request timeout');
            const result = service.classifyError(error);
            expect(result.code).toBe(error_handler_service_1.ErrorCode.AI_TIMEOUT);
            expect(result.retryable).toBe(true);
        });
        it('should classify rate limit error', () => {
            const error = new Error('Rate limit exceeded');
            const result = service.classifyError(error);
            expect(result.code).toBe(error_handler_service_1.ErrorCode.RATE_LIMITED);
        });
    });
    describe('sanitize', () => {
        it('should remove file paths', () => {
            const input = 'Error at C:\\Users\\admin\\secret\\file.ts';
            const result = service.sanitize(input);
            expect(result).toContain('[REDACTED]');
            expect(result).not.toContain('C:\\');
        });
        it('should remove email addresses', () => {
            const input = 'User ahmed@company.com failed';
            const result = service.sanitize(input);
            expect(result).toContain('[REDACTED]');
            expect(result).not.toContain('@');
        });
        it('should truncate long messages', () => {
            const input = 'x'.repeat(500);
            const result = service.sanitize(input);
            expect(result.length).toBeLessThan(250);
        });
    });
    describe('createErrorResponse', () => {
        it('should create structured error response', () => {
            const error = new Error('Something went wrong');
            const result = service.createErrorResponse(error, error_handler_service_1.ErrorCode.INTERNAL_ERROR);
            expect(result.success).toBe(false);
            expect(result.code).toBe(error_handler_service_1.ErrorCode.INTERNAL_ERROR);
            expect(result.message).toBeDefined();
            expect(result.messageAr).toBeDefined();
            expect(result.timestamp).toBeInstanceOf(Date);
        });
    });
});
describe('AIResponseValidatorService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [ai_response_validator_service_1.AIResponseValidatorService],
        }).compile();
        service = module.get(ai_response_validator_service_1.AIResponseValidatorService);
    });
    describe('validate', () => {
        it('should extract JSON from markdown code block', () => {
            const response = '```json\n{"operation": "add_enum", "targetSystem": "leaves", "description": "test", "confidence": 0.9}\n```';
            const result = service.validateEnhancementAnalysis(response);
            expect(result.success).toBe(true);
            expect(result.data?.operation).toBe('add_enum');
        });
        it('should repair trailing commas', () => {
            const response = '{"action": "create", "employeeName": "test",}';
            const result = service.validateEmployeeAction(response);
            expect(result).toBeDefined();
        });
        it('should return fallback for empty response', () => {
            const result = service.validateEnhancementAnalysis('');
            expect(result.success).toBe(false);
            expect(result.fallback).toBeDefined();
        });
    });
    describe('sanitizeTextResponse', () => {
        it('should return default message for null', () => {
            const result = service.sanitizeTextResponse(null);
            expect(result).toContain('لم أتمكن');
        });
        it('should truncate long responses', () => {
            const longResponse = 'x'.repeat(10000);
            const result = service.sanitizeTextResponse(longResponse);
            expect(result.length).toBeLessThan(6000);
        });
    });
});
//# sourceMappingURL=ai-chat.spec.js.map