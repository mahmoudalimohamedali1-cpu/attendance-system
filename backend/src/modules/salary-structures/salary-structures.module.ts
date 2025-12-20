import { Module } from '@nestjs/common';
import { SalaryStructuresService } from './salary-structures.service';
import { SalaryStructuresController } from './salary-structures.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [SalaryStructuresController],
    providers: [SalaryStructuresService],
    exports: [SalaryStructuresService],
})
export class SalaryStructuresModule { }
