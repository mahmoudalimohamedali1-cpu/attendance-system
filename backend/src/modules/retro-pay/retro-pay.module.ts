import { Module } from '@nestjs/common';
import { RetroPayService } from './retro-pay.service';
import { RetroPayController } from './retro-pay.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [RetroPayController],
    providers: [RetroPayService],
    exports: [RetroPayService],
})
export class RetroPayModule { }
