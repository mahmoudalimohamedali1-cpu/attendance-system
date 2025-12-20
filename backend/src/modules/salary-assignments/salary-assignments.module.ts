import { Module } from '@nestjs/common';
import { SalaryAssignmentsService } from './salary-assignments.service';
import { SalaryAssignmentsController } from './salary-assignments.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [SalaryAssignmentsController],
    providers: [SalaryAssignmentsService],
    exports: [SalaryAssignmentsService],
})
export class SalaryAssignmentsModule { }
