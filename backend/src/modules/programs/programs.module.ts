import { Module } from '@nestjs/common';
import { ProgramsController } from './programs.controller';
import { ProgramsService } from './programs.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [ProgramsController],
    providers: [ProgramsService],
    exports: [ProgramsService],
})
export class ProgramsModule {}
