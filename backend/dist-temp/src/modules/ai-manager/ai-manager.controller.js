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
exports.AiManagerController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const ai_manager_service_1 = require("./ai-manager.service");
let AiManagerController = class AiManagerController {
    constructor(managerService) {
        this.managerService = managerService;
    }
    async getTeamHealth(req) {
        const health = await this.managerService.getTeamHealthScore(req.user.companyId);
        return { success: true, data: health };
    }
    async getWorkloadDistribution(req) {
        const workload = await this.managerService.analyzeWorkloadDistribution(req.user.companyId);
        return { success: true, data: workload };
    }
    async getBurnoutRisks(req) {
        const risks = await this.managerService.detectBurnoutRisks(req.user.companyId);
        return { success: true, count: risks.length, data: risks };
    }
    async getManagerInsights(req) {
        const insights = await this.managerService.getManagerInsights(req.user.companyId);
        return { success: true, insights };
    }
};
exports.AiManagerController = AiManagerController;
__decorate([
    (0, common_1.Get)('team-health'),
    (0, swagger_1.ApiOperation)({ summary: 'صحة الفريق الإجمالية' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiManagerController.prototype, "getTeamHealth", null);
__decorate([
    (0, common_1.Get)('workload'),
    (0, swagger_1.ApiOperation)({ summary: 'تحليل توزيع عبء العمل' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiManagerController.prototype, "getWorkloadDistribution", null);
__decorate([
    (0, common_1.Get)('burnout-risks'),
    (0, swagger_1.ApiOperation)({ summary: 'كشف مخاطر الإرهاق' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiManagerController.prototype, "getBurnoutRisks", null);
__decorate([
    (0, common_1.Get)('insights'),
    (0, swagger_1.ApiOperation)({ summary: 'نصائح AI للمدير' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiManagerController.prototype, "getManagerInsights", null);
exports.AiManagerController = AiManagerController = __decorate([
    (0, swagger_1.ApiTags)('AI Manager - لوحة المدير الذكية'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR', 'MANAGER'),
    (0, common_1.Controller)('ai-manager'),
    __metadata("design:paramtypes", [ai_manager_service_1.AiManagerService])
], AiManagerController);
//# sourceMappingURL=ai-manager.controller.js.map