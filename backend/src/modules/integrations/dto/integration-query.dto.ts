import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsBoolean, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { IntegrationCategory } from './create-integration.dto';

export enum IntegrationStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ERROR = 'ERROR',
  PENDING = 'PENDING',
}

export class IntegrationQueryDto {
  @ApiProperty({ description: 'البحث عن تكامل', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ enum: IntegrationCategory, description: 'فئة التكامل', required: false })
  @IsOptional()
  @IsEnum(IntegrationCategory)
  category?: IntegrationCategory;

  @ApiProperty({ enum: IntegrationStatus, description: 'حالة التكامل', required: false })
  @IsOptional()
  @IsEnum(IntegrationStatus)
  status?: IntegrationStatus;

  @ApiProperty({ description: 'التكاملات المفعلة فقط', required: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  enabled?: boolean;

  @ApiProperty({ description: 'رقم الصفحة', default: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: 'عدد العناصر في الصفحة', default: 30, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 30;
}
