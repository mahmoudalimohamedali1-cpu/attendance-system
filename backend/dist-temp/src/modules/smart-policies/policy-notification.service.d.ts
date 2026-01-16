import { PrismaService } from '../../common/prisma/prisma.service';
export declare class PolicyNotificationService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    notifyApprovalRequired(policyId: string, policyName: string, submitterName: string, companyId: string): Promise<void>;
    notifyApprovalResult(policyId: string, policyName: string, submitterId: string, companyId: string, approved: boolean, approverName: string, notes?: string): Promise<void>;
    notifyExecutionCompleted(policyId: string, policyName: string, createdById: string | null, companyId: string, summary: {
        affectedEmployees: number;
        totalAdditions: number;
        totalDeductions: number;
    }): Promise<void>;
    notifyConflictDetected(policyId: string, policyName: string, createdById: string | null, companyId: string, conflictingPolicies: string[], severity: string): Promise<void>;
    private createNotification;
    getPolicyNotifications(userId: string, options?: {
        page?: number;
        limit?: number;
        unreadOnly?: boolean;
    }): Promise<{
        data: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
}
