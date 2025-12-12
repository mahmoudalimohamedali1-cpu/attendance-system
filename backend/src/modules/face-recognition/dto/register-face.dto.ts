import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsNumber, IsString, Min, Max } from 'class-validator';

export class RegisterFaceDto {
  @ApiProperty({
    description: 'Face Embedding - مصفوفة من الأرقام تمثل ملامح الوجه (JSON string أو مصفوفة)',
    example: '[0.123, -0.456, 0.789, ...]',
  })
  @IsNotEmpty({ message: 'بيانات الوجه مطلوبة' })
  faceEmbedding: string | number[];

  @ApiPropertyOptional({
    description: 'صورة الوجه بصيغة Base64 (اختياري)',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
  })
  @IsOptional()
  @IsString()
  faceImage?: string;

  @ApiPropertyOptional({
    description: 'نسبة الثقة في التسجيل (0-1)',
    example: 0.95,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @ApiPropertyOptional({
    description: 'معلومات الجهاز',
    example: 'iPhone 14 Pro - iOS 17.0',
  })
  @IsOptional()
  @IsString()
  deviceInfo?: string;
}

