import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsDateString, IsOptional, IsEnum, IsInt, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// 🆕 نوع توزيع الفروقات
export enum DistributionMode {
    SINGLE = 'SINGLE',           // دفعة واحدة (الافتراضي)
    EQUAL_SPLIT = 'EQUAL_SPLIT', // توزيع بالتساوي
    CUSTOM_AMOUNTS = 'CUSTOM_AMOUNTS', // مبالغ مخصصة
}

// 🆕 قسط مخصص
export class InstallmentDto {
    @ApiProperty({ description: 'الشهر (1-12)' })
    @IsInt()
    @Min(1)
    @Max(12)
    month: number;

    @ApiProperty({ description: 'السنة' })
    @IsInt()
    @Min(2020)
    @Max(2100)
    year: number;

    @ApiProperty({ description: 'المبلغ لهذا الشهر' })
    @IsNumber()
    @Min(0)
    amount: number;
}

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

    // ===== 🆕 خيارات التقسيط =====

    @ApiPropertyOptional({
        description: 'طريقة التوزيع: SINGLE (دفعة واحدة) | EQUAL_SPLIT (بالتساوي) | CUSTOM_AMOUNTS (مخصص)',
        enum: DistributionMode,
        default: DistributionMode.SINGLE
    })
    @IsEnum(DistributionMode)
    @IsOptional()
    distributionMode?: DistributionMode;

    @ApiPropertyOptional({ description: 'شهر الصرف (1-12) - للدفعة الواحدة أو بداية التقسيط المتتالي' })
    @IsInt()
    @Min(1)
    @Max(12)
    @IsOptional()
    paymentMonth?: number;

    @ApiPropertyOptional({ description: 'سنة الصرف' })
    @IsInt()
    @Min(2020)
    @Max(2100)
    @IsOptional()
    paymentYear?: number;

    @ApiPropertyOptional({ description: 'عدد الأقساط (للتوزيع بالتساوي)' })
    @IsInt()
    @Min(2)
    @Max(24)
    @IsOptional()
    installmentCount?: number;

    @ApiPropertyOptional({
        description: 'الأقساط المخصصة (للتوزيع المخصص)',
        type: [InstallmentDto]
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => InstallmentDto)
    @IsOptional()
    installments?: InstallmentDto[];
}
