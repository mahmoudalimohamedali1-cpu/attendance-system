import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class ValidateGosiDto {
    @ApiPropertyOptional({ description: 'تاريخ بداية فترة الرواتب للتحقق' })
    @IsDateString()
    @IsOptional()
    periodStartDate?: string;

    @ApiPropertyOptional({ description: 'الوضع الصارم - أي تحذير يمنع المتابعة', default: false })
    @IsBoolean()
    @IsOptional()
    strictMode?: boolean;

    @ApiPropertyOptional({ description: 'السماح بإعدادات منتهية الصلاحية', default: false })
    @IsBoolean()
    @IsOptional()
    allowExpired?: boolean;
}

export class CreateStandardGosiConfigDto {
    @ApiProperty({ description: 'تاريخ بداية السريان' })
    @IsDateString()
    effectiveDate: string;

    @ApiPropertyOptional({ description: 'تاريخ نهاية السريان (اختياري)' })
    @IsDateString()
    @IsOptional()
    endDate?: string;

    @ApiPropertyOptional({ description: 'ملاحظات إضافية' })
    @IsOptional()
    notes?: string;
}
