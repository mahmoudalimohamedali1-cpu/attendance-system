import { PrismaService } from '../../common/prisma/prisma.service';
import { SubmissionEntityType } from '@prisma/client';
interface LogStatusChangeDto {
    entityType: SubmissionEntityType;
    entityId: string;
    fromStatus: string | null;
    toStatus: string;
    reason?: string;
    externalRef?: string;
    meta?: any;
}
export declare class StatusLogService {
    private prisma;
    constructor(prisma: PrismaService);
    logStatusChange(dto: LogStatusChangeDto, companyId: string, userId: string): Promise<{
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
    }>;
    getLogsForEntity(entityType: SubmissionEntityType, entityId: string, companyId: string): Promise<{
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
    getLatestLog(entityType: SubmissionEntityType, entityId: string, companyId: string): Promise<{
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
    } | null>;
    getLogsByPeriod(companyId: string, startDate: Date, endDate: Date): Promise<{
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
    getLogsByUser(companyId: string, userId: string): Promise<{
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
}
export {};
