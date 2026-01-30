import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, IsArray, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { LetterType } from '@prisma/client';

export interface LetterAttachment {
  originalName: string;
  filename: string;
  path?: string;
  url: string;
  size?: number;
  mimeType?: string;
}

export class CreateLetterRequestDto {
  @ApiProperty({ description: 'نوع الخطاب', enum: LetterType })
  @IsEnum(LetterType)
  type: LetterType;

  @ApiProperty({ description: 'الملاحظات (حد أقصى 200 حرف)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'الملاحظات يجب ألا تتجاوز 200 حرف' })
  notes?: string;

  @ApiProperty({ description: 'المرفقات (حد أقصى 5 ملفات)', required: false, type: 'array' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, { message: 'الحد الأقصى للمرفقات 5 ملفات' })
  attachments?: LetterAttachment[];
}
