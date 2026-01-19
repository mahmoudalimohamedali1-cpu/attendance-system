import { Module } from '@nestjs/common';
import { BranchesController } from './branches.controller';
import { DepartmentsController } from './departments.controller';
import { BranchesService } from './branches.service';

@Module({
  controllers: [BranchesController, DepartmentsController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule { }

