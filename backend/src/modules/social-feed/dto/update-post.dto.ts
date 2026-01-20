import { ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
} from 'class-validator';
import { PostStatus } from '@prisma/client';
import { CreatePostDto } from './create-post.dto';

export class UpdatePostDto extends PartialType(
  OmitType(CreatePostDto, ['type'] as const),
) {
  @ApiPropertyOptional({
    description: 'حالة المنشور',
    enum: PostStatus,
  })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;
}
