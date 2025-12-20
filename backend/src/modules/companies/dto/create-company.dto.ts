import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsUrl, IsNotEmpty } from 'class-validator';

export class CreateCompanyDto {
    @ApiProperty({ description: 'اسم الشركة' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ description: 'English Name', required: false })
    @IsString()
    @IsOptional()
    nameEn?: string;

    @ApiProperty({ description: 'رقم السجل التجاري', required: false })
    @IsString()
    @IsOptional()
    crNumber?: string;

    @ApiProperty({ description: 'الرقم الضريبي', required: false })
    @IsString()
    @IsOptional()
    taxId?: string;

    @ApiProperty({ description: 'Logo URL', required: false })
    @IsString()
    @IsOptional()
    logo?: string;

    @ApiProperty({ description: 'العنوان', required: false })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiProperty({ description: 'رقم الهاتف', required: false })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiProperty({ description: 'البريد الإلكتروني', required: false })
    @IsEmail()
    @IsOptional()
    email?: string;

    @ApiProperty({ description: 'الموقع الإلكتروني', required: false })
    @IsUrl()
    @IsOptional()
    website?: string;
}
