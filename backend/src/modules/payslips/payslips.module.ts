import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PayslipLinesService } from './payslip-lines.service';
import { PayslipsController } from './payslips.controller';
import { PdfModule } from '../../common/pdf/pdf.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
    imports: [PrismaModule, PdfModule, PermissionsModule],
    controllers: [PayslipsController],
    providers: [PayslipLinesService],
    exports: [PayslipLinesService],
})
export class PayslipsModule { }
