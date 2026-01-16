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
exports.PoliciesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const policies_service_1 = require("./policies.service");
const create_policy_dto_1 = require("./dto/create-policy.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let PoliciesController = class PoliciesController {
    constructor(service) {
        this.service = service;
    }
    create(dto, userId, companyId) {
        return this.service.create(dto, companyId, userId);
    }
    findAll(companyId, type) {
        return this.service.findAll(companyId, type);
    }
    findOne(id, companyId) {
        return this.service.findOne(id, companyId);
    }
    resolve(employeeId, companyId, type, date) {
        return this.service.resolvePolicy(type, employeeId, companyId, date ? new Date(date) : undefined);
    }
    update(id, companyId, dto) {
        return this.service.update(id, companyId, dto);
    }
    toggleActive(id, companyId) {
        return this.service.toggleActive(id, companyId);
    }
    remove(id, companyId) {
        return this.service.delete(id, companyId);
    }
    addRule(id, companyId, ruleData) {
        return this.service.addRule(id, companyId, ruleData);
    }
    deleteRule(ruleId, companyId) {
        return this.service.deleteRule(ruleId, companyId);
    }
};
exports.PoliciesController = PoliciesController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'إنشاء سياسة جديدة' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_policy_dto_1.CreatePolicyDto, String, String]),
    __metadata("design:returntype", void 0)
], PoliciesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'عرض جميع السياسات النشطة' }),
    (0, swagger_1.ApiQuery)({ name: 'type', required: false, enum: create_policy_dto_1.PolicyType }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(1, (0, common_1.Query)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PoliciesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'تفاصيل سياسة معينة' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PoliciesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)('resolve/:employeeId'),
    (0, swagger_1.ApiOperation)({ summary: 'الحصول على السياسة المطبقة لموظف' }),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, common_1.Query)('type')),
    __param(3, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], PoliciesController.prototype, "resolve", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'تحديث سياسة' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], PoliciesController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/toggle-active'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'تفعيل/تعطيل سياسة' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PoliciesController.prototype, "toggleActive", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف سياسة' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PoliciesController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/rules'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'إضافة قاعدة لسياسة' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], PoliciesController.prototype, "addRule", null);
__decorate([
    (0, common_1.Delete)('rules/:ruleId'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف قاعدة سياسة' }),
    __param(0, (0, common_1.Param)('ruleId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PoliciesController.prototype, "deleteRule", null);
exports.PoliciesController = PoliciesController = __decorate([
    (0, swagger_1.ApiTags)('Policies'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('policies'),
    __metadata("design:paramtypes", [policies_service_1.PoliciesService])
], PoliciesController);
//# sourceMappingURL=policies.controller.js.map