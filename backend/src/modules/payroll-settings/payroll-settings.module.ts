import { Module } from '@nestjs/common';
import { PayrollSettingsController } from './payroll-settings.controller';
import { PayrollSettingsService } from './payroll-settings.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [PayrollSettingsController],
    providers: [PayrollSettingsService],
    exports: [PayrollSettingsService],
})
export class PayrollSettingsModule { }
