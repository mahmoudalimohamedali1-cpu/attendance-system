import { Module } from '@nestjs/common';
import { RaisesController } from './raises.controller';
import { RaisesService } from './raises.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { UploadModule } from '../../common/upload/upload.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
    imports: [PrismaModule, UploadModule, PermissionsModule],
    controllers: [RaisesController],
    providers: [RaisesService],
    exports: [RaisesService],
})
export class RaisesModule { }

