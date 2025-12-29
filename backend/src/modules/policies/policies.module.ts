import { Module } from '@nestjs/common';
import { PoliciesService } from './policies.service';
import { PoliciesController } from './policies.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { PayrollCalculationModule } from '../payroll-calculation/payroll-calculation.module';

@Module({
    imports: [PrismaModule, AuditModule, PayrollCalculationModule],
    controllers: [PoliciesController],
    providers: [PoliciesService],
    exports: [PoliciesService],
})
export class PoliciesModule { }
