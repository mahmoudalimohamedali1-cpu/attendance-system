import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsDateString, IsEnum, Min, Max } from 'class-validator';

export enum DeliveryStatus {
    PENDING = 'PENDING',
    IN_TRANSIT = 'IN_TRANSIT',
    DELIVERED = 'DELIVERED',
    FAILED = 'FAILED',
    RETURNED = 'RETURNED',
}

export class CreateDeliveryDto {
    @ApiProperty({ description: 'ID السائق' })
    @IsString()
    driverId: string;

    @ApiProperty({ description: 'تاريخ التوصيل' })
    @IsDateString()
    deliveryDate: string;

    @ApiPropertyOptional({ description: 'دقائق مبكرة عن الموعد' })
    @IsNumber()
    @IsOptional()
    @Min(0)
    minutesEarly?: number;

    @ApiPropertyOptional({ description: 'دقائق تأخير عن الموعد' })
    @IsNumber()
    @IsOptional()
    @Min(0)
    minutesLate?: number;

    @ApiPropertyOptional({ description: 'تقييم العميل (1-5)' })
    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(5)
    customerRating?: number;

    @ApiPropertyOptional({ description: 'حالة التوصيل', enum: DeliveryStatus })
    @IsEnum(DeliveryStatus)
    @IsOptional()
    status?: DeliveryStatus;

    @ApiPropertyOptional({ description: 'عنوان التوصيل' })
    @IsString()
    @IsOptional()
    deliveryAddress?: string;

    @ApiPropertyOptional({ description: 'ملاحظات' })
    @IsString()
    @IsOptional()
    notes?: string;
}
