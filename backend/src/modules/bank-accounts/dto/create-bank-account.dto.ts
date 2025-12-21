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
    iban: string;

    @ApiProperty({ description: 'اسم صاحب الحساب (كما هو في البنك - مطلوب لـ WPS)' })
    @IsString()
    @IsOptional()
    accountHolderName?: string;

    @ApiProperty({ description: 'اسم البنك' })
    @IsString()
    @IsNotEmpty()
    bankName: string;

    @ApiProperty({ description: 'كود البنك (مثل SABB, RJHI)', required: false })
    @IsString()
    @IsOptional()
    bankCode?: string;

    @ApiProperty({ description: 'رمز SWIFT للتحويلات الدولية', required: false })
    @IsString()
    @IsOptional()
    swiftCode?: string;

    @ApiProperty({ description: 'هل هو الحساب الرئيسي؟', default: true })
    @IsBoolean()
    @IsOptional()
    isPrimary?: boolean;
}

