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
exports.PermissionsController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const permissions_service_1 = require("./permissions.service");
const permissions_dto_1 = require("./dto/permissions.dto");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let PermissionsController = class PermissionsController {
    constructor(permissionsService, prisma) {
        this.permissionsService = permissionsService;
        this.prisma = prisma;
    }
    async getAllPermissions() {
        return this.permissionsService.getAllPermissions();
    }
    async getPermissionsByCategory() {
        return this.permissionsService.getPermissionsByCategory();
    }
    async getMyPermissions(companyId, req) {
        return this.permissionsService.getUserPermissions(req.user.id, companyId);
    }
    async getUserPermissions(userId, companyId) {
        return this.permissionsService.getUserPermissions(userId, companyId);
    }
    async addUserPermission(userId, companyId, dto, req) {
        return this.permissionsService.addUserPermission(userId, companyId, dto.permissionCode, dto.scope, {
            branchId: dto.branchId,
            departmentId: dto.departmentId,
            employeeIds: dto.employeeIds,
        }, req.user.id);
    }
    async removeUserPermission(userId, userPermissionId, req) {
        return this.permissionsService.removeUserPermission(userPermissionId, req.user.id);
    }
    async getAuditLog(companyId) {
        return this.prisma.permissionAuditLog.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }
    async updateUserPermissionsBulk(userId, companyId, dto) {
        return this.permissionsService.updateUserPermissionsBulk(userId, companyId, dto.permissions);
    }
    async updatePermissionEmployees(userId, userPermissionId, dto) {
        return this.permissionsService.updatePermissionEmployees(userPermissionId, dto.employeeIds);
    }
    async updateManager(userId, dto) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { managerId: dto.managerId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                managerId: true,
                manager: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
    }
    async getSubordinates(userId, companyId) {
        return this.prisma.user.findMany({
            where: { managerId: userId, companyId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                jobTitle: true,
                department: { select: { name: true } },
                branch: { select: { name: true } },
            },
        });
    }
    async getOrgTree(userId, companyId) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                jobTitle: true,
                manager: {
                    select: { id: true, firstName: true, lastName: true, jobTitle: true },
                },
                employees: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        jobTitle: true,
                        employees: {
                            select: { id: true, firstName: true, lastName: true, jobTitle: true },
                        },
                    },
                },
            },
        });
        return user;
    }
    async checkPermission(userId, companyId, permissionCode, employeeId) {
        return this.permissionsService.canAccessEmployee(userId, companyId, permissionCode, employeeId);
    }
    async getAccessibleEmployees(userId, companyId, permissionCode) {
        return this.permissionsService.getAccessibleEmployeeIds(userId, companyId, permissionCode);
    }
};
exports.PermissionsController = PermissionsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'قائمة كل الصلاحيات المتاحة' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة الصلاحيات' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PermissionsController.prototype, "getAllPermissions", null);
__decorate([
    (0, common_1.Get)('categories'),
    (0, swagger_1.ApiOperation)({ summary: 'الصلاحيات مجمّعة بالتصنيف' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'الصلاحيات مجمّعة' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PermissionsController.prototype, "getPermissionsByCategory", null);
__decorate([
    (0, common_1.Get)('my'),
    (0, swagger_1.ApiOperation)({ summary: 'صلاحياتي الحالية' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'صلاحيات المستخدم الحالي' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PermissionsController.prototype, "getMyPermissions", null);
__decorate([
    (0, common_1.Get)('users/:userId'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'صلاحيات مستخدم معين' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'صلاحيات المستخدم' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PermissionsController.prototype, "getUserPermissions", null);
__decorate([
    (0, common_1.Post)('users/:userId'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'إضافة صلاحية لمستخدم' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'تمت الإضافة' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, permissions_dto_1.AddUserPermissionDto, Object]),
    __metadata("design:returntype", Promise)
], PermissionsController.prototype, "addUserPermission", null);
__decorate([
    (0, common_1.Delete)('users/:userId/:userPermissionId'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف صلاحية من مستخدم' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم الحذف' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Param)('userPermissionId')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PermissionsController.prototype, "removeUserPermission", null);
__decorate([
    (0, common_1.Get)('audit'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'سجل تدقيق الصلاحيات' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'سجل التدقيق' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PermissionsController.prototype, "getAuditLog", null);
__decorate([
    (0, common_1.Put)('users/:userId/bulk'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'تحديث كل صلاحيات مستخدم' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم التحديث' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, permissions_dto_1.BulkUpdatePermissionsDto]),
    __metadata("design:returntype", Promise)
], PermissionsController.prototype, "updateUserPermissionsBulk", null);
__decorate([
    (0, common_1.Put)('users/:userId/permissions/:userPermissionId/employees'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'تحديث الموظفين المعينين لصلاحية' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم التحديث' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Param)('userPermissionId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, permissions_dto_1.UpdatePermissionEmployeesDto]),
    __metadata("design:returntype", Promise)
], PermissionsController.prototype, "updatePermissionEmployees", null);
__decorate([
    (0, common_1.Put)('users/:userId/manager'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'تعيين المدير المباشر لموظف' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم التعيين' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, permissions_dto_1.UpdateManagerDto]),
    __metadata("design:returntype", Promise)
], PermissionsController.prototype, "updateManager", null);
__decorate([
    (0, common_1.Get)('users/:userId/subordinates'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'المرؤوسين المباشرين لموظف' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة المرؤوسين' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PermissionsController.prototype, "getSubordinates", null);
__decorate([
    (0, common_1.Get)('users/:userId/org-tree'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'الشجرة الإدارية لموظف' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'الشجرة الإدارية' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PermissionsController.prototype, "getOrgTree", null);
__decorate([
    (0, common_1.Get)('check/:permissionCode/:employeeId'),
    (0, swagger_1.ApiOperation)({ summary: 'التحقق من صلاحية على موظف معين' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'نتيجة التحقق' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, common_1.Param)('permissionCode')),
    __param(3, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], PermissionsController.prototype, "checkPermission", null);
__decorate([
    (0, common_1.Get)('accessible-employees/:permissionCode'),
    (0, swagger_1.ApiOperation)({ summary: 'الموظفين الذين يمكنني الوصول إليهم بصلاحية معينة' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة معرفات الموظفين' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, common_1.Param)('permissionCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], PermissionsController.prototype, "getAccessibleEmployees", null);
exports.PermissionsController = PermissionsController = __decorate([
    (0, swagger_1.ApiTags)('Permissions - الصلاحيات'),
    (0, common_1.Controller)('permissions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [permissions_service_1.PermissionsService,
        prisma_service_1.PrismaService])
], PermissionsController);
//# sourceMappingURL=permissions.controller.js.map