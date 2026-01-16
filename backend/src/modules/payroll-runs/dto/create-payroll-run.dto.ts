import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * تعديل على راتب موظف (مكافأة أو خصم)
 */
export class PayrollAdjustmentItemDto {
    @ApiProperty({ description: 'نوع التعديل', enum: ['bonus', 'deduction'] })
    @IsEnum(['bonus', 'deduction'])
    type: 'bonus' | 'deduction';

    @ApiProperty({ description: 'المبلغ' })
    @IsNumber()
    amount: number;

    @ApiProperty({ description: 'السبب' })
    @IsString()
    reason: string;
}

export class PayrollAdjustmentDto {
    @ApiProperty({ description: 'معرف الموظف' })
    @IsString()
    employeeId: string;

    @ApiProperty({ description: 'قائمة التعديلات', type: [PayrollAdjustmentItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PayrollAdjustmentItemDto)
    items: PayrollAdjustmentItemDto[];
}

export class CreatePayrollRunDto {
    @ApiProperty({ description: 'معرف فترة الرواتب' })
    @IsString()
    @IsNotEmpty()
    periodId: string;

    @ApiProperty({ description: 'فلترة حسب الفرع', required: false })
    @IsString()
    @IsOptional()
    branchId?: string;

    @ApiProperty({ description: 'قائمة بمعرفات الموظفين (اختياري)', required: false })
    @IsArray()
    @IsOptional()
    employeeIds?: string[];

    @ApiProperty({ description: 'قائمة بمعرفات الموظفين المستثنين', required: false })
    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    excludedEmployeeIds?: string[];

    @ApiProperty({ description: 'تعديلات على رواتب الموظفين (مكافآت/خصومات)', required: false, type: [PayrollAdjustmentDto] })
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => PayrollAdjustmentDto)
    adjustments?: PayrollAdjustmentDto[];
}
