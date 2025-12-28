import { Module } from '@nestjs/common';
import { DisciplinaryService } from './disciplinary.service';
import { DisciplinaryController } from './disciplinary.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
    imports: [
        NotificationsModule,
        PermissionsModule,
    ],
    controllers: [DisciplinaryController],
    providers: [DisciplinaryService],
    exports: [DisciplinaryService],
})
export class DisciplinaryModule { }
