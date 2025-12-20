import { Module } from '@nestjs/common';
import { JobTitlesController } from './job-titles.controller';
import { JobTitlesService } from './job-titles.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [JobTitlesController],
    providers: [JobTitlesService],
    exports: [JobTitlesService],
})
export class JobTitlesModule { }
