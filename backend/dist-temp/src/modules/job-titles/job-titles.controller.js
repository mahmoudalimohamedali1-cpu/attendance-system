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
exports.JobTitlesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const job_titles_service_1 = require("./job-titles.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let JobTitlesController = class JobTitlesController {
    constructor(jobTitlesService) {
        this.jobTitlesService = jobTitlesService;
    }
    async create(dto, companyId) {
        return this.jobTitlesService.create({ ...dto, companyId });
    }
    async findAll(companyId) {
        return this.jobTitlesService.findAll(companyId);
    }
    async findDirectManagers(companyId) {
        return this.jobTitlesService.findDirectManagers(companyId);
    }
    async findDirectManagerUsers(companyId) {
        return this.jobTitlesService.findDirectManagerUsers(companyId);
    }
    async findOne(id) {
        return this.jobTitlesService.findOne(id);
    }
    async update(id, dto, companyId) {
        return this.jobTitlesService.update(id, { ...dto, companyId });
    }
    async remove(id) {
        return this.jobTitlesService.remove(id);
    }
    async getPermissions(id) {
        return this.jobTitlesService.getJobTitlePermissions(id);
    }
    async addPermission(id, body) {
        return this.jobTitlesService.addJobTitlePermission(id, body.permissionId, body.scope);
    }
    async removePermission(id, permissionId) {
        return this.jobTitlesService.removeJobTitlePermission(id, permissionId);
    }
};
exports.JobTitlesController = JobTitlesController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'إنشاء درجة وظيفية جديدة' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'تم إنشاء الدرجة بنجاح' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], JobTitlesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'الحصول على كل الدرجات الوظيفية' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة الدرجات الوظيفية' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], JobTitlesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('direct-managers'),
    (0, swagger_1.ApiOperation)({ summary: 'الدرجات الوظيفية التي يمكن أن تكون مدير مباشر' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة درجات المديرين' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], JobTitlesController.prototype, "findDirectManagers", null);
__decorate([
    (0, common_1.Get)('direct-manager-users'),
    (0, swagger_1.ApiOperation)({ summary: 'المستخدمين الذين لديهم درجة مدير مباشر - لاستخدامها في dropdown' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة المديرين المباشرين' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], JobTitlesController.prototype, "findDirectManagerUsers", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'الحصول على درجة وظيفية بالـ ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تفاصيل الدرجة الوظيفية' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], JobTitlesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'تحديث درجة وظيفية' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم التحديث بنجاح' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], JobTitlesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف درجة وظيفية' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم الحذف بنجاح' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], JobTitlesController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':id/permissions'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'صلاحيات الدرجة الوظيفية' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة الصلاحيات' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], JobTitlesController.prototype, "getPermissions", null);
__decorate([
    (0, common_1.Post)(':id/permissions'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'إضافة صلاحية للدرجة الوظيفية' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'تم إضافة الصلاحية' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], JobTitlesController.prototype, "addPermission", null);
__decorate([
    (0, common_1.Delete)(':id/permissions/:permissionId'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف صلاحية من الدرجة الوظيفية' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم حذف الصلاحية' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('permissionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], JobTitlesController.prototype, "removePermission", null);
exports.JobTitlesController = JobTitlesController = __decorate([
    (0, swagger_1.ApiTags)('job-titles'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('job-titles'),
    __metadata("design:paramtypes", [job_titles_service_1.JobTitlesService])
], JobTitlesController);
//# sourceMappingURL=job-titles.controller.js.map