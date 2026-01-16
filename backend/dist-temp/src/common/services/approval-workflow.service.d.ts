import { PrismaService } from '../../common/prisma/prisma.service';
import { ApprovalStep, ApprovalRequestType } from '@prisma/client';
export interface ApprovalContext {
    requestType: ApprovalRequestType;
    amount?: number;
    days?: number;
    companyId: string;
}
export declare class ApprovalWorkflowService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getApprovalChain(context: ApprovalContext): Promise<ApprovalStep[]>;
    private getDefaultChain;
    getNextStep(chain: ApprovalStep[], currentStep: ApprovalStep): ApprovalStep;
    getFirstStep(chain: ApprovalStep[]): ApprovalStep;
    isChainComplete(chain: ApprovalStep[], currentStep: ApprovalStep): boolean;
    validateTransition(chain: ApprovalStep[], fromStep: ApprovalStep, toStep: ApprovalStep): void;
    getStepNameAr(step: ApprovalStep): string;
    getPermissionForStep(requestType: ApprovalRequestType, step: ApprovalStep): string;
    createDefaultConfigs(companyId: string): Promise<void>;
}
