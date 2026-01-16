import { Module } from '@nestjs/common';
import { WorkforcePlanningController } from './workforce-planning.controller';
import { WorkforcePlanningService } from './workforce-planning.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [WorkforcePlanningController],
    providers: [WorkforcePlanningService],
    exports: [WorkforcePlanningService],
})
export class WorkforcePlanningModule { }
