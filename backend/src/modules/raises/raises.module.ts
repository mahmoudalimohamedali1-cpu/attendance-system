import { Module } from '@nestjs/common';
import { RaisesController } from './raises.controller';
import { RaisesService } from './raises.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { UploadModule } from '../../common/upload/upload.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ApprovalWorkflowService } from '../../common/services/approval-workflow.service';

@Module({
    imports: [PrismaModule, UploadModule, PermissionsModule, NotificationsModule],
    controllers: [RaisesController],
    providers: [RaisesService, ApprovalWorkflowService],
    exports: [RaisesService],
})
export class RaisesModule { }

