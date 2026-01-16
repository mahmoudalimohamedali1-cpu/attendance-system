import { DecisionType, AdjustmentUnit } from '@prisma/client';
export declare class IssueDecisionDto {
    decisionType: DecisionType;
    decisionReason: string;
    penaltyUnit?: AdjustmentUnit;
    penaltyValue?: number;
    payrollPeriodId?: string;
    penaltyEffectiveDate?: string;
}
