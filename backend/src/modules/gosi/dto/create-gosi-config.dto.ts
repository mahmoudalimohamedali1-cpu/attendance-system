import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsBoolean, IsOptional, Max, Min } from 'class-validator';

export class CreateGosiConfigDto {
    @ApiProperty({ description: 'نسبة الموظف (%)', example: 9.00 })
    @IsNumber()
    @Min(0)
    @Max(100)
    employeeRate: number;

    @ApiProperty({ description: 'نسبة الشركة (%)', example: 9.00 })
    @IsNumber()
    @Min(0)
    @Max(100)
    employerRate: number;

    @ApiProperty({ description: 'نسبة ساند (%)', example: 0.75 })
    @IsNumber()
    @Min(0)
    @Max(100)
    sanedRate: number;

    @ApiProperty({ description: 'نسبة الأخطار المهنية (%)', example: 2.00 })
    @IsNumber()
    @Min(0)
    @Max(100)
    hazardRate: number;

    @ApiProperty({ description: 'الحد الأقصى للراتب الخاضع للتأمينات', example: 45000 })
    @IsNumber()
    @Min(0)
    maxCapAmount: number;

    @ApiProperty({ description: 'هل ينطبق على السعوديين فقط؟', default: true })
    @IsBoolean()
    @IsOptional()
    isSaudiOnly?: boolean;

    @ApiProperty({ description: 'هل الإعداد مفعل؟', default: true })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
