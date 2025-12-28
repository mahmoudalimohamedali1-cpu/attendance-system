import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { LeavesModule } from '../leaves/leaves.module';
import { SettingsModule } from '../settings/settings.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { EmployeeImportController } from './employee-import.controller';
import { EmployeeImportService } from './services/employee-import.service';
import { ColumnMapperService } from './services/column-mapper.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [LeavesModule, SettingsModule, PermissionsModule, PrismaModule],
  controllers: [UsersController, EmployeeImportController],
  providers: [UsersService, EmployeeImportService, ColumnMapperService],
  exports: [UsersService, EmployeeImportService, ColumnMapperService],
})
export class UsersModule { }
