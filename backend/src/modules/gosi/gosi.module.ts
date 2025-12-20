import { Module } from '@nestjs/common';
import { GosiService } from './gosi.service';
import { GosiController } from './gosi.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [GosiController],
    providers: [GosiService],
    exports: [GosiService],
})
export class GosiModule { }
