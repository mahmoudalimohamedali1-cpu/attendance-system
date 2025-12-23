import { Module } from '@nestjs/common';
import { AuditLogsController } from './audit-logs.controller';
import { StatusLogService } from '../../common/services/status-log.service';
import { StuckDetectionService } from '../../common/services/stuck-detection.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [AuditLogsController],
    providers: [StatusLogService, StuckDetectionService],
})
export class AuditLogsModule { }
