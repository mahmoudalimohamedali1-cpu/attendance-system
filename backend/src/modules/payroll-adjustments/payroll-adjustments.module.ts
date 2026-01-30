import { Module } from '@nestjs/common';
import { PayrollAdjustmentsController } from './payroll-adjustments.controller';
import { PayrollAdjustmentsService } from './payroll-adjustments.service';
import { DeductionApprovalService } from './deduction-approval.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [PayrollAdjustmentsController],
    providers: [PayrollAdjustmentsService, DeductionApprovalService],
    exports: [PayrollAdjustmentsService, DeductionApprovalService],
})
export class PayrollAdjustmentsModule { }
