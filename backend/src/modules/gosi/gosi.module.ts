import { Module } from '@nestjs/common';
import { GosiService } from './gosi.service';
import { GosiController } from './gosi.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PayslipsModule } from '../payslips/payslips.module';
import { GosiCalculationService } from './gosi-calculation.service';
import { GosiValidationService } from './gosi-validation.service';

@Module({
    imports: [PrismaModule, PayslipsModule],
    controllers: [GosiController],
    providers: [GosiService, GosiCalculationService, GosiValidationService],
    exports: [GosiService, GosiCalculationService, GosiValidationService],
})
export class GosiModule { }
