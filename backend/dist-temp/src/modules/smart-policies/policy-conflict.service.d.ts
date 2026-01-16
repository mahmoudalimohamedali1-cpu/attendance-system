import { PrismaService } from '../../common/prisma/prisma.service';
export interface ConflictResult {
    hasConflicts: boolean;
    conflictingPolicies: Array<{
        id: string;
        name: string;
        triggerEvent: string;
        conflictType: 'SAME_TRIGGER' | 'OVERLAPPING_CONDITIONS' | 'CONTRADICTING_ACTIONS';
        severity: 'LOW' | 'MEDIUM' | 'HIGH';
        description: string;
    }>;
    warnings: string[];
}
export declare class PolicyConflictService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    detectConflicts(policyId: string): Promise<ConflictResult>;
    getConflictMatrix(companyId: string): Promise<{
        policies: Array<{
            id: string;
            name: string;
            triggerEvent: string;
        }>;
        conflicts: Array<{
            policy1Id: string;
            policy2Id: string;
            conflictType: string;
            severity: string;
        }>;
    }>;
    private checkConditionOverlap;
    private valuesOverlap;
    private checkActionConflict;
    validateBeforeActivation(policyId: string): Promise<{
        canActivate: boolean;
        warnings: string[];
        blockingConflicts: string[];
    }>;
}
