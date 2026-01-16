import { Module } from '@nestjs/common';
import { PayrollRunsService } from './payroll-runs.service';
import { PayrollRunsController } from './payroll-runs.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PayrollCalculationModule } from '../payroll-calculation/payroll-calculation.module';
import { PayslipsModule } from '../payslips/payslips.module';
import { AdjustmentRunService } from './adjustment-run.service';
import { PayrollValidationService } from './payroll-validation.service';
import { AuditModule } from '../audit/audit.module';
import { EmployeeDebtModule } from '../employee-debt/employee-debt.module';
import { GosiModule } from '../gosi/gosi.module';

@Module({
    imports: [
        PrismaModule,
        PayrollCalculationModule,
        PayslipsModule,
        AuditModule,
        EmployeeDebtModule,
        GosiModule,
    ],
    controllers: [PayrollRunsController],
    providers: [PayrollRunsService, AdjustmentRunService, PayrollValidationService],
    exports: [PayrollRunsService, AdjustmentRunService, PayrollValidationService],
})
export class PayrollRunsModule { }
