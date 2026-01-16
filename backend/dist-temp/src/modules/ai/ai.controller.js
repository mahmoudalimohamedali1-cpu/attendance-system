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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const ai_service_1 = require("./ai.service");
const policy_parser_service_1 = require("./services/policy-parser.service");
class ParsePolicyDto {
}
let AiController = class AiController {
    constructor(aiService, policyParserService) {
        this.aiService = aiService;
        this.policyParserService = policyParserService;
    }
    getStatus() {
        return {
            available: this.aiService.isAvailable(),
            provider: 'Gemini',
            model: 'gemini-1.5-flash',
        };
    }
    async parsePolicy(dto) {
        try {
            const rule = await this.policyParserService.parsePolicy(dto.text);
            const validation = this.policyParserService.validateParsedRule(rule);
            return {
                success: true,
                rule,
                validation,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }
    async testAi(dto) {
        const response = await this.aiService.generateContent(dto.prompt);
        return { response };
    }
};
exports.AiController = AiController;
__decorate([
    (0, common_1.Get)('status'),
    (0, swagger_1.ApiOperation)({ summary: 'Check AI service status' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AiController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Post)('parse-policy'),
    (0, swagger_1.ApiOperation)({ summary: 'Parse natural language policy text into structured rule' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ParsePolicyDto]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "parsePolicy", null);
__decorate([
    (0, common_1.Post)('test'),
    (0, swagger_1.ApiOperation)({ summary: 'Test AI with a simple prompt' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "testAi", null);
exports.AiController = AiController = __decorate([
    (0, swagger_1.ApiTags)('AI'),
    (0, common_1.Controller)('ai'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [ai_service_1.AiService,
        policy_parser_service_1.PolicyParserService])
], AiController);
//# sourceMappingURL=ai.controller.js.map