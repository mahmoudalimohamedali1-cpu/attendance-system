import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber, Min, Max, IsUUID } from 'class-validator';
import { DecisionType, AdjustmentUnit } from '@prisma/client';

export class IssueDecisionDto {
    @IsEnum(DecisionType)
    @IsNotEmpty()
    decisionType: DecisionType;

    @IsString()
    @IsNotEmpty()
    decisionReason: string;

    @IsOptional()
    @IsEnum(AdjustmentUnit)
    penaltyUnit?: AdjustmentUnit;

    @IsOptional()
    @IsNumber()
    @Min(0)
    penaltyValue?: number;

    @IsOptional()
    @IsUUID()
    payrollPeriodId?: string;

    @IsOptional()
    @IsString()
    penaltyEffectiveDate?: string;
}
