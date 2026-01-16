import { PrismaService } from '../../common/prisma/prisma.service';
import { PolicyVersioningService } from './policy-versioning.service';
export declare class PolicyApprovalService {
    private readonly prisma;
    private readonly versioningService;
    private readonly logger;
    constructor(prisma: PrismaService, versioningService: PolicyVersioningService);
    submitForApproval(policyId: string, submitterId: string, submitterName: string, notes?: string): Promise<{
        approval: {
            id: string;
            createdAt: Date;
            action: import(".prisma/client").$Enums.PolicyApprovalAction;
            policyId: string;
            rejectionReason: string | null;
            submittedBy: string;
            submittedByName: string;
            submittedAt: Date;
            requiredLevel: string;
            actionBy: string | null;
            actionByName: string | null;
            actionAt: Date | null;
            actionNotes: string | null;
            policyVersion: number;
        };
        message: string;
    }>;
    approve(policyId: string, approverId: string, approverName: string, notes?: string, activateNow?: boolean): Promise<{
        policy: {
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
        };
        message: string;
    }>;
    reject(policyId: string, rejecterId: string, rejecterName: string, reason: string): Promise<{
        message: string;
        reason: string;
    }>;
    requestChanges(policyId: string, reviewerId: string, reviewerName: string, requestedChanges: string): Promise<{
        message: string;
        requestedChanges: string;
    }>;
    getApprovalQueue(companyId: string): Promise<{
        data: {
            id: string;
            name: string;
            originalText: string;
            triggerEvent: import(".prisma/client").$Enums.SmartPolicyTrigger;
            priority: number;
            currentVersion: number;
            submittedBy: string;
            submittedAt: Date;
            requiredLevel: string;
        }[];
        total: number;
    }>;
    getApprovalHistory(policyId: string): Promise<{
        data: {
            id: string;
            createdAt: Date;
            action: import(".prisma/client").$Enums.PolicyApprovalAction;
            policyId: string;
            rejectionReason: string | null;
            submittedBy: string;
            submittedByName: string;
            submittedAt: Date;
            requiredLevel: string;
            actionBy: string | null;
            actionByName: string | null;
            actionAt: Date | null;
            actionNotes: string | null;
            policyVersion: number;
        }[];
        total: number;
    }>;
    private determineRequiredApprovalLevel;
}
