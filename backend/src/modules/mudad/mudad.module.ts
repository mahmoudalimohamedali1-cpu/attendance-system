import { Module } from '@nestjs/common';
import { MudadController } from './mudad.controller';
import { MudadService } from './mudad.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [MudadController],
    providers: [MudadService],
    exports: [MudadService],
})
export class MudadModule { }
