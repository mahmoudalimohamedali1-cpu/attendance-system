import { AuditService } from './audit.service';
export declare class AuditController {
    private readonly auditService;
    constructor(auditService: AuditService);
    getAuditLogs(userId?: string, entity?: string, entityId?: string, action?: any, startDate?: string, endDate?: string, page?: number, limit?: number): Promise<{
        data: ({
            user: {
                email: string;
                firstName: string;
                lastName: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            companyId: string | null;
            description: string | null;
            userId: string | null;
            entityId: string | null;
            action: import(".prisma/client").$Enums.AuditAction;
            entity: string;
            oldValue: import("@prisma/client/runtime/library").JsonValue | null;
            newValue: import("@prisma/client/runtime/library").JsonValue | null;
            ipAddress: string | null;
            userAgent: string | null;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getSuspiciousAttempts(userId?: string, attemptType?: string, startDate?: string, endDate?: string, page?: number, limit?: number): Promise<{
        data: {
            id: string;
            createdAt: Date;
            companyId: string | null;
            notes: string | null;
            latitude: import("@prisma/client/runtime/library").Decimal | null;
            longitude: import("@prisma/client/runtime/library").Decimal | null;
            deviceInfo: string | null;
            userId: string;
            ipAddress: string | null;
            attemptType: string;
            distance: number | null;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
}
