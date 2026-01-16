import { IsString, IsNumber, IsOptional, IsEnum, Min, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Local enum definition - Prisma doesn't export unused enums
export enum DebtSourceType {
    PAYROLL_NEGATIVE_BALANCE = 'PAYROLL_NEGATIVE_BALANCE',
    ADVANCE_OVERPAYMENT = 'ADVANCE_OVERPAYMENT',
    LOAN = 'LOAN',
    PENALTY = 'PENALTY',
    OVERPAYMENT_CORRECTION = 'OVERPAYMENT_CORRECTION'
}

export class CreateDebtDto {
    @ApiProperty({ description: 'مبلغ الدين', example: 1500.00 })
    @IsNumber()
    @Min(0.01)
    amount: number;

    @ApiProperty({ enum: DebtSourceType, description: 'نوع مصدر الدين' })
    @IsEnum(DebtSourceType)
    sourceType: DebtSourceType;

    @ApiPropertyOptional({ description: 'معرف المصدر (payrollRunId, etc.)' })
    @IsOptional()
    @IsString()
    sourceId?: string;

    @ApiPropertyOptional({ description: 'معرف فترة الرواتب' })
    @IsOptional()
    @IsUUID()
    periodId?: string;

    @ApiPropertyOptional({ description: 'سبب الدين' })
    @IsOptional()
    @IsString()
    reason?: string;

    @ApiPropertyOptional({ description: 'ملاحظات إضافية' })
    @IsOptional()
    @IsString()
    notes?: string;
}
