import { Module } from '@nestjs/common';
import { MudadController } from './mudad.controller';
import { MudadService } from './mudad.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { StatusLogService } from '../../common/services/status-log.service';
import { StateMachineService } from '../../common/services/state-machine.service';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
    imports: [PrismaModule, PermissionsModule],
    controllers: [MudadController],
    providers: [MudadService, StatusLogService, StateMachineService],
    exports: [MudadService],
})
export class MudadModule { }


