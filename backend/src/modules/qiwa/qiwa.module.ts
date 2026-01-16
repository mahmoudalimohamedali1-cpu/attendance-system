import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QiwaController } from './qiwa.controller';
import { QiwaService } from './qiwa.service';
import { QiwaApiService } from './services/qiwa-api.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
    imports: [PrismaModule, PermissionsModule, ConfigModule],
    controllers: [QiwaController],
    providers: [QiwaService, QiwaApiService],
    exports: [QiwaService, QiwaApiService],
})
export class QiwaModule { }
