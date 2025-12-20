import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, IsArray } from 'class-validator';

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
        description: 'المرفقات',
        type: 'array',
        items: { type: 'object' }
    })
    @IsOptional()
    @IsArray()
    attachments?: any[];
}
