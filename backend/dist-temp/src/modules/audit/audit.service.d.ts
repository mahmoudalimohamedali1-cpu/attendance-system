import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditAction } from '@prisma/client';
export declare class AuditService {
    private prisma;
    constructor(prisma: PrismaService);
    log(action: AuditAction, entity: string, entityId?: string, userId?: string, oldValue?: any, newValue?: any, description?: string, ipAddress?: string, userAgent?: string): Promise<{
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
    }>;
    getAuditLogs(query: {
        userId?: string;
        entity?: string;
        entityId?: string;
        action?: AuditAction;
        startDate?: string;
        endDate?: string;
        page?: number;
        limit?: number;
    }): Promise<{
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
    getSuspiciousAttempts(query: {
        userId?: string;
        attemptType?: string;
        startDate?: string;
        endDate?: string;
        page?: number;
        limit?: number;
    }): Promise<{
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
    logLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<{
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
    }>;
    logPayrollChange(userId: string, payrollId: string, action: AuditAction, oldValue?: any, newValue?: any, description?: string): Promise<{
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
    }>;
    logBankAccountChange(userId: string, accountId: string, action: AuditAction, oldValue?: any, newValue?: any): Promise<{
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
    }>;
    logExport(userId: string, entity: string, description: string): Promise<{
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
    }>;
}
