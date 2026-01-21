import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../common/prisma/prisma.module';
import { OdooController } from './odoo.controller';
import { OdooService } from './odoo.service';
import { OdooSyncJob } from './jobs/odoo-sync.job';

@Module({
    imports: [PrismaModule],
    controllers: [OdooController],
    providers: [OdooService, OdooSyncJob],
    exports: [OdooService],
})
export class OdooModule { }

