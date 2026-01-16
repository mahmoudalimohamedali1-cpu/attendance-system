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
exports.OrganizationController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const organization_service_1 = require("./organization.service");
let OrganizationController = class OrganizationController {
    constructor(organizationService) {
        this.organizationService = organizationService;
    }
    async getOrgStructure(req) {
        return this.organizationService.getOrgStructure(req.user.companyId);
    }
    async getDepartments(req) {
        return this.organizationService.getDepartments(req.user.companyId);
    }
    async getBranches(req) {
        return this.organizationService.getBranches(req.user.companyId);
    }
    async getOrgStats(req) {
        return this.organizationService.getOrgStats(req.user.companyId);
    }
};
exports.OrganizationController = OrganizationController;
__decorate([
    (0, common_1.Get)('structure'),
    (0, swagger_1.ApiOperation)({ summary: 'الحصول على الهيكل التنظيمي' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'شجرة الهيكل التنظيمي' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrganizationController.prototype, "getOrgStructure", null);
__decorate([
    (0, common_1.Get)('departments'),
    (0, swagger_1.ApiOperation)({ summary: 'الحصول على قائمة الأقسام' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة الأقسام مع إحصائياتها' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrganizationController.prototype, "getDepartments", null);
__decorate([
    (0, common_1.Get)('branches'),
    (0, swagger_1.ApiOperation)({ summary: 'الحصول على قائمة الفروع' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة الفروع مع إحصائياتها' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrganizationController.prototype, "getBranches", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'الحصول على إحصائيات الهيكل التنظيمي' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'ملخص إحصائيات المنظمة' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrganizationController.prototype, "getOrgStats", null);
exports.OrganizationController = OrganizationController = __decorate([
    (0, swagger_1.ApiTags)('Organization'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('organization'),
    __metadata("design:paramtypes", [organization_service_1.OrganizationService])
], OrganizationController);
//# sourceMappingURL=organization.controller.js.map