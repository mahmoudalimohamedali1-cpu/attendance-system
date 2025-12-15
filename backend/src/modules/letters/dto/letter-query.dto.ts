import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { LetterType, LetterStatus } from '@prisma/client';

export class LetterQueryDto {
  @ApiProperty({ description: 'حالة الطلب', enum: LetterStatus, required: false })
  @IsOptional()
  @IsEnum(LetterStatus)
  status?: LetterStatus;

  @ApiProperty({ description: 'نوع الخطاب', enum: LetterType, required: false })
  @IsOptional()
  @IsEnum(LetterType)
  type?: LetterType;

  @ApiProperty({ description: 'رقم الصفحة', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: 'عدد العناصر في الصفحة', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

