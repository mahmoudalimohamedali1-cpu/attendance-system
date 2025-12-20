import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max, IsDateString, IsNotEmpty } from 'class-validator';

export class CreatePayrollPeriodDto {
    @ApiProperty({ description: 'الشهر (1-12)', example: 12 })
    @IsInt()
    @Min(1)
    @Max(12)
    @IsNotEmpty()
    month: number;

    @ApiProperty({ description: 'السنة', example: 2023 })
    @IsInt()
    @Min(2020)
    @IsNotEmpty()
    year: number;

    @ApiProperty({ description: 'تاريخ بداية الفترة' })
    @IsDateString()
    @IsNotEmpty()
    startDate: string;

    @ApiProperty({ description: 'تاريخ نهاية الفترة' })
    @IsDateString()
    @IsNotEmpty()
    endDate: string;
}
