import { PrismaService } from '../../../common/prisma/prisma.service';
import { PoliciesService } from '../../policies/policies.service';
import { PolicyPayrollLine } from '../dto/calculation.types';
import { PolicyEvaluationContext } from '../dto/policy-context.types';
export declare class PolicyRuleEvaluatorService {
    private readonly prisma;
    private readonly policiesService;
    private readonly logger;
    constructor(prisma: PrismaService, policiesService: PoliciesService);
    evaluate(context: PolicyEvaluationContext): Promise<PolicyPayrollLine[]>;
    private evaluateRule;
    private evaluateOvertimeRule;
    private evaluateDeductionRule;
    private evaluateLeaveRule;
    private evaluateAllowanceRule;
    private createPayrollLine;
}
