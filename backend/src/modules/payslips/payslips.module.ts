import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PayslipLinesService } from './payslip-lines.service';

@Module({
    imports: [PrismaModule],
    providers: [PayslipLinesService],
    exports: [PayslipLinesService],
})
export class PayslipsModule { }
