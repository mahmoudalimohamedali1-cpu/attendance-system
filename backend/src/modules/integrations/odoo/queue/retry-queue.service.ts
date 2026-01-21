import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../../common/prisma/prisma.service';

export interface RetryQueueItem {
    companyId: string;
    operation: string;
    payload: any;
    priority?: number;
    maxAttempts?: number;
}

@Injectable()
export class OdooRetryQueueService {
    private readonly logger = new Logger(OdooRetryQueueService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Add item to retry queue
     */
    async enqueue(item: RetryQueueItem): Promise<string> {
        const queueItem = await this.prisma.odooRetryQueue.create({
            data: {
                companyId: item.companyId,
                operation: item.operation,
                payload: item.payload,
                priority: item.priority || 0,
                maxAttempts: item.maxAttempts || 3,
                status: 'PENDING',
                nextRetryAt: new Date(),
            },
        });

        this.logger.log(`Enqueued retry item ${queueItem.id} for ${item.operation}`);
        return queueItem.id;
    }

    /**
     * Get next items to process
     */
    async getNextItems(limit: number = 10): Promise<any[]> {
        const now = new Date();

        const items = await this.prisma.odooRetryQueue.findMany({
            where: {
                status: 'PENDING',
                nextRetryAt: { lte: now },
            },
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'asc' },
            ],
            take: limit,
        });

        // Mark as processing
        if (items.length > 0) {
            await this.prisma.odooRetryQueue.updateMany({
                where: { id: { in: items.map(i => i.id) } },
                data: { status: 'PROCESSING' },
            });
        }

        return items;
    }

    /**
     * Mark item as completed
     */
    async markCompleted(id: string): Promise<void> {
        await this.prisma.odooRetryQueue.update({
            where: { id },
            data: { status: 'COMPLETED' },
        });
        this.logger.log(`Retry item ${id} completed`);
    }

    /**
     * Mark item as failed with retry scheduling
     */
    async markFailed(id: string, error: string): Promise<void> {
        const item = await this.prisma.odooRetryQueue.findUnique({ where: { id } });
        if (!item) return;

        const newAttempts = item.attempts + 1;
        const isFinalFailure = newAttempts >= item.maxAttempts;

        // Exponential backoff: 1min, 5min, 15min, 30min, 1hr
        const backoffMinutes = [1, 5, 15, 30, 60];
        const nextRetryDelay = backoffMinutes[Math.min(newAttempts - 1, backoffMinutes.length - 1)];
        const nextRetryAt = new Date(Date.now() + nextRetryDelay * 60 * 1000);

        await this.prisma.odooRetryQueue.update({
            where: { id },
            data: {
                attempts: newAttempts,
                lastError: error,
                status: isFinalFailure ? 'FAILED' : 'PENDING',
                nextRetryAt: isFinalFailure ? null : nextRetryAt,
            },
        });

        if (isFinalFailure) {
            this.logger.error(`Retry item ${id} permanently failed after ${newAttempts} attempts`);
        } else {
            this.logger.warn(`Retry item ${id} failed, will retry at ${nextRetryAt.toISOString()}`);
        }
    }

    /**
     * Get queue statistics
     */
    async getStats(companyId: string) {
        const [pending, processing, completed, failed] = await Promise.all([
            this.prisma.odooRetryQueue.count({ where: { companyId, status: 'PENDING' } }),
            this.prisma.odooRetryQueue.count({ where: { companyId, status: 'PROCESSING' } }),
            this.prisma.odooRetryQueue.count({ where: { companyId, status: 'COMPLETED' } }),
            this.prisma.odooRetryQueue.count({ where: { companyId, status: 'FAILED' } }),
        ]);

        return { pending, processing, completed, failed, total: pending + processing + completed + failed };
    }

    /**
     * Cleanup old completed/failed items
     */
    async cleanup(daysToKeep: number = 7): Promise<number> {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - daysToKeep);

        const result = await this.prisma.odooRetryQueue.deleteMany({
            where: {
                status: { in: ['COMPLETED', 'FAILED'] },
                updatedAt: { lt: cutoff },
            },
        });

        this.logger.log(`Cleaned up ${result.count} old retry queue items`);
        return result.count;
    }

    /**
     * Reset stuck processing items
     */
    async resetStuckItems(stuckMinutes: number = 30): Promise<number> {
        const cutoff = new Date(Date.now() - stuckMinutes * 60 * 1000);

        const result = await this.prisma.odooRetryQueue.updateMany({
            where: {
                status: 'PROCESSING',
                updatedAt: { lt: cutoff },
            },
            data: {
                status: 'PENDING',
                nextRetryAt: new Date(),
            },
        });

        if (result.count > 0) {
            this.logger.warn(`Reset ${result.count} stuck retry queue items`);
        }

        return result.count;
    }
}
