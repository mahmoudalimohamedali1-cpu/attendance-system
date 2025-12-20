import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

class SalaryStructureLineDto {
    @ApiProperty({ description: 'معرف المكون' })
    @IsString()
    componentId: string;

    @ApiProperty({ description: 'المبلغ', default: 0 })
    @IsNumber()
    @Min(0)
    amount: number;

    @ApiProperty({ description: 'النسبة (إن وجدت)', required: false })
    @IsOptional()
    @IsNumber()
    @Min(0)
    percentage?: number;

    @ApiProperty({ description: 'الأولوية', default: 0 })
    @IsNumber()
    @IsOptional()
    priority?: number;
}

export class CreateSalaryStructureDto {
    @ApiProperty({ description: 'اسم الهيكل' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'الوصف', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'نشط؟', default: true })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @ApiProperty({ description: 'مكونات الهيكل', type: [SalaryStructureLineDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SalaryStructureLineDto)
    lines: SalaryStructureLineDto[];
}
