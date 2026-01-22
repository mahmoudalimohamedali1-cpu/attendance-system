import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OdooService } from '../odoo.service';
import { PrismaService } from '../../../../common/prisma/prisma.service';

import { OdooRetryQueueService } from '../queue/retry-queue.service';

@Injectable()
export class OdooSyncJob {
    private readonly logger = new Logger(OdooSyncJob.name);
    private isRunning = false;

    constructor(
        private readonly odooService: OdooService,
        private readonly prisma: PrismaService,
        private readonly retryQueue: OdooRetryQueueService,
    ) { }

    /**
     * Sync attendance to Odoo every 5 minutes
     */
    @Cron(CronExpression.EVERY_5_MINUTES)
    async syncAttendanceToOdoo() {
        if (this.isRunning) {
            this.logger.debug('Sync job already running, skipping...');
            return;
        }

        this.isRunning = true;
        this.logger.log('🔄 Starting scheduled Odoo attendance sync...');

        try {
            // Get all companies with active Odoo integration
            const integrations = await this.prisma.integration.findMany({
                where: { type: 'ODOO', isActive: true },
                select: { companyId: true },
            });

            for (const integration of integrations) {
                try {
                    const result = await this.odooService.syncAttendance(integration.companyId);

                    if (result.pushed > 0) {
                        this.logger.log(
                            `✅ Company ${integration.companyId}: Pushed ${result.pushed} attendance records to Odoo`,
                        );
                    }

                    if (result.failed > 0) {
                        this.logger.warn(
                            `⚠️ Company ${integration.companyId}: Failed to push ${result.failed} records`,
                        );
                    }
                } catch (error) {
                    this.logger.error(`❌ Company ${integration.companyId}: ${error.message}`);
                }
            }

            this.logger.log('🔄 Odoo sync completed');
        } catch (error) {
            this.logger.error('❌ Odoo sync job failed:', error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Sync employees from Odoo every hour
     */
    @Cron(CronExpression.EVERY_HOUR)
    async syncEmployeesFromOdoo() {
        this.logger.log('👥 Starting scheduled Odoo employee sync...');

        try {
            const integrations = await this.prisma.integration.findMany({
                where: { type: 'ODOO', isActive: true },
                select: { companyId: true, config: true },
            });

            for (const integration of integrations) {
                const config = integration.config as any;
                if (!config?.autoSync) continue;

                try {
                    const result = await this.odooService.syncEmployees(integration.companyId, {
                        activeOnly: true,
                        createNewUsers: false, // Only update existing mappings
                    });

                    if (result.updated > 0) {
                        this.logger.log(
                            `✅ Company ${integration.companyId}: Updated ${result.updated} employees from Odoo`,
                        );
                    }
                } catch (error) {
                    this.logger.error(`❌ Company ${integration.companyId}: ${error.message}`);
                }
            }
        } catch (error) {
            this.logger.error('❌ Employee sync job failed:', error);
        }
    }

    /**
     * Process failed sync items from the retry queue
     */
    @Cron(CronExpression.EVERY_10_MINUTES)
    async processRetryQueue() {
        this.logger.log('🔄 Processing Odoo retry queue...');

        try {
            const items = await this.retryQueue.getNextItems(20);
            if (items.length === 0) return;

            for (const item of items) {
                try {
                    switch (item.operation) {
                        case 'ATTENDANCE_PUSH':
                            const result = await this.odooService.pushAttendance(item.companyId, item.payload);
                            if (result.success) {
                                await this.retryQueue.markCompleted(item.id);
                            } else {
                                await this.retryQueue.markFailed(item.id, 'Odoo rejected record during retry');
                            }
                            break;

                        default:
                            this.logger.warn(`Unknown retry operation: ${item.operation}`);
                            await this.retryQueue.markFailed(item.id, 'Unsupported operation for retry');
                    }
                } catch (error) {
                    await this.retryQueue.markFailed(item.id, error.message);
                    this.logger.error(`❌ Retry failed for item ${item.id}: ${error.message}`);
                }
            }
        } catch (error) {
            this.logger.error('❌ Retry queue job failed:', error);
        }
    }
}
