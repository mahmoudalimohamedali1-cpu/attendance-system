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
exports.AiHrController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const ai_hr_service_1 = require("./ai-hr.service");
let AiHrController = class AiHrController {
    constructor(hrService) {
        this.hrService = hrService;
    }
    async generateLetter(body) {
        const letter = await this.hrService.generateSmartLetter(body.userId, body.letterType, body.customDetails);
        return { success: true, letter };
    }
    async explainPolicy(req, body) {
        const explanation = await this.hrService.explainPolicy(body.question, req.user.role);
        return { success: true, explanation };
    }
    async checkGosiCompliance(req) {
        const compliance = await this.hrService.checkGosiCompliance(req.user.companyId);
        return { success: true, data: compliance };
    }
    async analyzeHiringNeeds(req) {
        const analysis = await this.hrService.analyzeHiringNeeds(req.user.companyId);
        return { success: true, data: analysis };
    }
};
exports.AiHrController = AiHrController;
__decorate([
    (0, common_1.Post)('generate-letter'),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR'),
    (0, swagger_1.ApiOperation)({ summary: 'توليد خطاب ذكي' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiHrController.prototype, "generateLetter", null);
__decorate([
    (0, common_1.Post)('explain-policy'),
    (0, swagger_1.ApiOperation)({ summary: 'شرح سياسة معينة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AiHrController.prototype, "explainPolicy", null);
__decorate([
    (0, common_1.Get)('gosi-compliance'),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR'),
    (0, swagger_1.ApiOperation)({ summary: 'فحص امتثال التأمينات الاجتماعية' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiHrController.prototype, "checkGosiCompliance", null);
__decorate([
    (0, common_1.Get)('hiring-needs'),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR'),
    (0, swagger_1.ApiOperation)({ summary: 'تحليل احتياجات التوظيف' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiHrController.prototype, "analyzeHiringNeeds", null);
exports.AiHrController = AiHrController = __decorate([
    (0, swagger_1.ApiTags)('AI HR - أتمتة الموارد البشرية'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('ai-hr'),
    __metadata("design:paramtypes", [ai_hr_service_1.AiHrService])
], AiHrController);
//# sourceMappingURL=ai-hr.controller.js.map