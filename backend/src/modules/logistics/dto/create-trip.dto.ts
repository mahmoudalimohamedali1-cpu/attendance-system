import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsDateString, Min, Max } from 'class-validator';

export class CreateTripDto {
    @ApiProperty({ description: 'ID السائق' })
    @IsString()
    driverId: string;

    @ApiProperty({ description: 'تاريخ الرحلة' })
    @IsDateString()
    tripDate: string;

    @ApiProperty({ description: 'وقت البداية المجدول (HH:mm)' })
    @IsString()
    scheduledStart: string;

    @ApiPropertyOptional({ description: 'المسافة بالكيلومتر' })
    @IsNumber()
    @IsOptional()
    @Min(0)
    distanceKm?: number;

    @ApiPropertyOptional({ description: 'دقائق التأخير' })
    @IsNumber()
    @IsOptional()
    @Min(0)
    delayMinutes?: number;

    @ApiPropertyOptional({ description: 'ملاحظات' })
    @IsString()
    @IsOptional()
    notes?: string;
}
