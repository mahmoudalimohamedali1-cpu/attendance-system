import { Module } from '@nestjs/common';
import { EmployeeProfileController } from './employee-profile.controller';
import { EmployeeProfileService } from './employee-profile.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { UploadModule } from '../../common/upload/upload.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [PrismaModule, UploadModule, NotificationsModule],
    controllers: [EmployeeProfileController],
    providers: [EmployeeProfileService],
    exports: [EmployeeProfileService],
})
export class EmployeeProfileModule { }
