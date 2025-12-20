import { Module } from '@nestjs/common';
import { AdvancesController } from './advances.controller';
import { AdvancesService } from './advances.service';
import { PermissionsModule } from '../permissions/permissions.module';
import { UploadModule } from '../../common/upload/upload.module';

@Module({
    imports: [PermissionsModule, UploadModule],
    controllers: [AdvancesController],
    providers: [AdvancesService],
    exports: [AdvancesService],
})
export class AdvancesModule { }
