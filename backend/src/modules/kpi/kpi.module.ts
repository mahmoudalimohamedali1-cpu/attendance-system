/**
 * KPI Module
 * Registers KPI Engine components
 */

import { Module } from '@nestjs/common';
import { KPIController } from './kpi.controller';
import { KPIService } from './kpi.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [KPIController],
    providers: [KPIService],
    exports: [KPIService],
})
export class KPIModule { }
