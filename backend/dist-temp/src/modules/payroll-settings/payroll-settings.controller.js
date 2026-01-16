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
exports.PayrollSettingsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const payroll_settings_service_1 = require("./payroll-settings.service");
let PayrollSettingsController = class PayrollSettingsController {
    constructor(settingsService) {
        this.settingsService = settingsService;
    }
    async getSettings(companyId) {
        return this.settingsService.getSettings(companyId);
    }
    async updateSettings(companyId, data) {
        return this.settingsService.updateSettings(companyId, data);
    }
    async resetToDefaults(companyId) {
        return this.settingsService.resetToDefaults(companyId);
    }
};
exports.PayrollSettingsController = PayrollSettingsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PayrollSettingsController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Patch)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, payroll_settings_service_1.UpdatePayrollSettingsDto]),
    __metadata("design:returntype", Promise)
], PayrollSettingsController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.Post)('reset'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PayrollSettingsController.prototype, "resetToDefaults", null);
exports.PayrollSettingsController = PayrollSettingsController = __decorate([
    (0, common_1.Controller)('payroll-settings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [payroll_settings_service_1.PayrollSettingsService])
], PayrollSettingsController);
//# sourceMappingURL=payroll-settings.controller.js.map