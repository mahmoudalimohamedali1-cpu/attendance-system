import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsDateString, IsOptional, IsBoolean } from 'class-validator';

export class CreateSalaryAssignmentDto {
    @ApiProperty({ description: 'معرف الموظف' })
    @IsString()
    @IsNotEmpty()
    employeeId: string;

    @ApiProperty({ description: 'معرف هيكل الراتب' })
    @IsString()
    @IsNotEmpty()
    structureId: string;

    @ApiProperty({ description: 'الراتب الأساسي' })
    @IsNumber()
    @IsNotEmpty()
    baseSalary: number;

    @ApiProperty({ description: 'تاريخ النفاذ' })
    @IsDateString()
    @IsNotEmpty()
    effectiveDate: string;

    @ApiProperty({ description: 'تاريخ الانتهاء', required: false })
    @IsDateString()
    @IsOptional()
    endDate?: string;

    @ApiProperty({ description: 'نشط؟', default: true })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
