"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollRunsModule = void 0;
const common_1 = require("@nestjs/common");
const payroll_runs_service_1 = require("./payroll-runs.service");
const payroll_runs_controller_1 = require("./payroll-runs.controller");
const prisma_module_1 = require("../../common/prisma/prisma.module");
const payroll_calculation_module_1 = require("../payroll-calculation/payroll-calculation.module");
const payslips_module_1 = require("../payslips/payslips.module");
const adjustment_run_service_1 = require("./adjustment-run.service");
const audit_module_1 = require("../audit/audit.module");
let PayrollRunsModule = class PayrollRunsModule {
};
exports.PayrollRunsModule = PayrollRunsModule;
exports.PayrollRunsModule = PayrollRunsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            payroll_calculation_module_1.PayrollCalculationModule,
            payslips_module_1.PayslipsModule,
            audit_module_1.AuditModule,
        ],
        controllers: [payroll_runs_controller_1.PayrollRunsController],
        providers: [payroll_runs_service_1.PayrollRunsService, adjustment_run_service_1.AdjustmentRunService],
        exports: [payroll_runs_service_1.PayrollRunsService, adjustment_run_service_1.AdjustmentRunService],
    })
], PayrollRunsModule);
//# sourceMappingURL=payroll-runs.module.js.map