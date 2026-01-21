import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';

export interface SyncLogEntry {
    companyId: string;
    operation: 'EMPLOYEE_SYNC' | 'ATTENDANCE_PUSH' | 'LEAVE_SYNC' | 'PAYROLL_EXPORT' | 'DEPARTMENT_SYNC';
    direction: 'INBOUND' | 'OUTBOUND';
    triggeredBy?: 'USER' | 'SCHEDULED' | 'WEBHOOK';
}

export interface SyncLogResult {
    recordCount: number;
    successCount: number;
    failedCount: number;
    errors?: any[];
    metadata?: any;
}

@Injectable()
export class OdooSyncLogService {
    private readonly logger = new Logger(OdooSyncLogService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Start a new sync log entry
     */
    async startLog(entry: SyncLogEntry): Promise<string> {
        const log = await this.prisma.odooSyncLog.create({
            data: {
                companyId: entry.companyId,
                operation: entry.operation,
                direction: entry.direction,
                status: 'RUNNING',
                triggeredBy: entry.triggeredBy || 'USER',
                recordCount: 0,
                successCount: 0,
                failedCount: 0,
            },
        });
        return log.id;
    }

    /**
     * Complete a sync log with results
     */
    async completeLog(
        logId: string,
        result: SyncLogResult,
        startTime: number,
    ): Promise<void> {
        const duration = Date.now() - startTime;
        const status = result.failedCount === 0
            ? 'SUCCESS'
            : result.successCount === 0
                ? 'FAILED'
                : 'PARTIAL';

        await this.prisma.odooSyncLog.update({
            where: { id: logId },
            data: {
                status,
                recordCount: result.recordCount,
                successCount: result.successCount,
                failedCount: result.failedCount,
                errors: result.errors ? JSON.parse(JSON.stringify(result.errors)) : null,
                metadata: result.metadata ? JSON.parse(JSON.stringify(result.metadata)) : null,
                duration,
            },
        });
    }

    /**
     * Mark a sync log as failed
     */
    async failLog(logId: string, error: string, startTime: number): Promise<void> {
        const duration = Date.now() - startTime;
        await this.prisma.odooSyncLog.update({
            where: { id: logId },
            data: {
                status: 'FAILED',
                errors: [{ message: error }],
                duration,
            },
        });
    }

    /**
     * Get sync logs for a company
     */
    async getLogs(
        companyId: string,
        options?: {
            operation?: string;
            status?: string;
            limit?: number;
            offset?: number;
        },
    ) {
        const where: any = { companyId };
        if (options?.operation) where.operation = options.operation;
        if (options?.status) where.status = options.status;

        const [logs, total] = await Promise.all([
            this.prisma.odooSyncLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: options?.limit || 50,
                skip: options?.offset || 0,
            }),
            this.prisma.odooSyncLog.count({ where }),
        ]);

        return { logs, total };
    }

    /**
     * Get sync statistics
     */
    async getStats(companyId: string, days: number = 7) {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const logs = await this.prisma.odooSyncLog.findMany({
            where: {
                companyId,
                createdAt: { gte: since },
            },
            select: {
                operation: true,
                status: true,
                recordCount: true,
                successCount: true,
                failedCount: true,
                duration: true,
                createdAt: true,
            },
        });

        const stats = {
            totalSyncs: logs.length,
            successful: logs.filter(l => l.status === 'SUCCESS').length,
            failed: logs.filter(l => l.status === 'FAILED').length,
            partial: logs.filter(l => l.status === 'PARTIAL').length,
            totalRecords: logs.reduce((sum, l) => sum + l.recordCount, 0),
            totalSuccess: logs.reduce((sum, l) => sum + l.successCount, 0),
            totalFailed: logs.reduce((sum, l) => sum + l.failedCount, 0),
            avgDuration: logs.length > 0
                ? Math.round(logs.reduce((sum, l) => sum + (l.duration || 0), 0) / logs.length)
                : 0,
            byOperation: {} as Record<string, number>,
            byDay: {} as Record<string, number>,
        };

        // Group by operation
        logs.forEach(l => {
            stats.byOperation[l.operation] = (stats.byOperation[l.operation] || 0) + 1;
        });

        // Group by day
        logs.forEach(l => {
            const day = l.createdAt.toISOString().split('T')[0];
            stats.byDay[day] = (stats.byDay[day] || 0) + 1;
        });

        return stats;
    }

    /**
     * Delete old logs (retention policy)
     */
    async cleanupOldLogs(companyId: string, daysToKeep: number = 30): Promise<number> {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - daysToKeep);

        const result = await this.prisma.odooSyncLog.deleteMany({
            where: {
                companyId,
                createdAt: { lt: cutoff },
            },
        });

        this.logger.log(`Cleaned up ${result.count} old sync logs for company ${companyId}`);
        return result.count;
    }
}
