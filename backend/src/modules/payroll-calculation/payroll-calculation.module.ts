import { Module } from '@nestjs/common';
import { PayrollCalculationService } from './payroll-calculation.service';
import { PayrollCalculationController } from './payroll-calculation.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PoliciesModule } from '../policies/policies.module';
import { PayrollValidationService } from './payroll-validation.service';
import { WpsGeneratorService } from './wps-generator.service';

@Module({
    imports: [PrismaModule, PoliciesModule],
    controllers: [PayrollCalculationController],
    providers: [
        PayrollCalculationService,
        PayrollValidationService,
        WpsGeneratorService,
    ],
    exports: [
        PayrollCalculationService,
        PayrollValidationService,
        WpsGeneratorService,
    ],
})
export class PayrollCalculationModule { }
