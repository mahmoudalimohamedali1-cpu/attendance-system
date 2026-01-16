import { PrismaService } from '../../common/prisma/prisma.service';
export interface CreatePolicyExceptionDto {
    policyId: string;
    exceptionType: 'EMPLOYEE' | 'DEPARTMENT' | 'JOB_TITLE' | 'BRANCH';
    targetId: string;
    targetName: string;
    reason?: string;
    exceptionFrom?: Date;
    exceptionTo?: Date;
}
export interface UpdatePolicyExceptionDto {
    reason?: string;
    exceptionFrom?: Date;
    exceptionTo?: Date;
    isActive?: boolean;
}
export interface ExceptionCheckResult {
    isExcluded: boolean;
    exclusionReason?: string;
    exceptionId?: string;
    exceptionType?: string;
}
export declare class PolicyExceptionService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    create(companyId: string, dto: CreatePolicyExceptionDto, createdBy: string, createdByName: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        isActive: boolean;
        reason: string | null;
        policyId: string;
        createdBy: string;
        exceptionType: string;
        targetId: string;
        targetName: string;
        exceptionFrom: Date | null;
        exceptionTo: Date | null;
        createdByName: string;
    }>;
    update(exceptionId: string, dto: UpdatePolicyExceptionDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        isActive: boolean;
        reason: string | null;
        policyId: string;
        createdBy: string;
        exceptionType: string;
        targetId: string;
        targetName: string;
        exceptionFrom: Date | null;
        exceptionTo: Date | null;
        createdByName: string;
    }>;
    delete(exceptionId: string): Promise<{
        success: boolean;
    }>;
    findByPolicy(policyId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        isActive: boolean;
        reason: string | null;
        policyId: string;
        createdBy: string;
        exceptionType: string;
        targetId: string;
        targetName: string;
        exceptionFrom: Date | null;
        exceptionTo: Date | null;
        createdByName: string;
    }[]>;
    findByCompany(companyId: string, options?: {
        isActive?: boolean;
    }): Promise<({
        policy: {
            id: string;
            name: string | null;
            originalText: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        isActive: boolean;
        reason: string | null;
        policyId: string;
        createdBy: string;
        exceptionType: string;
        targetId: string;
        targetName: string;
        exceptionFrom: Date | null;
        exceptionTo: Date | null;
        createdByName: string;
    })[]>;
    isEmployeeExcluded(policyId: string, employeeId: string, employeeData?: {
        departmentId?: string;
        branchId?: string;
        jobTitleId?: string;
    }): Promise<ExceptionCheckResult>;
    getExcludedEmployees(policyId: string): Promise<string[]>;
    toggleActive(exceptionId: string, isActive: boolean): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        isActive: boolean;
        reason: string | null;
        policyId: string;
        createdBy: string;
        exceptionType: string;
        targetId: string;
        targetName: string;
        exceptionFrom: Date | null;
        exceptionTo: Date | null;
        createdByName: string;
    }>;
    copyExceptions(sourcePolicyId: string, targetPolicyId: string, copiedBy: string, copiedByName: string): Promise<{
        copied: number;
        total: number;
        exceptions: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            isActive: boolean;
            reason: string | null;
            policyId: string;
            createdBy: string;
            exceptionType: string;
            targetId: string;
            targetName: string;
            exceptionFrom: Date | null;
            exceptionTo: Date | null;
            createdByName: string;
        }[];
    }>;
    private validateTarget;
    getExceptionStats(policyId: string): Promise<{
        total: number;
        active: number;
        inactive: number;
        byType: {
            EMPLOYEE: number;
            DEPARTMENT: number;
            BRANCH: number;
            JOB_TITLE: number;
        };
        permanent: number;
        temporary: number;
    }>;
}
