import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsObject } from 'class-validator';

export class ConfigureIntegrationDto {
  @ApiProperty({ description: 'مفتاح API', required: false })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiProperty({ description: 'رمز API السري', required: false })
  @IsString()
  @IsOptional()
  apiSecret?: string;

  @ApiProperty({ description: 'رابط Webhook', required: false })
  @IsString()
  @IsOptional()
  webhookUrl?: string;

  @ApiProperty({ description: 'إعدادات إضافية مخصصة', required: false })
  @IsObject()
  @IsOptional()
  configData?: Record<string, any>;

  @ApiProperty({ description: 'تفعيل المزامنة', default: false, required: false })
  @IsBoolean()
  @IsOptional()
  syncEnabled?: boolean;

  @ApiProperty({ description: 'فترة المزامنة بالدقائق', required: false })
  @IsNumber()
  @IsOptional()
  syncInterval?: number;
}
