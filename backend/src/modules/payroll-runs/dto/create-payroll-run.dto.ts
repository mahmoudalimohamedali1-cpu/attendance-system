import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

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
}
