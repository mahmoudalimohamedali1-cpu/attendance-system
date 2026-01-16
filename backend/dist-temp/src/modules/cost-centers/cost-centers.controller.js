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
exports.CostCentersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const cost_centers_service_1 = require("./cost-centers.service");
const cost_center_dto_1 = require("./dto/cost-center.dto");
let CostCentersController = class CostCentersController {
    constructor(costCentersService) {
        this.costCentersService = costCentersService;
    }
    create(dto, req) {
        return this.costCentersService.create(dto, req.user.companyId);
    }
    findAll(req, status, type, search) {
        return this.costCentersService.findAll(req.user.companyId, { status, type, search });
    }
    findTree(req) {
        return this.costCentersService.findTree(req.user.companyId);
    }
    findOne(id, req) {
        return this.costCentersService.findOne(id, req.user.companyId);
    }
    update(id, dto, req) {
        return this.costCentersService.update(id, dto, req.user.companyId);
    }
    archive(id, req) {
        return this.costCentersService.archive(id, req.user.companyId);
    }
    createAllocation(costCenterId, dto, req) {
        return this.costCentersService.createAllocation({ ...dto, costCenterId }, req.user.companyId);
    }
    findAllocations(id, req) {
        return this.costCentersService.findAllocations(id, req.user.companyId);
    }
    findUserAllocations(userId, req) {
        return this.costCentersService.findUserAllocations(userId, req.user.companyId);
    }
    deactivateAllocation(allocationId, req) {
        return this.costCentersService.deactivateAllocation(allocationId, req.user.companyId);
    }
    createBudget(costCenterId, dto, req) {
        return this.costCentersService.createBudget({ ...dto, costCenterId }, req.user.companyId);
    }
    findBudgets(id, year) {
        return this.costCentersService.findBudgets(id, year ? parseInt(year) : undefined);
    }
    getAnalytics(id, req) {
        return this.costCentersService.getAnalytics(id, req.user.companyId);
    }
    getEmployees(id, req) {
        return this.costCentersService.getEmployeesByCostCenter(id, req.user.companyId);
    }
};
exports.CostCentersController = CostCentersController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'إنشاء مركز تكلفة جديد' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [cost_center_dto_1.CreateCostCenterDto, Object]),
    __metadata("design:returntype", void 0)
], CostCentersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'قائمة مراكز التكلفة' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, description: 'فلتر الحالة' }),
    (0, swagger_1.ApiQuery)({ name: 'type', required: false, description: 'فلتر النوع' }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false, description: 'بحث' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('type')),
    __param(3, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], CostCentersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('tree'),
    (0, swagger_1.ApiOperation)({ summary: 'الهيكل الهرمي لمراكز التكلفة' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CostCentersController.prototype, "findTree", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'تفاصيل مركز تكلفة' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CostCentersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'تحديث مركز تكلفة' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, cost_center_dto_1.UpdateCostCenterDto, Object]),
    __metadata("design:returntype", void 0)
], CostCentersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'أرشفة مركز تكلفة' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CostCentersController.prototype, "archive", null);
__decorate([
    (0, common_1.Post)(':id/allocations'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'إضافة توزيع موظف على مركز تكلفة' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, cost_center_dto_1.CreateAllocationDto, Object]),
    __metadata("design:returntype", void 0)
], CostCentersController.prototype, "createAllocation", null);
__decorate([
    (0, common_1.Get)(':id/allocations'),
    (0, swagger_1.ApiOperation)({ summary: 'توزيعات مركز التكلفة' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CostCentersController.prototype, "findAllocations", null);
__decorate([
    (0, common_1.Get)('user/:userId/allocations'),
    (0, swagger_1.ApiOperation)({ summary: 'توزيعات موظف معين' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CostCentersController.prototype, "findUserAllocations", null);
__decorate([
    (0, common_1.Delete)('allocations/:allocationId'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'إلغاء توزيع' }),
    __param(0, (0, common_1.Param)('allocationId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CostCentersController.prototype, "deactivateAllocation", null);
__decorate([
    (0, common_1.Post)(':id/budgets'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'إضافة ميزانية لمركز تكلفة' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, cost_center_dto_1.CreateBudgetDto, Object]),
    __metadata("design:returntype", void 0)
], CostCentersController.prototype, "createBudget", null);
__decorate([
    (0, common_1.Get)(':id/budgets'),
    (0, swagger_1.ApiOperation)({ summary: 'ميزانيات مركز التكلفة' }),
    (0, swagger_1.ApiQuery)({ name: 'year', required: false, description: 'السنة' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CostCentersController.prototype, "findBudgets", null);
__decorate([
    (0, common_1.Get)(':id/analytics'),
    (0, swagger_1.ApiOperation)({ summary: 'تحليلات مركز التكلفة' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CostCentersController.prototype, "getAnalytics", null);
__decorate([
    (0, common_1.Get)(':id/employees'),
    (0, swagger_1.ApiOperation)({ summary: 'موظفي مركز التكلفة' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CostCentersController.prototype, "getEmployees", null);
exports.CostCentersController = CostCentersController = __decorate([
    (0, swagger_1.ApiTags)('Cost Centers - مراكز التكلفة'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('cost-centers'),
    __metadata("design:paramtypes", [cost_centers_service_1.CostCentersService])
], CostCentersController);
//# sourceMappingURL=cost-centers.controller.js.map