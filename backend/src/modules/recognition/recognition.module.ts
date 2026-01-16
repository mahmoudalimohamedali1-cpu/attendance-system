import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { RecognitionController } from './recognition.controller';
import { RecognitionService } from './recognition.service';

@Module({
    imports: [PrismaModule],
    controllers: [RecognitionController],
    providers: [RecognitionService],
    exports: [RecognitionService],
})
export class RecognitionModule { }
