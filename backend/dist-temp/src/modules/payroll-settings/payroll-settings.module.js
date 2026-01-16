"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollSettingsModule = void 0;
const common_1 = require("@nestjs/common");
const payroll_settings_controller_1 = require("./payroll-settings.controller");
const payroll_settings_service_1 = require("./payroll-settings.service");
const prisma_module_1 = require("../../common/prisma/prisma.module");
let PayrollSettingsModule = class PayrollSettingsModule {
};
exports.PayrollSettingsModule = PayrollSettingsModule;
exports.PayrollSettingsModule = PayrollSettingsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [payroll_settings_controller_1.PayrollSettingsController],
        providers: [payroll_settings_service_1.PayrollSettingsService],
        exports: [payroll_settings_service_1.PayrollSettingsService],
    })
], PayrollSettingsModule);
//# sourceMappingURL=payroll-settings.module.js.map