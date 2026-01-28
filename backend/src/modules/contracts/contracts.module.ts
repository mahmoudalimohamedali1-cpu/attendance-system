import { Module } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [PrismaModule, AuditModule, NotificationsModule],
    controllers: [ContractsController],
    providers: [ContractsService],
    exports: [ContractsService],
})
export class ContractsModule { }
