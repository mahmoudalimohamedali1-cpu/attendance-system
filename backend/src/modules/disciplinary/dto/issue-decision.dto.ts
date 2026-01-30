import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber, Min, Max, IsUUID, IsDateString } from 'class-validator';
import { DecisionType, AdjustmentUnit } from '@prisma/client';

export class IssueDecisionDto {
    @IsEnum(DecisionType)
    @IsNotEmpty()
    decisionType: DecisionType;

    @IsUUID()
    @IsNotEmpty()
    employeeId: string;

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

    @IsUUID()
    @IsOptional()
    payrollPeriodId?: string;

    @IsOptional()
    @IsDateString()
    penaltyEffectiveDate?: string;
}
