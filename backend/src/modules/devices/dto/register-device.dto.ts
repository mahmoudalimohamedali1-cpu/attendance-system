import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';

export enum DevicePlatform {
  ANDROID = 'ANDROID',
  IOS = 'IOS',
  WEB = 'WEB',
  UNKNOWN = 'UNKNOWN',
}

export class RegisterDeviceDto {
  @ApiProperty({
    description: 'معرف الجهاز الفريد',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsNotEmpty({ message: 'معرف الجهاز مطلوب' })
  @IsString()
  deviceId: string;

  @ApiPropertyOptional({
    description: 'اسم الجهاز',
    example: 'iPhone 14 Pro',
  })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({
    description: 'موديل الجهاز',
    example: 'iPhone14,3',
  })
  @IsOptional()
  @IsString()
  deviceModel?: string;

  @ApiPropertyOptional({
    description: 'العلامة التجارية',
    example: 'Apple',
  })
  @IsOptional()
  @IsString()
  deviceBrand?: string;

  @ApiPropertyOptional({
    description: 'نوع المنصة',
    enum: DevicePlatform,
    example: DevicePlatform.IOS,
  })
  @IsOptional()
  @IsEnum(DevicePlatform)
  platform?: DevicePlatform;

  @ApiPropertyOptional({
    description: 'إصدار نظام التشغيل',
    example: 'iOS 17.2',
  })
  @IsOptional()
  @IsString()
  osVersion?: string;

  @ApiPropertyOptional({
    description: 'إصدار التطبيق',
    example: '1.0.0',
  })
  @IsOptional()
  @IsString()
  appVersion?: string;

  @ApiPropertyOptional({
    description: 'بصمة الجهاز',
  })
  @IsOptional()
  @IsString()
  deviceFingerprint?: string;
}

