import { Module, Global } from '@nestjs/common';
import { ExcelService } from './excel.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
    imports: [PrismaModule],
    providers: [ExcelService],
    exports: [ExcelService],
})
export class ExcelModule { }
