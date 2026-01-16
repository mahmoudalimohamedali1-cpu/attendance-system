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
exports.GosiController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const gosi_service_1 = require("./gosi.service");
const gosi_calculation_service_1 = require("./gosi-calculation.service");
const create_gosi_config_dto_1 = require("./dto/create-gosi-config.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let GosiController = class GosiController {
    constructor(service, calculationService) {
        this.service = service;
        this.calculationService = calculationService;
    }
    create(dto, companyId) {
        return this.service.create(dto, companyId);
    }
    getActiveConfig(companyId) {
        return this.service.getActiveConfig(companyId);
    }
    findAll(companyId) {
        return this.service.findAll(companyId);
    }
    update(id, dto, companyId) {
        return this.service.update(id, dto, companyId);
    }
    async getReport(runId, companyId) {
        return this.calculationService.generateReport(runId, companyId);
    }
};
exports.GosiController = GosiController;
__decorate([
    (0, common_1.Post)('config'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'إضافة إعدادات تأمينات جديدة' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_gosi_config_dto_1.CreateGosiConfigDto, String]),
    __metadata("design:returntype", void 0)
], GosiController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('config/active'),
    (0, swagger_1.ApiOperation)({ summary: 'الحصول على الإعدادات المفعلة حالياً' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GosiController.prototype, "getActiveConfig", null);
__decorate([
    (0, common_1.Get)('configs'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'عرض سجل الإعدادات' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GosiController.prototype, "findAll", null);
__decorate([
    (0, common_1.Patch)('config/:id'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'تحديث إعداد معين' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], GosiController.prototype, "update", null);
__decorate([
    (0, common_1.Get)('report/:runId'),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR'),
    (0, swagger_1.ApiOperation)({ summary: 'تقرير اشتراكات التأمينات لمسير معين' }),
    __param(0, (0, common_1.Param)('runId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], GosiController.prototype, "getReport", null);
exports.GosiController = GosiController = __decorate([
    (0, swagger_1.ApiTags)('GOSI'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('gosi'),
    __metadata("design:paramtypes", [gosi_service_1.GosiService,
        gosi_calculation_service_1.GosiCalculationService])
], GosiController);
//# sourceMappingURL=gosi.controller.js.map