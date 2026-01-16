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
exports.AiPredictiveController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const ai_predictive_service_1 = require("./ai-predictive.service");
let AiPredictiveController = class AiPredictiveController {
    constructor(predictiveService) {
        this.predictiveService = predictiveService;
    }
    async forecastAttendance(req, days) {
        const forecast = await this.predictiveService.forecastAttendance(req.user.companyId, days ? parseInt(days) : 7);
        return { success: true, data: forecast };
    }
    async predictTurnover(req) {
        const prediction = await this.predictiveService.predictTurnover(req.user.companyId);
        return { success: true, data: prediction };
    }
    async forecastCosts(req) {
        const forecast = await this.predictiveService.forecastCosts(req.user.companyId);
        return { success: true, data: forecast };
    }
    async getAiPredictions(req) {
        const predictions = await this.predictiveService.getAiPredictions(req.user.companyId);
        return { success: true, predictions };
    }
};
exports.AiPredictiveController = AiPredictiveController;
__decorate([
    (0, common_1.Get)('attendance-forecast'),
    (0, swagger_1.ApiOperation)({ summary: 'توقع الحضور المستقبلي' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AiPredictiveController.prototype, "forecastAttendance", null);
__decorate([
    (0, common_1.Get)('turnover-prediction'),
    (0, swagger_1.ApiOperation)({ summary: 'توقع معدل الدوران' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiPredictiveController.prototype, "predictTurnover", null);
__decorate([
    (0, common_1.Get)('cost-forecast'),
    (0, swagger_1.ApiOperation)({ summary: 'توقع التكاليف المستقبلية' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiPredictiveController.prototype, "forecastCosts", null);
__decorate([
    (0, common_1.Get)('ai-predictions'),
    (0, swagger_1.ApiOperation)({ summary: 'توقعات AI شاملة' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiPredictiveController.prototype, "getAiPredictions", null);
exports.AiPredictiveController = AiPredictiveController = __decorate([
    (0, swagger_1.ApiTags)('AI Predictive - التحليلات التنبؤية'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR', 'MANAGER'),
    (0, common_1.Controller)('ai-predictive'),
    __metadata("design:paramtypes", [ai_predictive_service_1.AiPredictiveService])
], AiPredictiveController);
//# sourceMappingURL=ai-predictive.controller.js.map