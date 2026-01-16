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
exports.CompanyConfigController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const company_config_service_1 = require("./company-config.service");
const dto_1 = require("./dto");
let CompanyConfigController = class CompanyConfigController {
    constructor(service) {
        this.service = service;
    }
    async getAvailableTemplates() {
        return this.service.getAvailableTemplates();
    }
    async seedTemplates() {
        return this.service.seedEvaluationTemplates();
    }
    async getRoleLevels(jobFamilyId) {
        return this.service.getRoleLevels(jobFamilyId);
    }
    async createRoleLevel(jobFamilyId, data) {
        return this.service.createRoleLevel(jobFamilyId, data);
    }
    async getConfig(companyId) {
        return this.service.getByCompanyId(companyId);
    }
    async createConfig(dto) {
        return this.service.create(dto);
    }
    async updateConfig(companyId, dto) {
        return this.service.update(companyId, dto);
    }
    async applyTemplate(companyId, companyType) {
        return this.service.applyTemplate(companyId, companyType);
    }
    async getEmployeeBlueprint(companyId, employeeId, cycleId) {
        return this.service.getEmployeeBlueprint(companyId, employeeId, cycleId);
    }
    async getJobFamilies(companyId) {
        return this.service.getJobFamilies(companyId);
    }
    async createJobFamily(companyId, data) {
        return this.service.createJobFamily(companyId, data);
    }
};
exports.CompanyConfigController = CompanyConfigController;
__decorate([
    (0, common_1.Get)('templates/available'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CompanyConfigController.prototype, "getAvailableTemplates", null);
__decorate([
    (0, common_1.Post)('templates/seed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CompanyConfigController.prototype, "seedTemplates", null);
__decorate([
    (0, common_1.Get)('job-families/:jobFamilyId/role-levels'),
    __param(0, (0, common_1.Param)('jobFamilyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CompanyConfigController.prototype, "getRoleLevels", null);
__decorate([
    (0, common_1.Post)('job-families/:jobFamilyId/role-levels'),
    __param(0, (0, common_1.Param)('jobFamilyId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CompanyConfigController.prototype, "createRoleLevel", null);
__decorate([
    (0, common_1.Get)(':companyId'),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CompanyConfigController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateCompanyConfigDto]),
    __metadata("design:returntype", Promise)
], CompanyConfigController.prototype, "createConfig", null);
__decorate([
    (0, common_1.Put)(':companyId'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateCompanyConfigDto]),
    __metadata("design:returntype", Promise)
], CompanyConfigController.prototype, "updateConfig", null);
__decorate([
    (0, common_1.Post)(':companyId/apply-template'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)('companyType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CompanyConfigController.prototype, "applyTemplate", null);
__decorate([
    (0, common_1.Get)(':companyId/blueprint/:employeeId'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('employeeId')),
    __param(2, (0, common_1.Query)('cycleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], CompanyConfigController.prototype, "getEmployeeBlueprint", null);
__decorate([
    (0, common_1.Get)(':companyId/job-families'),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CompanyConfigController.prototype, "getJobFamilies", null);
__decorate([
    (0, common_1.Post)(':companyId/job-families'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CompanyConfigController.prototype, "createJobFamily", null);
exports.CompanyConfigController = CompanyConfigController = __decorate([
    (0, common_1.Controller)('company-config'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [company_config_service_1.CompanyConfigService])
], CompanyConfigController);
//# sourceMappingURL=company-config.controller.js.map