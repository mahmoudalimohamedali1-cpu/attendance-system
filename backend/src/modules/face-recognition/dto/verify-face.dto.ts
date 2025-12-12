import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsNumber, IsString, IsBoolean, Min, Max, IsIn } from 'class-validator';

export class VerifyFaceDto {
  @ApiProperty({
    description: 'Face Embedding - مصفوفة من الأرقام تمثل ملامح الوجه الحالية',
    example: '[0.123, -0.456, 0.789, ...]',
  })
  @IsNotEmpty({ message: 'بيانات الوجه مطلوبة' })
  faceEmbedding: string | number[];

  @ApiPropertyOptional({
    description: 'صورة الوجه بصيغة Base64 (اختياري)',
  })
  @IsOptional()
  @IsString()
  faceImage?: string;

  @ApiPropertyOptional({
    description: 'نوع التحقق',
    enum: ['CHECK_IN', 'CHECK_OUT', 'VERIFICATION'],
    default: 'VERIFICATION',
  })
  @IsOptional()
  @IsString()
  @IsIn(['CHECK_IN', 'CHECK_OUT', 'VERIFICATION'])
  verificationType?: 'CHECK_IN' | 'CHECK_OUT' | 'VERIFICATION';

  @ApiPropertyOptional({
    description: 'حد التطابق المطلوب (0-1)',
    example: 0.6,
    minimum: 0,
    maximum: 1,
    default: 0.6,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  threshold?: number;

  @ApiPropertyOptional({
    description: 'معلومات الجهاز',
  })
  @IsOptional()
  @IsString()
  deviceInfo?: string;

  @ApiPropertyOptional({
    description: 'حفظ صورة المحاولة للتدقيق',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  saveAttemptImage?: boolean;
}

