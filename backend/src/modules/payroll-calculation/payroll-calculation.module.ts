import { Module, forwardRef } from "@nestjs/common";
import { PayrollCalculationService } from "./payroll-calculation.service";
import { PayrollCalculationController } from "./payroll-calculation.controller";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { PoliciesModule } from "../policies/policies.module";
import { PayslipsModule } from "../payslips/payslips.module";
import { EosModule } from "../eos/eos.module";
import { PayrollValidationService } from "./payroll-validation.service";
import { WpsGeneratorService } from "./wps-generator.service";
import { PolicyRuleEvaluatorService } from "./services/policy-rule-evaluator.service";
import { PayrollLedgerService } from "./payroll-ledger.service";
import { FormulaEngineService } from "./services/formula-engine.service";
import { PermissionsModule } from "../permissions/permissions.module";
import { SmartPoliciesModule } from "../smart-policies/smart-policies.module";

@Module({
    imports: [
        PrismaModule,
        forwardRef(() => PoliciesModule),
        PayslipsModule,
        EosModule,
        PermissionsModule,
        SmartPoliciesModule,
    ],
    controllers: [PayrollCalculationController],
    providers: [
        PayrollCalculationService,
        PayrollValidationService,
        WpsGeneratorService,
        PolicyRuleEvaluatorService,
        FormulaEngineService,
        PayrollLedgerService,
    ],
    exports: [
        PayrollCalculationService,
        PayrollValidationService,
        WpsGeneratorService,
        PolicyRuleEvaluatorService,
        FormulaEngineService,
        PayrollLedgerService,
    ],
})
export class PayrollCalculationModule {}
