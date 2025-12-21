import { Module } from '@nestjs/common';
import { QiwaController } from './qiwa.controller';
import { QiwaService } from './qiwa.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
    imports: [PrismaModule, PermissionsModule],
    controllers: [QiwaController],
    providers: [QiwaService],
    exports: [QiwaService],
})
export class QiwaModule { }
