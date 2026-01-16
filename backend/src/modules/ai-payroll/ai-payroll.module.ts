import { Module } from '@nestjs/common';
import { AiPayrollService } from './ai-payroll.service';
import { AiPayrollController } from './ai-payroll.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [PrismaModule, AiModule],
    controllers: [AiPayrollController],
    providers: [AiPayrollService],
    exports: [AiPayrollService],
})
export class AiPayrollModule { }
