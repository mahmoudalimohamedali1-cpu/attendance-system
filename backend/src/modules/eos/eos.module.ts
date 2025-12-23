import { Module } from '@nestjs/common';
import { EosService } from './eos.service';
import { EosController } from './eos.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { LeavesModule } from '../leaves/leaves.module';

@Module({
    imports: [PrismaModule, LeavesModule],
    controllers: [EosController],
    providers: [EosService],
    exports: [EosService],
})
export class EosModule { }
