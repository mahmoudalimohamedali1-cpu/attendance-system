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
exports.SalaryComponentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const salary_components_service_1 = require("./salary-components.service");
const create_salary_component_dto_1 = require("./dto/create-salary-component.dto");
const update_salary_component_dto_1 = require("./dto/update-salary-component.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let SalaryComponentsController = class SalaryComponentsController {
    constructor(service) {
        this.service = service;
    }
    create(dto, companyId) {
        return this.service.create(dto, companyId);
    }
    findAll(companyId) {
        return this.service.findAll(companyId);
    }
    findOne(id, companyId) {
        return this.service.findOne(id, companyId);
    }
    update(id, companyId, dto) {
        return this.service.update(id, companyId, dto);
    }
    remove(id, companyId) {
        return this.service.remove(id, companyId);
    }
};
exports.SalaryComponentsController = SalaryComponentsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'إنشاء مكون راتب جديد' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_salary_component_dto_1.CreateSalaryComponentDto, String]),
    __metadata("design:returntype", void 0)
], SalaryComponentsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'عرض كل مكونات الراتب' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SalaryComponentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'عرض تفاصيل مكون' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SalaryComponentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'تحديث مكون' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_salary_component_dto_1.UpdateSalaryComponentDto]),
    __metadata("design:returntype", void 0)
], SalaryComponentsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف مكون' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SalaryComponentsController.prototype, "remove", null);
exports.SalaryComponentsController = SalaryComponentsController = __decorate([
    (0, swagger_1.ApiTags)('Salary Components'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('salary-components'),
    __metadata("design:paramtypes", [salary_components_service_1.SalaryComponentsService])
], SalaryComponentsController);
//# sourceMappingURL=salary-components.controller.js.map