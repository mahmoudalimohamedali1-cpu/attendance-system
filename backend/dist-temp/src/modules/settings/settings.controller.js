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
exports.SettingsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const settings_service_1 = require("./settings.service");
const leave_reset_service_1 = require("./leave-reset.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let SettingsController = class SettingsController {
    constructor(settingsService, leaveResetService) {
        this.settingsService = settingsService;
        this.leaveResetService = leaveResetService;
    }
    async getAllSettings(companyId) {
        return this.settingsService.getAllSettings(companyId);
    }
    async getHolidays(companyId, year) {
        return this.settingsService.getHolidays(companyId, year);
    }
    async createHoliday(body, companyId) {
        return this.settingsService.createHoliday({
            ...body,
            date: new Date(body.date),
        }, companyId);
    }
    async updateHoliday(id, companyId, body) {
        const updateData = {};
        if (body.name !== undefined) {
            updateData.name = body.name;
        }
        if (body.nameEn !== undefined) {
            updateData.nameEn = body.nameEn;
        }
        if (body.date !== undefined) {
            updateData.date = new Date(body.date);
        }
        if (body.isRecurring !== undefined) {
            updateData.isRecurring = body.isRecurring;
        }
        return this.settingsService.updateHoliday(id, companyId, updateData);
    }
    async deleteHoliday(id, companyId) {
        return this.settingsService.deleteHoliday(id, companyId);
    }
    async getSetting(key, companyId) {
        return this.settingsService.getSetting(key, companyId);
    }
    async setSetting(body, companyId) {
        return this.settingsService.setSetting(body.key, body.value, companyId, body.description);
    }
    async setMultipleSettings(body, companyId) {
        return this.settingsService.setMultipleSettings(body.settings, companyId);
    }
    async deleteSetting(key, companyId) {
        return this.settingsService.deleteSetting(key, companyId);
    }
    async getLeaveCarryoverPolicy(companyId) {
        const disabled = await this.settingsService.isLeaveCarryoverDisabled(companyId);
        return {
            disableLeaveCarryover: disabled,
            description: disabled
                ? 'الشركة لا ترحل الإجازات - يتم إعادة ضبط الرصيد في بداية كل سنة'
                : 'الشركة ترحل الإجازات - الأيام المتبقية تنتقل للسنة الجديدة',
        };
    }
    async setLeaveCarryoverPolicy(body, companyId) {
        await this.settingsService.setSetting('disableLeaveCarryover', body.disableCarryover.toString(), companyId, 'سياسة ترحيل الإجازات - true = لا ترحيل (إعادة ضبط سنوية)');
        return {
            success: true,
            disableLeaveCarryover: body.disableCarryover,
            message: body.disableCarryover
                ? 'تم تفعيل سياسة عدم ترحيل الإجازات - سيتم إعادة ضبط الرصيد في 1 يناير'
                : 'تم تفعيل سياسة ترحيل الإجازات - الأيام المتبقية ستنتقل للسنة الجديدة',
        };
    }
    async resetLeaveBalances(companyId) {
        return this.leaveResetService.manualResetLeaveBalances();
    }
    async getLeaveStatistics(companyId) {
        return this.leaveResetService.getLeaveStatistics(companyId);
    }
};
exports.SettingsController = SettingsController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'جميع الإعدادات' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'الإعدادات' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "getAllSettings", null);
__decorate([
    (0, common_1.Get)('holidays/all'),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'),
    (0, swagger_1.ApiOperation)({ summary: 'قائمة العطلات' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'العطلات' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(1, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "getHolidays", null);
__decorate([
    (0, common_1.Post)('holidays'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'إضافة عطلة' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'تمت الإضافة' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "createHoliday", null);
__decorate([
    (0, common_1.Patch)('holidays/:id'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'تعديل عطلة' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم التعديل' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "updateHoliday", null);
__decorate([
    (0, common_1.Delete)('holidays/:id'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف عطلة' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم الحذف' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "deleteHoliday", null);
__decorate([
    (0, common_1.Get)('key/:key'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'الحصول على إعداد محدد' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'الإعداد' }),
    __param(0, (0, common_1.Param)('key')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "getSetting", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'تعيين إعداد' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'تم تعيين الإعداد' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "setSetting", null);
__decorate([
    (0, common_1.Post)('bulk'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'تعيين إعدادات متعددة' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'تم تعيين الإعدادات' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "setMultipleSettings", null);
__decorate([
    (0, common_1.Delete)('key/:key'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف إعداد' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم الحذف' }),
    __param(0, (0, common_1.Param)('key')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "deleteSetting", null);
__decorate([
    (0, common_1.Get)('leave-policy/carryover'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'الحصول على سياسة ترحيل الإجازات' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'سياسة ترحيل الإجازات' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "getLeaveCarryoverPolicy", null);
__decorate([
    (0, common_1.Post)('leave-policy/carryover'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'تعيين سياسة ترحيل الإجازات' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم تعيين السياسة' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "setLeaveCarryoverPolicy", null);
__decorate([
    (0, common_1.Post)('leave-policy/reset-balances'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'إعادة ضبط رصيد الإجازات يدوياً' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'تم إعادة ضبط الرصيد' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "resetLeaveBalances", null);
__decorate([
    (0, common_1.Get)('leave-policy/statistics'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'إحصائيات الإجازات' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'الإحصائيات' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "getLeaveStatistics", null);
exports.SettingsController = SettingsController = __decorate([
    (0, swagger_1.ApiTags)('settings'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('settings'),
    __metadata("design:paramtypes", [settings_service_1.SettingsService,
        leave_reset_service_1.LeaveResetService])
], SettingsController);
//# sourceMappingURL=settings.controller.js.map