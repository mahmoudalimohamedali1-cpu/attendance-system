import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional, Matches } from 'class-validator';

export class CreateBankAccountDto {
    @ApiProperty({ description: 'معرف الموظف' })
    @IsString()
    @IsNotEmpty()
    userId: string;

    @ApiProperty({ description: 'رقم الـ IBAN (مثال: SA...)', example: 'SA1234567890123456789012' })
    @IsString()
    @IsNotEmpty()
    @Matches(/^SA\d{22}$/, { message: 'رقم الـ IBAN السعودي غير صحيح (يجب أن يبدأ بـ SA ويتبعه 22 رقماً)' })
    iban: string;

    @ApiProperty({ description: 'اسم البنك' })
    @IsString()
    @IsNotEmpty()
    bankName: string;

    @ApiProperty({ description: 'كود البنك (اختياري)' })
    @IsString()
    @IsOptional()
    bankCode?: string;

    @ApiProperty({ description: 'هل هو الحساب الرئيسي؟', default: true })
    @IsBoolean()
    @IsOptional()
    isPrimary?: boolean;
}
