import { Module } from '@nestjs/common';
import { AiManagerService } from './ai-manager.service';
import { AiManagerController } from './ai-manager.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [PrismaModule, AiModule],
    controllers: [AiManagerController],
    providers: [AiManagerService],
    exports: [AiManagerService],
})
export class AiManagerModule { }
