import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QiwaController } from './qiwa.controller';
import { QiwaService } from './qiwa.service';
import { QiwaApiService } from './services/qiwa-api.service';
import { SaudizationService } from './services/saudization.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [PrismaModule, PermissionsModule, AuditModule, ConfigModule],
    controllers: [QiwaController],
    providers: [QiwaService, QiwaApiService, SaudizationService],
    exports: [QiwaService, QiwaApiService, SaudizationService],
})
export class QiwaModule { }
