import { Module } from '@nestjs/common';
import { BranchesController } from './branches.controller';
import { DepartmentsController } from './departments.controller';
import { BranchesService } from './branches.service';
import { BranchBreakScheduleController } from './branch-break-schedule.controller';
import { BranchBreakScheduleService } from './branch-break-schedule.service';

@Module({
  controllers: [BranchesController, DepartmentsController, BranchBreakScheduleController],
  providers: [BranchesService, BranchBreakScheduleService],
  exports: [BranchesService, BranchBreakScheduleService],
})
export class BranchesModule { }
