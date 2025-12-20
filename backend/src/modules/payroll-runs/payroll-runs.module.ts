import { Module } from '@nestjs/common';
import { PayrollRunsService } from './payroll-runs.service';
import { PayrollRunsController } from './payroll-runs.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PayrollCalculationModule } from '../payroll-calculation/payroll-calculation.module';

@Module({
    imports: [
        PrismaModule,
        PayrollCalculationModule,
    ],
    controllers: [PayrollRunsController],
    providers: [PayrollRunsService],
    exports: [PayrollRunsService],
})
export class PayrollRunsModule { }
