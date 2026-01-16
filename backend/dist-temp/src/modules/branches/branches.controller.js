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
exports.BranchesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const branches_service_1 = require("./branches.service");
const create_branch_dto_1 = require("./dto/create-branch.dto");
const update_branch_dto_1 = require("./dto/update-branch.dto");
const create_department_dto_1 = require("./dto/create-department.dto");
const update_schedule_dto_1 = require("./dto/update-schedule.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let BranchesController = class BranchesController {
    constructor(branchesService) {
        this.branchesService = branchesService;
    }
    async createBranch(createBranchDto, companyId) {
        return this.branchesService.createBranch(createBranchDto, companyId);
    }
    async findAllBranches(companyId) {
        return this.branchesService.findAllBranches(companyId);
    }
    async findBranchById(id) {
        return this.branchesService.findBranchById(id);
    }
    async updateBranch(id, updateBranchDto, companyId) {
        return this.branchesService.updateBranch(id, updateBranchDto, companyId);
    }
    async deleteBranch(id) {
        return this.branchesService.deleteBranch(id);
    }
    async toggleBranchStatus(id, companyId) {
        return this.branchesService.toggleBranchStatus(id, companyId);
    }
    async getBranchSchedule(id, companyId) {
        return this.branchesService.getBranchSchedule(id, companyId);
    }
    async updateBranchSchedule(id, updateScheduleDto) {
        return this.branchesService.updateBranchSchedule(id, updateScheduleDto.schedules);
    }
    async createDepartment(createDepartmentDto, companyId) {
        return this.branchesService.createDepartment(createDepartmentDto, companyId);
    }
    async findAllDepartments(companyId, branchId) {
        return this.branchesService.findAllDepartments(companyId, branchId);
    }
    async updateDepartment(id, updateData) {
        return this.branchesService.updateDepartment(id, updateData);
    }
    async deleteDepartment(id) {
        return this.branchesService.deleteDepartment(id);
    }
};
exports.BranchesController = BranchesController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'إنشاء فرع جديد' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'تم إنشاء الفرع بنجاح' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_branch_dto_1.CreateBranchDto, String]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "createBranch", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'قائمة الفروع' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة الفروع' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "findAllBranches", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'بيانات فرع محدد' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'بيانات الفرع' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "findBranchById", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'تعديل فرع' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم التعديل بنجاح' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_branch_dto_1.UpdateBranchDto, String]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "updateBranch", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف فرع' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم الحذف بنجاح' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "deleteBranch", null);
__decorate([
    (0, common_1.Patch)(':id/toggle-status'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'تفعيل/تعطيل فرع' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم تغيير الحالة' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "toggleBranchStatus", null);
__decorate([
    (0, common_1.Get)(':id/schedule'),
    (0, swagger_1.ApiOperation)({ summary: 'جدول عمل الفرع' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'جدول العمل' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "getBranchSchedule", null);
__decorate([
    (0, common_1.Patch)(':id/schedule'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'تعديل جدول عمل الفرع' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم تعديل الجدول' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_schedule_dto_1.UpdateScheduleDto]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "updateBranchSchedule", null);
__decorate([
    (0, common_1.Post)('departments'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'إنشاء قسم جديد' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'تم إنشاء القسم بنجاح' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_department_dto_1.CreateDepartmentDto, String]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "createDepartment", null);
__decorate([
    (0, common_1.Get)('departments/all'),
    (0, swagger_1.ApiOperation)({ summary: 'قائمة الأقسام' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة الأقسام' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(1, (0, common_1.Query)('branchId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "findAllDepartments", null);
__decorate([
    (0, common_1.Patch)('departments/:id'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'تعديل قسم' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم التعديل بنجاح' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "updateDepartment", null);
__decorate([
    (0, common_1.Delete)('departments/:id'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف قسم' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم الحذف بنجاح' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "deleteDepartment", null);
exports.BranchesController = BranchesController = __decorate([
    (0, swagger_1.ApiTags)('branches'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('branches'),
    __metadata("design:paramtypes", [branches_service_1.BranchesService])
], BranchesController);
//# sourceMappingURL=branches.controller.js.map