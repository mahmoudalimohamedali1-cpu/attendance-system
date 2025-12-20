import { Module } from '@nestjs/common';
import { PayrollPeriodsService } from './payroll-periods.service';
import { PayrollPeriodsController } from './payroll-periods.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [PayrollPeriodsController],
    providers: [PayrollPeriodsService],
    exports: [PayrollPeriodsService],
})
export class PayrollPeriodsModule { }
