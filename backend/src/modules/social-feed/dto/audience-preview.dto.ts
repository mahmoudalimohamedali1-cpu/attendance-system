import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsArray,
  IsOptional,
  ValidateNested,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VisibilityType } from '@prisma/client';
import { PostTargetDto } from './create-post.dto';

/**
 * DTO لمعاينة الجمهور المستهدف قبل النشر
 */
export class AudiencePreviewDto {
  @ApiProperty({
    description: 'نوع الظهور/الرؤية',
    enum: VisibilityType,
    example: 'TARGETED',
  })
  @IsEnum(VisibilityType)
  visibilityType: VisibilityType;

  @ApiPropertyOptional({
    description: 'قواعد الاستهداف',
    type: [PostTargetDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PostTargetDto)
  targets?: PostTargetDto[];

  @ApiPropertyOptional({
    description: 'عدد المستخدمين المراد عرضهم في المعاينة',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
