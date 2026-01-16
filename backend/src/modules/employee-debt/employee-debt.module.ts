/**
 * Employee Debt Module
 *
 * وحدة إدارة ديون الموظفين
 */

import { Module } from '@nestjs/common';
import { EmployeeDebtController } from './employee-debt.controller';
import { EmployeeDebtService } from './employee-debt.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [EmployeeDebtController],
    providers: [EmployeeDebtService],
    exports: [EmployeeDebtService],
})
export class EmployeeDebtModule {}
