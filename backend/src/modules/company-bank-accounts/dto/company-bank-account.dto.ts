import { IsString, IsBoolean, IsOptional, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCompanyBankAccountDto {
    @ApiProperty({ description: 'اسم البنك', example: 'البنك الأهلي السعودي' })
    @IsString()
    bankName: string;

    @ApiProperty({ description: 'رمز البنك', example: 'NCB' })
    @IsString()
    @Length(2, 10)
    bankCode: string;

    @ApiProperty({ description: 'رقم الآيبان', example: 'SA0380000000608010167519' })
    @IsString()
    @Length(24, 24, { message: 'IBAN يجب أن يكون 24 حرف' })
    @Matches(/^SA[0-9A-Z]{22}$/, { message: 'صيغة IBAN غير صحيحة' })
    iban: string;

    @ApiProperty({ description: 'اسم صاحب الحساب', example: 'شركة التقنية المحدودة' })
    @IsString()
    accountName: string;

    @ApiPropertyOptional({ description: 'رمز السويفت', example: 'NCBKSAJE' })
    @IsOptional()
    @IsString()
    swiftCode?: string;

    @ApiPropertyOptional({ description: 'هل هو الحساب الرئيسي؟', default: false })
    @IsOptional()
    @IsBoolean()
    isPrimary?: boolean;

    @ApiPropertyOptional({ description: 'رقم المنشأة في وزارة العمل' })
    @IsOptional()
    @IsString()
    molId?: string;

    @ApiPropertyOptional({ description: 'رقم المشارك في WPS' })
    @IsOptional()
    @IsString()
    wpsParticipant?: string;

    @ApiPropertyOptional({ description: 'نوع الحساب', default: 'CURRENT' })
    @IsOptional()
    @IsString()
    accountType?: string;

    @ApiPropertyOptional({ description: 'العملة', default: 'SAR' })
    @IsOptional()
    @IsString()
    currency?: string;

    @ApiPropertyOptional({ description: 'ملاحظات' })
    @IsOptional()
    @IsString()
    notes?: string;
}

export class UpdateCompanyBankAccountDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    bankName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    bankCode?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    accountName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    swiftCode?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isPrimary?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    molId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    wpsParticipant?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;
}
