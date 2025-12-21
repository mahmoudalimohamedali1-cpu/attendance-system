import { Module } from '@nestjs/common';
import { PayrollCalculationService } from './payroll-calculation.service';
import { PayrollCalculationController } from './payroll-calculation.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PoliciesModule } from '../policies/policies.module';
import { PayrollValidationService } from './payroll-validation.service';
import { WpsGeneratorService } from './wps-generator.service';
import { PolicyRuleEvaluatorService } from './services/policy-rule-evaluator.service';

@Module({
    imports: [PrismaModule, PoliciesModule],
    controllers: [PayrollCalculationController],
    providers: [
        PayrollCalculationService,
        PayrollValidationService,
        WpsGeneratorService,
        PolicyRuleEvaluatorService,
    ],
    exports: [
        PayrollCalculationService,
        PayrollValidationService,
        WpsGeneratorService,
        PolicyRuleEvaluatorService,
    ],
})
export class PayrollCalculationModule { }
