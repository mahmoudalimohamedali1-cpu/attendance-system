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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const users_service_1 = require("./users.service");
const create_user_dto_1 = require("./dto/create-user.dto");
const update_user_dto_1 = require("./dto/update-user.dto");
const user_query_dto_1 = require("./dto/user-query.dto");
const change_password_dto_1 = require("./dto/change-password.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let UsersController = class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
    }
    async getProfile(userId, companyId) {
        return this.usersService.getProfile(userId, companyId);
    }
    async updateProfile(userId, updateUserDto, companyId) {
        return this.usersService.updateProfile(userId, updateUserDto, companyId);
    }
    async changePassword(userId, changePasswordDto) {
        return this.usersService.changePassword(userId, changePasswordDto.oldPassword, changePasswordDto.newPassword);
    }
    async create(createUserDto, companyId) {
        return this.usersService.create(createUserDto, companyId);
    }
    async findAll(req, query, companyId) {
        return this.usersService.findAll(query, companyId, req.user.id, req.user.role);
    }
    async getMyTeam(managerId, companyId) {
        return this.usersService.getEmployeesByManager(managerId, companyId);
    }
    async findOne(id, companyId) {
        return this.usersService.findOne(id, companyId);
    }
    async update(id, updateUserDto, companyId) {
        return this.usersService.update(id, updateUserDto, companyId);
    }
    async remove(id, companyId) {
        return this.usersService.remove(id, companyId);
    }
    async activate(id) {
        return this.usersService.activate(id);
    }
    async resetFace(id, companyId) {
        return this.usersService.resetFace(id, companyId);
    }
};
exports.UsersController = UsersController;
__decorate([
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Patch)('me'),
    (0, swagger_1.ApiOperation)({ summary: 'تعديل بيانات المستخدم الحالي' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم التعديل بنجاح' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_user_dto_1.UpdateUserDto, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Post)('me/change-password'),
    (0, swagger_1.ApiOperation)({ summary: 'تغيير كلمة المرور' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم تغيير كلمة المرور بنجاح' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, change_password_dto_1.ChangePasswordDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "changePassword", null);
__decorate([
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_user_dto_1.CreateUserDto, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'قائمة المستخدمين (حسب صلاحياتك)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة المستخدمين' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, user_query_dto_1.UserQueryDto, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('my-team'),
    (0, roles_decorator_1.Roles)('MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'موظفي الفريق (للمدير)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'قائمة موظفي الفريق' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getMyTeam", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'بيانات مستخدم محدد' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'بيانات المستخدم' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'تعديل مستخدم' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم التعديل بنجاح' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_user_dto_1.UpdateUserDto, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف/تعطيل مستخدم' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم تعطيل المستخدم' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "remove", null);
__decorate([
    (0, common_1.Patch)(':id/activate'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'تفعيل مستخدم' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم تفعيل المستخدم' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "activate", null);
__decorate([
    (0, common_1.Post)(':id/reset-face'),
    (0, roles_decorator_1.Roles)('ADMIN', 'MANAGER'),
    (0, swagger_1.ApiOperation)({ summary: 'إعادة تعيين الوجه المسجل للموظف' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم إعادة تعيين الوجه بنجاح' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "resetFace", null);
exports.UsersController = UsersController = __decorate([
    (0, swagger_1.ApiTags)('users'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map