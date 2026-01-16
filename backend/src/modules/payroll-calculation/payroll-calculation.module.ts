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

// خدمات الرواتب المتقدمة
import { BonusService } from "./services/bonus.service";
import { CommissionService } from "./services/commission.service";
import { AllowanceService } from "./services/allowance.service";
import { TaxCalculatorService } from "./services/tax-calculator.service";
import { SalaryAdvanceService } from "./services/salary-advance.service";
import { PayrollRecalculationService } from "./services/payroll-recalculation.service";
import { PayrollReportsService } from "./services/payroll-reports.service";

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
        // الخدمات الأساسية
        PayrollCalculationService,
        PayrollValidationService,
        WpsGeneratorService,
        PolicyRuleEvaluatorService,
        FormulaEngineService,
        PayrollLedgerService,
        
        // الخدمات المتقدمة
        BonusService,                    // نظام المكافآت
        CommissionService,               // نظام العمولات
        AllowanceService,                // نظام البدلات
        TaxCalculatorService,            // حاسبة الضرائب
        SalaryAdvanceService,            // نظام السلف المتقدم
        PayrollRecalculationService,     // إعادة الحساب التلقائي
        PayrollReportsService,           // تقارير الرواتب
    ],
    exports: [
        // تصدير الخدمات الأساسية
        PayrollCalculationService,
        PayrollValidationService,
        WpsGeneratorService,
        PolicyRuleEvaluatorService,
        FormulaEngineService,
        PayrollLedgerService,
        
        // تصدير الخدمات المتقدمة
        BonusService,
        CommissionService,
        AllowanceService,
        TaxCalculatorService,
        SalaryAdvanceService,
        PayrollRecalculationService,
        PayrollReportsService,
    ],
})
export class PayrollCalculationModule {}
