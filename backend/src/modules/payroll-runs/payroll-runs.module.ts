import { Module } from '@nestjs/common';
import { PayrollRunsService } from './payroll-runs.service';
import { PayrollRunsController } from './payroll-runs.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PayrollCalculationModule } from '../payroll-calculation/payroll-calculation.module';
import { PayslipsModule } from '../payslips/payslips.module';
import { AdjustmentRunService } from './adjustment-run.service';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [
        PrismaModule,
        PayrollCalculationModule,
        PayslipsModule,
        AuditModule,
    ],
    controllers: [PayrollRunsController],
    providers: [PayrollRunsService, AdjustmentRunService],
    exports: [PayrollRunsService, AdjustmentRunService],
})
export class PayrollRunsModule { }
