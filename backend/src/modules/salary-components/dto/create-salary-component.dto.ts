import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsBoolean, IsOptional, IsNotEmpty } from 'class-validator';

enum SalaryComponentType {
    EARNING = 'EARNING',
    DEDUCTION = 'DEDUCTION',
}

enum SalaryComponentNature {
    FIXED = 'FIXED',
    VARIABLE = 'VARIABLE',
    FORMULA = 'FORMULA',
}

export class CreateSalaryComponentDto {
    @ApiProperty({ description: 'كود المكون (مثال: BASIC, HRA)' })
    @IsString()
    @IsNotEmpty()
    code: string;

    @ApiProperty({ description: 'الاسم بالعربية' })
    @IsString()
    @IsNotEmpty()
    nameAr: string;

    @ApiProperty({ description: 'الاسم بالإنجليزية', required: false })
    @IsString()
    @IsOptional()
    nameEn?: string;

    @ApiProperty({ description: 'النوع (استحقاق أو استقطاع)', enum: SalaryComponentType })
    @IsEnum(SalaryComponentType)
    type: SalaryComponentType;

    @ApiProperty({ description: 'طبيعة المكون', enum: SalaryComponentNature, default: SalaryComponentNature.FIXED })
    @IsEnum(SalaryComponentNature)
    nature: SalaryComponentNature;

    @ApiProperty({ description: 'الوصف', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'خاضع للتأمينات؟', default: false })
    @IsBoolean()
    @IsOptional()
    gosiEligible?: boolean;

    @ApiProperty({ description: 'خاضع للعمل الإضافي؟', default: false })
    @IsBoolean()
    @IsOptional()
    otEligible?: boolean;

    @ApiProperty({ description: 'المعادلة (اختياري)', required: false })
    @IsString()
    @IsOptional()
    formula?: string;
}
