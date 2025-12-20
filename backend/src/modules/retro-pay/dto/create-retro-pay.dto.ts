import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsDateString, IsOptional, IsEnum } from 'class-validator';

export class CreateRetroPayDto {
    @ApiProperty({ description: 'معرف الموظف' })
    @IsString()
    employeeId: string;

    @ApiProperty({ description: 'سبب الفرق (زيادة راتب، تصحيح خطأ، إلخ)' })
    @IsString()
    reason: string;

    @ApiProperty({ description: 'تاريخ بداية الفرق' })
    @IsDateString()
    effectiveFrom: string;

    @ApiProperty({ description: 'تاريخ نهاية الفرق' })
    @IsDateString()
    effectiveTo: string;

    @ApiProperty({ description: 'المبلغ القديم (الراتب السابق)' })
    @IsNumber()
    oldAmount: number;

    @ApiProperty({ description: 'المبلغ الجديد (الراتب المحدث)' })
    @IsNumber()
    newAmount: number;

    @ApiPropertyOptional({ description: 'ملاحظات' })
    @IsString()
    @IsOptional()
    notes?: string;
}
