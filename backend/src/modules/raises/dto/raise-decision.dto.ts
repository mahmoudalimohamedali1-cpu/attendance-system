import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, IsArray, IsDateString } from 'class-validator';

export enum DecisionType {
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    DELAYED = 'DELAYED',
}

export class ManagerDecisionDto {
    @ApiProperty({
        description: 'القرار',
        enum: DecisionType
    })
    @IsNotEmpty({ message: 'القرار مطلوب' })
    @IsEnum(DecisionType, { message: 'القرار غير صالح' })
    decision: DecisionType;

    @ApiPropertyOptional({ description: 'ملاحظات' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    notes?: string;

    @ApiPropertyOptional({
        description: 'شهر بدء الزيادة (يمكن أن يكون بأثر رجعي أو مستقبلي)',
        example: '2025-11-01'
    })
    @IsOptional()
    @IsDateString()
    effectiveMonth?: string;
}

export class HRDecisionDto {
    @ApiProperty({
        description: 'القرار',
        enum: DecisionType
    })
    @IsNotEmpty({ message: 'القرار مطلوب' })
    @IsEnum(DecisionType, { message: 'القرار غير صالح' })
    decision: DecisionType;

    @ApiPropertyOptional({ description: 'ملاحظات' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    notes?: string;

    @ApiPropertyOptional({
        description: 'شهر بدء الزيادة (يمكن أن يكون بأثر رجعي أو مستقبلي)',
        example: '2025-11-01'
    })
    @IsOptional()
    @IsDateString()
    effectiveMonth?: string;

    @ApiPropertyOptional({
        description: 'المرفقات',
        type: 'array',
        items: { type: 'object' }
    })
    @IsOptional()
    @IsArray()
    attachments?: any[];
}

