import { Module } from '@nestjs/common';
import { PayrollCalculationService } from './payroll-calculation.service';
import { PayrollCalculationController } from './payroll-calculation.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PoliciesModule } from '../policies/policies.module';
import { PayslipsModule } from '../payslips/payslips.module';
import { PayrollValidationService } from './payroll-validation.service';
import { WpsGeneratorService } from './wps-generator.service';
import { PolicyRuleEvaluatorService } from './services/policy-rule-evaluator.service';
import { FormulaEngineService } from './services/formula-engine.service';

@Module({
    imports: [PrismaModule, PoliciesModule, PayslipsModule],
    controllers: [PayrollCalculationController],
    providers: [
        PayrollCalculationService,
        PayrollValidationService,
        WpsGeneratorService,
        PolicyRuleEvaluatorService,
        FormulaEngineService,
    ],
    exports: [
        PayrollCalculationService,
        PayrollValidationService,
        WpsGeneratorService,
        PolicyRuleEvaluatorService,
        FormulaEngineService,
    ],
})
export class PayrollCalculationModule { }

