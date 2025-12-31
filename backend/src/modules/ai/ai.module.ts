import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { PolicyParserService } from './services/policy-parser.service';

@Module({
    providers: [AiService, PolicyParserService],
    controllers: [AiController],
    exports: [AiService, PolicyParserService],
})
export class AiModule { }
