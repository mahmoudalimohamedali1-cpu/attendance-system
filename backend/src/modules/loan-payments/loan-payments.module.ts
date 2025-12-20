import { Module } from '@nestjs/common';
import { LoanPaymentsService } from './loan-payments.service';
import { LoanPaymentsController } from './loan-payments.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [LoanPaymentsController],
    providers: [LoanPaymentsService],
    exports: [LoanPaymentsService],
})
export class LoanPaymentsModule { }
