import { PrismaService } from '../../common/prisma/prisma.service';
export declare enum PolicyAuditEventType {
    POLICY_CREATED = "POLICY_CREATED",
    POLICY_UPDATED = "POLICY_UPDATED",
    POLICY_DELETED = "POLICY_DELETED",
    POLICY_ACTIVATED = "POLICY_ACTIVATED",
    POLICY_DEACTIVATED = "POLICY_DEACTIVATED",
    APPROVAL_SUBMITTED = "APPROVAL_SUBMITTED",
    APPROVAL_APPROVED = "APPROVAL_APPROVED",
    APPROVAL_REJECTED = "APPROVAL_REJECTED",
    SIMULATION_RUN = "SIMULATION_RUN",
    VERSION_CREATED = "VERSION_CREATED",
    CONFLICT_DETECTED = "CONFLICT_DETECTED",
    EXECUTION_COMPLETED = "EXECUTION_COMPLETED"
}
export declare class PolicyAuditService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    log(eventType: PolicyAuditEventType, policyId: string, userId: string, details?: Record<string, any>, companyId?: string): Promise<void>;
    logPolicyCreated(policyId: string, userId: string, policyData: {
        name?: string;
        triggerEvent: string;
        originalText: string;
    }, companyId?: string): Promise<void>;
    logPolicyUpdated(policyId: string, userId: string, changes: Record<string, {
        old: any;
        new: any;
    }>): Promise<void>;
    logPolicyDeleted(policyId: string, userId: string, policySnapshot: {
        name?: string;
        originalText: string;
    }): Promise<void>;
    logPolicyActivated(policyId: string, userId: string): Promise<void>;
    logPolicyDeactivated(policyId: string, userId: string): Promise<void>;
    logApprovalSubmitted(policyId: string, userId: string, notes?: string): Promise<void>;
    logApprovalApproved(policyId: string, userId: string, notes?: string, activatedNow?: boolean): Promise<void>;
    logApprovalRejected(policyId: string, userId: string, reason: string): Promise<void>;
    logExecutionCompleted(policyId: string, executionDetails: {
        employeesAffected: number;
        totalAdditions: number;
        totalDeductions: number;
    }): Promise<void>;
    logSimulationRun(policyId: string, userId: string, simulationSummary: {
        period: string;
        employeesAffected: number;
        netImpact: number;
    }): Promise<void>;
    getAuditLogForPolicy(policyId: string, options?: {
        page?: number;
        limit?: number;
    }): Promise<{
        data: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getCompanyAuditLog(companyId: string, options?: {
        page?: number;
        limit?: number;
    }): Promise<{
        data: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
}
