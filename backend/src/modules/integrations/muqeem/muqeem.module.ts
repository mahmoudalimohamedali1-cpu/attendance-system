import { Module } from '@nestjs/common';
import { MuqeemService } from './muqeem.service';
import { MuqeemController } from './muqeem.controller';
import { MuqeemExpiryJob } from './muqeem-expiry.job';
import { NotificationsModule } from '../../notifications/notifications.module';
import { PermissionsModule } from '../../permissions/permissions.module';

@Module({
    imports: [NotificationsModule, PermissionsModule],
    controllers: [MuqeemController],
    providers: [MuqeemService, MuqeemExpiryJob],
    exports: [MuqeemService],
})
export class MuqeemModule { }
