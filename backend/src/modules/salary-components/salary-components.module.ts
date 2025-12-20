import { Module } from '@nestjs/common';
import { SalaryComponentsService } from './salary-components.service';
import { SalaryComponentsController } from './salary-components.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [SalaryComponentsController],
    providers: [SalaryComponentsService],
    exports: [SalaryComponentsService],
})
export class SalaryComponentsModule { }
