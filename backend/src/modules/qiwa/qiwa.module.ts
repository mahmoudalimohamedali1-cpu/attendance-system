import { Module } from '@nestjs/common';
import { QiwaController } from './qiwa.controller';
import { QiwaService } from './qiwa.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [QiwaController],
    providers: [QiwaService],
    exports: [QiwaService],
})
export class QiwaModule { }
