import { Module } from '@nestjs/common';
import { AuditController } from './audit-logs.controller';
import { StatusLogService } from '../../common/services/status-log.service';
import { StuckDetectionService } from '../../common/services/stuck-detection.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
    imports: [PrismaModule, PermissionsModule],
    controllers: [AuditController],
    providers: [StatusLogService, StuckDetectionService],
})
export class AuditLogsModule { }
