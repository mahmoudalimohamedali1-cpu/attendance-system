import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';

export type ConflictStrategy = 'ODOO_WINS' | 'LOCAL_WINS' | 'LATEST_WINS' | 'MANUAL';

export interface ConflictData {
    companyId: string;
    entityType: 'EMPLOYEE' | 'ATTENDANCE' | 'LEAVE';
    entityId: string;
    localData: any;
    odooData: any;
    conflictType: 'DATA_MISMATCH' | 'MISSING_LOCAL' | 'MISSING_ODOO';
}

export interface ConflictResolution {
    action: 'KEEP_LOCAL' | 'KEEP_ODOO' | 'MERGED' | 'SKIPPED';
    resolvedData?: any;
}

@Injectable()
export class OdooConflictResolverService {
    private readonly logger = new Logger(OdooConflictResolverService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Detect conflicts between local and Odoo data
     */
    detectConflicts(localData: any, odooData: any, fields: string[]): string[] {
        const conflicts: string[] = [];

        for (const field of fields) {
            const localValue = this.getNestedValue(localData, field);
            const odooValue = this.getNestedValue(odooData, field);

            if (localValue !== odooValue && localValue !== null && odooValue !== null) {
                conflicts.push(field);
            }
        }

        return conflicts;
    }

    /**
     * Resolve a conflict automatically based on strategy
     */
    async resolveAuto(
        conflict: ConflictData,
        strategy: ConflictStrategy,
    ): Promise<ConflictResolution> {
        switch (strategy) {
            case 'ODOO_WINS':
                return { action: 'KEEP_ODOO', resolvedData: conflict.odooData };

            case 'LOCAL_WINS':
                return { action: 'KEEP_LOCAL', resolvedData: conflict.localData };

            case 'LATEST_WINS':
                const localTime = this.getTimestamp(conflict.localData);
                const odooTime = this.getTimestamp(conflict.odooData);
                if (localTime >= odooTime) {
                    return { action: 'KEEP_LOCAL', resolvedData: conflict.localData };
                } else {
                    return { action: 'KEEP_ODOO', resolvedData: conflict.odooData };
                }

            case 'MANUAL':
                // Save conflict for manual review
                await this.saveConflict(conflict);
                return { action: 'SKIPPED' };

            default:
                return { action: 'SKIPPED' };
        }
    }

    /**
     * Save conflict for manual review
     */
    async saveConflict(conflict: ConflictData): Promise<string> {
        const saved = await this.prisma.odooConflict.create({
            data: {
                companyId: conflict.companyId,
                entityType: conflict.entityType,
                entityId: conflict.entityId,
                localData: conflict.localData,
                odooData: conflict.odooData,
                conflictType: conflict.conflictType,
            },
        });

        this.logger.warn(`Saved conflict ${saved.id} for manual review: ${conflict.entityType}/${conflict.entityId}`);
        return saved.id;
    }

    /**
     * Get unresolved conflicts
     */
    async getUnresolved(companyId: string, options?: { entityType?: string; limit?: number }) {
        const where: any = { companyId, resolution: null };
        if (options?.entityType) where.entityType = options.entityType;

        return this.prisma.odooConflict.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: options?.limit || 50,
        });
    }

    /**
     * Manually resolve a conflict
     */
    async resolveManually(
        conflictId: string,
        resolution: 'KEEP_LOCAL' | 'KEEP_ODOO' | 'MERGED' | 'SKIPPED',
        resolvedBy: string,
        notes?: string,
    ): Promise<void> {
        await this.prisma.odooConflict.update({
            where: { id: conflictId },
            data: {
                resolution,
                resolvedBy,
                resolvedAt: new Date(),
                notes,
            },
        });

        this.logger.log(`Conflict ${conflictId} resolved as ${resolution} by ${resolvedBy}`);
    }

    /**
     * Get conflict statistics
     */
    async getStats(companyId: string) {
        const [unresolved, resolved] = await Promise.all([
            this.prisma.odooConflict.count({ where: { companyId, resolution: null } }),
            this.prisma.odooConflict.count({ where: { companyId, NOT: { resolution: null } } }),
        ]);

        const byType = await this.prisma.odooConflict.groupBy({
            by: ['entityType'],
            where: { companyId, resolution: null },
            _count: true,
        });

        return {
            unresolved,
            resolved,
            total: unresolved + resolved,
            byType: byType.reduce((acc, t) => {
                acc[t.entityType] = t._count;
                return acc;
            }, {} as Record<string, number>),
        };
    }

    /**
     * Merge local and Odoo data (prefer newer values)
     */
    mergeData(localData: any, odooData: any, preferredFields?: Record<string, 'local' | 'odoo'>): any {
        const merged = { ...localData };

        for (const [key, value] of Object.entries(odooData)) {
            const preference = preferredFields?.[key];

            if (preference === 'local') {
                // Keep local value
                continue;
            } else if (preference === 'odoo') {
                // Use Odoo value
                merged[key] = value;
            } else {
                // Default: use Odoo value if local is null/undefined
                if (merged[key] === null || merged[key] === undefined) {
                    merged[key] = value;
                }
            }
        }

        return merged;
    }

    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((acc, key) => acc?.[key], obj);
    }

    private getTimestamp(data: any): number {
        const fields = ['updatedAt', 'write_date', 'modifiedAt', 'lastModified'];
        for (const field of fields) {
            if (data[field]) {
                return new Date(data[field]).getTime();
            }
        }
        return 0;
    }
}
