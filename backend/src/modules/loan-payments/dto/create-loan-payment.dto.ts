import { IsString, IsNumber, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PaymentType {
    SALARY_DEDUCTION = 'SALARY_DEDUCTION',
    MANUAL = 'MANUAL',
    CASH = 'CASH',
}

export class CreateLoanPaymentDto {
    @ApiProperty({ description: 'معرف السلفة' })
    @IsString()
    advanceId: string;

    @ApiProperty({ description: 'مبلغ السداد' })
    @IsNumber()
    amount: number;

    @ApiProperty({ description: 'تاريخ السداد' })
    @IsDateString()
    paymentDate: string;

    @ApiProperty({ description: 'نوع السداد', enum: PaymentType, default: PaymentType.SALARY_DEDUCTION })
    @IsOptional()
    @IsEnum(PaymentType)
    paymentType?: PaymentType = PaymentType.SALARY_DEDUCTION;

    @ApiProperty({ description: 'معرف مسير الرواتب', required: false })
    @IsOptional()
    @IsString()
    payrollRunId?: string;

    @ApiProperty({ description: 'معرف قسيمة الراتب', required: false })
    @IsOptional()
    @IsString()
    payslipId?: string;

    @ApiProperty({ description: 'ملاحظات', required: false })
    @IsOptional()
    @IsString()
    notes?: string;
}
