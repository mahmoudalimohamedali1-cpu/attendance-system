import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';

export class CreateInventoryCountDto {
    @ApiProperty({ description: 'ID الموظف القائم بالجرد' })
    @IsString()
    conductedBy: string;

    @ApiProperty({ description: 'تاريخ الجرد' })
    @IsDateString()
    countDate: string;

    @ApiProperty({ description: 'العدد المتوقع' })
    @IsNumber()
    @Min(0)
    expectedItems: number;

    @ApiProperty({ description: 'العدد الفعلي' })
    @IsNumber()
    @Min(0)
    actualItems: number;

    @ApiPropertyOptional({ description: 'قيمة التالف' })
    @IsNumber()
    @IsOptional()
    @Min(0)
    damageValue?: number;

    @ApiPropertyOptional({ description: 'سبب التلف' })
    @IsString()
    @IsOptional()
    damageReason?: string;

    @ApiPropertyOptional({ description: 'ملاحظات' })
    @IsString()
    @IsOptional()
    notes?: string;
}
