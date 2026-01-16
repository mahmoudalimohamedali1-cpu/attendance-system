import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';
import { GoalDataSourceService } from './goal-data-source.service';

@Module({
    imports: [PrismaModule],
    controllers: [GoalsController],
    providers: [GoalsService, GoalDataSourceService],
    exports: [GoalsService, GoalDataSourceService],
})
export class GoalsModule { }
