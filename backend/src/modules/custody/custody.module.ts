import { Module } from '@nestjs/common';
import { CustodyController } from './custody.controller';
import { CustodyService } from './custody.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
    imports: [
        NotificationsModule,
        PermissionsModule,
    ],
    controllers: [CustodyController],
    providers: [CustodyService],
    exports: [CustodyService],
})
export class CustodyModule { }

