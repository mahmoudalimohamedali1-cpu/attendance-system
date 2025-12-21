import { Module } from '@nestjs/common';
import { AuditController } from './audit-logs.controller';
import { StatusLogService } from '../../common/services/status-log.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [AuditController],
    providers: [StatusLogService],
})
export class AuditLogsModule { }
