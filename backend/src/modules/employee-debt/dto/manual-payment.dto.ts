import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ManualPaymentDto {
    @ApiProperty({ description: 'مبلغ السداد', example: 500.00 })
    @IsNumber()
    @Min(0.01)
    amount: number;

    @ApiPropertyOptional({ description: 'وصف العملية' })
    @IsOptional()
    @IsString()
    description?: string;
}
