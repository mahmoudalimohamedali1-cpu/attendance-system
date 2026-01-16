"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollPeriodsModule = void 0;
const common_1 = require("@nestjs/common");
const payroll_periods_service_1 = require("./payroll-periods.service");
const payroll_periods_controller_1 = require("./payroll-periods.controller");
const prisma_module_1 = require("../../common/prisma/prisma.module");
let PayrollPeriodsModule = class PayrollPeriodsModule {
};
exports.PayrollPeriodsModule = PayrollPeriodsModule;
exports.PayrollPeriodsModule = PayrollPeriodsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [payroll_periods_controller_1.PayrollPeriodsController],
        providers: [payroll_periods_service_1.PayrollPeriodsService],
        exports: [payroll_periods_service_1.PayrollPeriodsService],
    })
], PayrollPeriodsModule);
//# sourceMappingURL=payroll-periods.module.js.map