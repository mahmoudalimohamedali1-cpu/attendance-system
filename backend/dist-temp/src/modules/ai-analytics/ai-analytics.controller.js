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
exports.AiAnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const ai_analytics_service_1 = require("./ai-analytics.service");
let AiAnalyticsController = class AiAnalyticsController {
    constructor(analyticsService) {
        this.analyticsService = analyticsService;
    }
    async getMyScore(req) {
        const score = await this.analyticsService.calculateEmployeeScore(req.user.id);
        return {
            success: true,
            data: score,
        };
    }
    async getEmployeeScore(id) {
        const score = await this.analyticsService.calculateEmployeeScore(id);
        return {
            success: true,
            data: score,
        };
    }
    async getTeamAnalytics(req) {
        const analytics = await this.analyticsService.getTeamAnalytics(req.user.companyId);
        return {
            success: true,
            data: analytics,
        };
    }
    async getMyInsights(req) {
        const insights = await this.analyticsService.getProductivityInsights(req.user.id);
        return {
            success: true,
            insights,
        };
    }
    async predictAbsence(id) {
        const prediction = await this.analyticsService.predictAbsence(id);
        return {
            success: true,
            data: prediction,
        };
    }
    async getLatePatterns(req) {
        const patterns = await this.analyticsService.detectLatePatterns(req.user.companyId);
        return {
            success: true,
            data: patterns,
        };
    }
};
exports.AiAnalyticsController = AiAnalyticsController;
__decorate([
    (0, common_1.Get)('my-score'),
    (0, swagger_1.ApiOperation)({ summary: 'جلب نقاط أدائي' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiAnalyticsController.prototype, "getMyScore", null);
__decorate([
    (0, common_1.Get)('employee/:id/score'),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'جلب نقاط أداء موظف معين' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AiAnalyticsController.prototype, "getEmployeeScore", null);
__decorate([
    (0, common_1.Get)('team'),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'جلب تحليلات الفريق' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiAnalyticsController.prototype, "getTeamAnalytics", null);
__decorate([
    (0, common_1.Get)('my-insights'),
    (0, swagger_1.ApiOperation)({ summary: 'جلب رؤى الإنتاجية الشخصية' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiAnalyticsController.prototype, "getMyInsights", null);
__decorate([
    (0, common_1.Get)('employee/:id/absence-prediction'),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'توقع احتمالية غياب موظف' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AiAnalyticsController.prototype, "predictAbsence", null);
__decorate([
    (0, common_1.Get)('late-patterns'),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'كشف أنماط التأخير' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiAnalyticsController.prototype, "getLatePatterns", null);
exports.AiAnalyticsController = AiAnalyticsController = __decorate([
    (0, swagger_1.ApiTags)('AI Analytics - تحليلات الذكاء الاصطناعي'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('ai-analytics'),
    __metadata("design:paramtypes", [ai_analytics_service_1.AiAnalyticsService])
], AiAnalyticsController);
//# sourceMappingURL=ai-analytics.controller.js.map