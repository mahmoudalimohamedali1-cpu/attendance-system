import { Module } from '@nestjs/common';
import { MuqeemService } from './muqeem.service';
import { MuqeemController } from './muqeem.controller';

@Module({
    controllers: [MuqeemController],
    providers: [MuqeemService],
    exports: [MuqeemService],
})
export class MuqeemModule { }
