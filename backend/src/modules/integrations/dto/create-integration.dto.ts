import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNotEmpty, IsUrl, IsBoolean } from 'class-validator';

export enum IntegrationCategory {
  ACCOUNTING = 'ACCOUNTING',
  ERP = 'ERP',
  COMMUNICATION = 'COMMUNICATION',
  HR = 'HR',
  PAYROLL = 'PAYROLL',
  BANKING = 'BANKING',
  OTHER = 'OTHER',
}

export class CreateIntegrationDto {
  @ApiProperty({ description: 'اسم التكامل' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'English Name', required: false })
  @IsString()
  @IsOptional()
  nameEn?: string;

  @ApiProperty({ description: 'معرف فريد للتكامل' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ description: 'وصف التكامل', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: IntegrationCategory, description: 'فئة التكامل' })
  @IsEnum(IntegrationCategory)
  category: IntegrationCategory;

  @ApiProperty({ description: 'رابط الشعار', required: false })
  @IsUrl()
  @IsOptional()
  logo?: string;

  @ApiProperty({ description: 'الإصدار', default: '1.0.0', required: false })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiProperty({ description: 'تفعيل التكامل', default: false, required: false })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiProperty({ description: 'اسم المطور', required: false })
  @IsString()
  @IsOptional()
  developerName?: string;

  @ApiProperty({ description: 'بريد المطور الإلكتروني', required: false })
  @IsString()
  @IsOptional()
  developerEmail?: string;

  @ApiProperty({ description: 'رابط الموقع', required: false })
  @IsUrl()
  @IsOptional()
  websiteUrl?: string;

  @ApiProperty({ description: 'رابط التوثيق', required: false })
  @IsUrl()
  @IsOptional()
  documentationUrl?: string;

  @ApiProperty({ description: 'رابط الدعم', required: false })
  @IsUrl()
  @IsOptional()
  supportUrl?: string;
}
