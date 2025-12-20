import { IsEnum, IsNumber, IsString, IsOptional, IsDate, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum AdvanceType {
    BANK_TRANSFER = 'BANK_TRANSFER',
    CASH = 'CASH',
}

export class CreateAdvanceRequestDto {
    @ApiProperty({ enum: AdvanceType, description: 'نوع السلفة' })
    @IsEnum(AdvanceType)
    type: AdvanceType;

    @ApiProperty({ description: 'المبلغ المطلوب' })
    @IsNumber()
    amount: number;

    @ApiProperty({ description: 'تاريخ بداية السداد' })
    @Type(() => Date)
    @IsDate()
    startDate: Date;

    @ApiProperty({ description: 'تاريخ نهاية السداد' })
    @Type(() => Date)
    @IsDate()
    endDate: Date;

    @ApiProperty({ description: 'الفترة بالشهور' })
    @IsNumber()
    periodMonths: number;

    @ApiProperty({ description: 'الاستقطاع الشهري المقترح' })
    @IsNumber()
    monthlyDeduction: number;

    @ApiProperty({ description: 'ملاحظات', required: false })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiProperty({ description: 'مرفقات', required: false })
    @IsOptional()
    @IsArray()
    attachments?: any[];
}

export class ManagerDecisionDto {
    @ApiProperty({ description: 'القرار: APPROVED أو REJECTED' })
    @IsString()
    decision: 'APPROVED' | 'REJECTED';

    @ApiProperty({ description: 'ملاحظات', required: false })
    @IsOptional()
    @IsString()
    notes?: string;
}

export class HrDecisionDto {
    @ApiProperty({ description: 'القرار: APPROVED أو REJECTED' })
    @IsString()
    decision: 'APPROVED' | 'REJECTED';

    @ApiProperty({ description: 'المبلغ المعتمد (قد يختلف عن المطلوب)', required: false })
    @IsOptional()
    @IsNumber()
    approvedAmount?: number;

    @ApiProperty({ description: 'الاستقطاع الشهري المعتمد', required: false })
    @IsOptional()
    @IsNumber()
    approvedMonthlyDeduction?: number;

    @ApiProperty({ description: 'ملاحظات', required: false })
    @IsOptional()
    @IsString()
    notes?: string;
}
