import { Response } from 'express';
import { StatusLogService } from '../../common/services/status-log.service';
export declare class AuditLogsController {
    private readonly statusLogService;
    constructor(statusLogService: StatusLogService);
    getEntityLogs(entityType: string, entityId: string, req: any): Promise<{
        id: string;
        createdAt: Date;
        companyId: string;
        reason: string | null;
        entityType: import(".prisma/client").$Enums.SubmissionEntityType;
        entityId: string;
        fromStatus: string | null;
        toStatus: string;
        changedByUserId: string;
        changedAt: Date;
        externalRef: string | null;
        meta: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
    getLogsByPeriod(req: any, startDate?: string, endDate?: string): Promise<{
        id: string;
        createdAt: Date;
        companyId: string;
        reason: string | null;
        entityType: import(".prisma/client").$Enums.SubmissionEntityType;
        entityId: string;
        fromStatus: string | null;
        toStatus: string;
        changedByUserId: string;
        changedAt: Date;
        externalRef: string | null;
        meta: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
    getLogsByUser(userId: string, req: any): Promise<{
        id: string;
        createdAt: Date;
        companyId: string;
        reason: string | null;
        entityType: import(".prisma/client").$Enums.SubmissionEntityType;
        entityId: string;
        fromStatus: string | null;
        toStatus: string;
        changedByUserId: string;
        changedAt: Date;
        externalRef: string | null;
        meta: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
    exportCsv(req: any, res: Response, startDate?: string, endDate?: string, entityType?: string): Promise<void>;
    getStuckStats(req: any): Promise<{
        message: string;
        threshold: string;
    }>;
}
