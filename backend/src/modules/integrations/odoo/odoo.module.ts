import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../common/prisma/prisma.module';
import { OdooController } from './odoo.controller';
import { OdooService } from './odoo.service';
import { OdooSyncJob } from './jobs/odoo-sync.job';
import { OdooSyncLogService } from './logs/sync-log.service';
import { OdooRetryQueueService } from './queue/retry-queue.service';
import { OdooConflictResolverService } from './conflict/conflict-resolver.service';
import { OdooWebhookService } from './webhooks/odoo-webhook.service';
import { OdooFieldMappingService } from './mapping/field-mapping.service';

@Module({
    imports: [PrismaModule],
    controllers: [OdooController],
    providers: [
        OdooService,
        OdooSyncJob,
        OdooSyncLogService,
        OdooRetryQueueService,
        OdooConflictResolverService,
        OdooWebhookService,
        OdooFieldMappingService,
    ],
    exports: [
        OdooService,
        OdooSyncLogService,
        OdooRetryQueueService,
        OdooConflictResolverService,
        OdooWebhookService,
        OdooFieldMappingService,
    ],
})
export class OdooModule { }
