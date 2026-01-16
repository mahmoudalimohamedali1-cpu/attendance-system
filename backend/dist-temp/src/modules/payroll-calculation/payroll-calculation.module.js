"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollCalculationModule = void 0;
const common_1 = require("@nestjs/common");
const payroll_calculation_service_1 = require("./payroll-calculation.service");
const payroll_calculation_controller_1 = require("./payroll-calculation.controller");
const prisma_module_1 = require("../../common/prisma/prisma.module");
const policies_module_1 = require("../policies/policies.module");
const payslips_module_1 = require("../payslips/payslips.module");
const eos_module_1 = require("../eos/eos.module");
const payroll_validation_service_1 = require("./payroll-validation.service");
const wps_generator_service_1 = require("./wps-generator.service");
const policy_rule_evaluator_service_1 = require("./services/policy-rule-evaluator.service");
const payroll_ledger_service_1 = require("./payroll-ledger.service");
const formula_engine_service_1 = require("./services/formula-engine.service");
const permissions_module_1 = require("../permissions/permissions.module");
const smart_policies_module_1 = require("../smart-policies/smart-policies.module");
let PayrollCalculationModule = class PayrollCalculationModule {
};
exports.PayrollCalculationModule = PayrollCalculationModule;
exports.PayrollCalculationModule = PayrollCalculationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            (0, common_1.forwardRef)(() => policies_module_1.PoliciesModule),
            payslips_module_1.PayslipsModule,
            eos_module_1.EosModule,
            permissions_module_1.PermissionsModule,
            smart_policies_module_1.SmartPoliciesModule,
        ],
        controllers: [payroll_calculation_controller_1.PayrollCalculationController],
        providers: [
            payroll_calculation_service_1.PayrollCalculationService,
            payroll_validation_service_1.PayrollValidationService,
            wps_generator_service_1.WpsGeneratorService,
            policy_rule_evaluator_service_1.PolicyRuleEvaluatorService,
            formula_engine_service_1.FormulaEngineService,
            payroll_ledger_service_1.PayrollLedgerService,
        ],
        exports: [
            payroll_calculation_service_1.PayrollCalculationService,
            payroll_validation_service_1.PayrollValidationService,
            wps_generator_service_1.WpsGeneratorService,
            policy_rule_evaluator_service_1.PolicyRuleEvaluatorService,
            formula_engine_service_1.FormulaEngineService,
            payroll_ledger_service_1.PayrollLedgerService,
        ],
    })
], PayrollCalculationModule);
//# sourceMappingURL=payroll-calculation.module.js.map