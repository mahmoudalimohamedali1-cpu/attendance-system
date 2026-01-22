import { Module } from '@nestjs/common';
import { PayrollAdjustmentsController } from './payroll-adjustments.controller';
import { PayrollAdjustmentsService } from './payroll-adjustments.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [PayrollAdjustmentsController],
    providers: [PayrollAdjustmentsService],
    exports: [PayrollAdjustmentsService],
})
export class PayrollAdjustmentsModule { }
