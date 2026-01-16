import { PrismaService } from '../../common/prisma/prisma.service';
export declare class PolicyVersioningService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    createVersion(policyId: string, userId: string, userName: string, changeReason?: string): Promise<{
        id: string;
        createdAt: Date;
        version: number;
        conditions: import("@prisma/client/runtime/library").JsonValue;
        originalText: string;
        parsedRule: import("@prisma/client/runtime/library").JsonValue;
        actions: import("@prisma/client/runtime/library").JsonValue;
        policyId: string;
        changeReason: string | null;
        changedBy: string;
        changedByName: string;
    }>;
    getVersionHistory(policyId: string, options?: {
        page?: number;
        limit?: number;
    }): Promise<{
        data: {
            id: string;
            createdAt: Date;
            version: number;
            conditions: import("@prisma/client/runtime/library").JsonValue;
            originalText: string;
            parsedRule: import("@prisma/client/runtime/library").JsonValue;
            actions: import("@prisma/client/runtime/library").JsonValue;
            policyId: string;
            changeReason: string | null;
            changedBy: string;
            changedByName: string;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getVersion(policyId: string, version: number): Promise<{
        id: string;
        createdAt: Date;
        version: number;
        conditions: import("@prisma/client/runtime/library").JsonValue;
        originalText: string;
        parsedRule: import("@prisma/client/runtime/library").JsonValue;
        actions: import("@prisma/client/runtime/library").JsonValue;
        policyId: string;
        changeReason: string | null;
        changedBy: string;
        changedByName: string;
    }>;
    revertToVersion(policyId: string, version: number, userId: string, userName: string): Promise<{
        id: string;
        name: string | null;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.SmartPolicyStatus;
        companyId: string;
        description: string | null;
        isActive: boolean;
        priority: number;
        effectiveFrom: Date | null;
        effectiveTo: Date | null;
        createdById: string | null;
        requiresApproval: boolean;
        conditions: import("@prisma/client/runtime/library").JsonValue;
        approvedAt: Date | null;
        approvedById: string | null;
        originalText: string;
        triggerEvent: import(".prisma/client").$Enums.SmartPolicyTrigger;
        triggerSubEvent: string | null;
        parsedRule: import("@prisma/client/runtime/library").JsonValue;
        actions: import("@prisma/client/runtime/library").JsonValue;
        conditionLogic: string;
        lookbackMonths: number | null;
        scopeType: string;
        scopeId: string | null;
        scopeName: string | null;
        aiExplanation: string | null;
        clarificationNeeded: string | null;
        executionCount: number;
        lastExecutedAt: Date | null;
        totalAmountPaid: import("@prisma/client/runtime/library").Decimal;
        totalAmountDeduct: import("@prisma/client/runtime/library").Decimal;
        currentVersion: number;
        executionOrder: number;
        executionGroup: string | null;
        dependsOnPolicies: string[];
        blockLowerPriority: boolean;
    }>;
    compareVersions(policyId: string, v1: number, v2: number): Promise<{
        version1: {
            version: number;
            originalText: string;
            conditions: import("@prisma/client/runtime/library").JsonValue;
            actions: import("@prisma/client/runtime/library").JsonValue;
            changedBy: string;
            createdAt: Date;
        };
        version2: {
            version: number;
            originalText: string;
            conditions: import("@prisma/client/runtime/library").JsonValue;
            actions: import("@prisma/client/runtime/library").JsonValue;
            changedBy: string;
            createdAt: Date;
        };
        differences: {
            textChanged: boolean;
            conditionsChanged: boolean;
            actionsChanged: boolean;
        };
    }>;
    pruneOldVersions(policyId: string, keepCount?: number): Promise<{
        deleted: number;
    }>;
}
