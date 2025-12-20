import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min, IsDateString, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export enum RaiseTypeDto {
    SALARY_INCREASE = 'SALARY_INCREASE',
    ANNUAL_LEAVE_BONUS = 'ANNUAL_LEAVE_BONUS',
    BUSINESS_TRIP = 'BUSINESS_TRIP',
    BONUS = 'BONUS',
    ALLOWANCE = 'ALLOWANCE',
    OTHER = 'OTHER',
}

export class CreateRaiseRequestDto {
    @ApiProperty({
        description: 'نوع الطلب',
        enum: RaiseTypeDto,
        example: RaiseTypeDto.SALARY_INCREASE
    })
    @IsNotEmpty({ message: 'نوع الطلب مطلوب' })
    @IsEnum(RaiseTypeDto, { message: 'نوع الطلب غير صالح' })
    type: RaiseTypeDto;

    @ApiProperty({
        description: 'المبلغ المطلوب',
        example: 500
    })
    @IsNotEmpty({ message: 'المبلغ مطلوب' })
    @IsNumber({}, { message: 'المبلغ يجب أن يكون رقماً' })
    @Min(0, { message: 'المبلغ يجب أن يكون موجباً' })
    @Type(() => Number)
    amount: number;

    @ApiProperty({
        description: 'الشهر المطلوب للزيادة',
        example: '2025-01-01'
    })
    @IsNotEmpty({ message: 'الشهر المطلوب مطلوب' })
    @IsDateString({}, { message: 'تاريخ الشهر غير صالح' })
    effectiveMonth: string;

    @ApiPropertyOptional({
        description: 'ملاحظات إضافية',
        maxLength: 200
    })
    @IsOptional()
    @IsString({ message: 'الملاحظات يجب أن تكون نصاً' })
    @MaxLength(200, { message: 'الملاحظات يجب ألا تتجاوز 200 حرف' })
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
