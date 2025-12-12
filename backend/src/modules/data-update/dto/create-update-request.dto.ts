import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum, IsNumber, Min, Max, IsArray } from 'class-validator';

export enum UpdateRequestType {
  FACE_UPDATE = 'FACE_UPDATE',
  DEVICE_UPDATE = 'DEVICE_UPDATE',
  BOTH = 'BOTH',
  DEVICE_CHANGE = 'DEVICE_CHANGE',
}

export enum DevicePlatform {
  ANDROID = 'ANDROID',
  IOS = 'IOS',
  WEB = 'WEB',
  UNKNOWN = 'UNKNOWN',
}

export class CreateUpdateRequestDto {
  @ApiProperty({
    description: 'نوع التحديث المطلوب',
    enum: UpdateRequestType,
    example: UpdateRequestType.BOTH,
  })
  @IsNotEmpty({ message: 'نوع التحديث مطلوب' })
  @IsEnum(UpdateRequestType)
  requestType: UpdateRequestType;

  @ApiPropertyOptional({
    description: 'سبب طلب التحديث',
    example: 'تغيير الهاتف الجوال',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  // ============ بيانات الوجه ============

  @ApiPropertyOptional({
    description: 'بيانات الوجه الجديدة (Face Embedding)',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  newFaceEmbedding?: number[];

  @ApiPropertyOptional({
    description: 'صورة الوجه الجديدة (Base64)',
  })
  @IsOptional()
  @IsString()
  newFaceImage?: string;

  @ApiPropertyOptional({
    description: 'جودة صورة الوجه',
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  faceImageQuality?: number;

  // ============ بيانات الجهاز ============

  @ApiPropertyOptional({
    description: 'معرف الجهاز الجديد',
    example: 'new-device-001',
  })
  @IsOptional()
  @IsString()
  newDeviceId?: string;

  @ApiPropertyOptional({
    description: 'بصمة الجهاز الجديد',
  })
  @IsOptional()
  @IsString()
  newDeviceFingerprint?: string;

  @ApiPropertyOptional({
    description: 'اسم الجهاز الجديد',
    example: 'Samsung Galaxy S24',
  })
  @IsOptional()
  @IsString()
  newDeviceName?: string;

  @ApiPropertyOptional({
    description: 'موديل الجهاز الجديد',
    example: 'SM-S921B',
  })
  @IsOptional()
  @IsString()
  newDeviceModel?: string;

  @ApiPropertyOptional({
    description: 'العلامة التجارية للجهاز الجديد',
    example: 'Samsung',
  })
  @IsOptional()
  @IsString()
  newDeviceBrand?: string;

  @ApiPropertyOptional({
    description: 'نوع منصة الجهاز الجديد',
    enum: DevicePlatform,
  })
  @IsOptional()
  @IsEnum(DevicePlatform)
  newDevicePlatform?: DevicePlatform;

  @ApiPropertyOptional({
    description: 'إصدار نظام التشغيل',
    example: 'Android 14',
  })
  @IsOptional()
  @IsString()
  newDeviceOsVersion?: string;

  @ApiPropertyOptional({
    description: 'إصدار التطبيق',
    example: '1.0.0',
  })
  @IsOptional()
  @IsString()
  newDeviceAppVersion?: string;
}

