import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsBoolean, IsString, Min, Max, IsNotEmpty } from 'class-validator';

export class CheckInDto {
  @ApiProperty({
    description: 'خط العرض',
    example: 24.7136,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    description: 'خط الطول',
    example: 46.6753,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({
    description: 'هل الموقع وهمي (Mock Location)',
    example: false,
  })
  @IsBoolean()
  isMockLocation: boolean;

  @ApiPropertyOptional({
    description: 'معلومات الجهاز',
    example: 'iPhone 14 Pro - iOS 17.2',
  })
  @IsOptional()
  @IsString()
  deviceInfo?: string;

  @ApiPropertyOptional({
    description: 'دقة GPS بالمتر',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  accuracy?: number;

  // ============ بيانات التعرف على الوجه ============

  @ApiPropertyOptional({
    description: 'Face Embedding للتحقق من الوجه',
    example: '[0.123, -0.456, 0.789, ...]',
  })
  @IsOptional()
  faceEmbedding?: string | number[];

  @ApiPropertyOptional({
    description: 'صورة الوجه بصيغة Base64',
  })
  @IsOptional()
  @IsString()
  faceImage?: string;

  @ApiPropertyOptional({
    description: 'نسبة الثقة من التحقق المحلي',
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  faceConfidence?: number;

  @ApiPropertyOptional({
    description: 'هل تم التحقق من الوجه محلياً',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  faceVerifiedLocally?: boolean;

  // ============ بيانات الجهاز ============

  @ApiPropertyOptional({
    description: 'معرف الجهاز الفريد',
    example: 'a1b2c3d4e5f6',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({
    description: 'بصمة الجهاز',
  })
  @IsOptional()
  @IsString()
  deviceFingerprint?: string;
}

