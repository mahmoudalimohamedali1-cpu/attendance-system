import { Module } from '@nestjs/common';
import { EosService } from './eos.service';
import { EosController } from './eos.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [EosController],
    providers: [EosService],
    exports: [EosService],
})
export class EosModule { }
