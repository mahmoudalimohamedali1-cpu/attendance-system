import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { PolicyParserService } from './services/policy-parser.service';
import { SchemaIntrospectorService } from './services/schema-introspector.service';
import { PolicyFeasibilityService } from './services/policy-feasibility.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [
        AiService,
        PolicyParserService,
        SchemaIntrospectorService,
        PolicyFeasibilityService
    ],
    controllers: [AiController],
    exports: [AiService, PolicyParserService, PolicyFeasibilityService, SchemaIntrospectorService],
})
export class AiModule { }
