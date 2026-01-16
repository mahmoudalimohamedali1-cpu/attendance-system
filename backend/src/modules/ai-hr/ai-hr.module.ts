import { Module } from '@nestjs/common';
import { AiHrService } from './ai-hr.service';
import { AiHrController } from './ai-hr.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [PrismaModule, AiModule],
    controllers: [AiHrController],
    providers: [AiHrService],
    exports: [AiHrService],
})
export class AiHrModule { }
