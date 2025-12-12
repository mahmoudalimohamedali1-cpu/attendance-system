import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber, IsIn } from 'class-validator';

export class VerifyDeviceDto {
  @ApiProperty({
    description: 'معرف الجهاز الفريد',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsNotEmpty({ message: 'معرف الجهاز مطلوب' })
  @IsString()
  deviceId: string;

  @ApiPropertyOptional({
    description: 'بصمة الجهاز للتحقق',
  })
  @IsOptional()
  @IsString()
  deviceFingerprint?: string;

  @ApiPropertyOptional({
    description: 'موديل الجهاز',
  })
  @IsOptional()
  @IsString()
  deviceModel?: string;

  @ApiPropertyOptional({
    description: 'نوع الإجراء',
    enum: ['CHECK_IN', 'CHECK_OUT', 'LOGIN'],
    default: 'CHECK_IN',
  })
  @IsOptional()
  @IsString()
  @IsIn(['CHECK_IN', 'CHECK_OUT', 'LOGIN'])
  actionType?: string;

  @ApiPropertyOptional({
    description: 'إصدار التطبيق',
  })
  @IsOptional()
  @IsString()
  appVersion?: string;

  @ApiPropertyOptional({
    description: 'عنوان IP',
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'خط العرض',
  })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'خط الطول',
  })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}

