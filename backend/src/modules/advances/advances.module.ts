import { Module } from '@nestjs/common';
import { AdvancesController } from './advances.controller';
import { AdvancesService } from './advances.service';
import { PermissionsModule } from '../permissions/permissions.module';
import { UploadModule } from '../../common/upload/upload.module';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ApprovalWorkflowService } from '../../common/services/approval-workflow.service';

@Module({
    imports: [PrismaModule, PermissionsModule, UploadModule, NotificationsModule],
    controllers: [AdvancesController],
    providers: [AdvancesService, ApprovalWorkflowService],
    exports: [AdvancesService],
})
export class AdvancesModule { }
