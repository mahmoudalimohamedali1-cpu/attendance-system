import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController, TaskCategoriesController, TaskTemplatesController } from './tasks.controller';
import { SprintsService } from './sprints.service';
import { SprintsController } from './sprints.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RecurringTasksScheduler } from './recurring-tasks.scheduler';
import { TaskRecoveryService } from './task-recovery.service';
import { TaskRecoveryController } from './task-recovery.controller';
import { TaskPlanningService } from './task-planning.service';
import { TaskPlanningController } from './task-planning.controller';

@Module({
    imports: [PrismaModule, NotificationsModule],
    controllers: [
        TasksController,
        TaskCategoriesController,
        TaskTemplatesController,
        SprintsController,
        TaskRecoveryController,
        TaskPlanningController,
    ],
    providers: [
        TasksService,
        SprintsService,
        RecurringTasksScheduler,
        TaskRecoveryService,
        TaskPlanningService,
    ],
    exports: [TasksService, SprintsService, TaskRecoveryService, TaskPlanningService],
})
export class TasksModule { }

