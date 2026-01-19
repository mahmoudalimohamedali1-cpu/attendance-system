import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsArray,
  IsUUID,
  ValidateNested,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PostType, VisibilityType, TargetType } from '@prisma/client';

// DTO لقواعد الاستهداف
export class PostTargetDto {
  @ApiProperty({
    description: 'نوع الاستهداف',
    enum: TargetType,
    example: 'DEPARTMENT',
  })
  @IsEnum(TargetType)
  targetType: TargetType;

  @ApiProperty({
    description: 'قيمة الاستهداف (معرف الفرع، القسم، المستخدم، إلخ)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  targetValue: string;

  @ApiPropertyOptional({
    description: 'استثناء بدلاً من شمول',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isExclusion?: boolean;
}

// DTO لبيانات المرفق
export class PostAttachmentDto {
  @ApiProperty({ description: 'اسم الملف الأصلي' })
  @IsString()
  fileName: string;

  @ApiProperty({ description: 'رابط الملف المخزن' })
  @IsString()
  fileUrl: string;

  @ApiProperty({
    description: 'نوع الملف',
    example: 'IMAGE',
    enum: ['IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO', 'OTHER'],
  })
  @IsString()
  fileType: string;

  @ApiProperty({ description: 'نوع MIME للملف', example: 'image/png' })
  @IsString()
  mimeType: string;

  @ApiProperty({ description: 'حجم الملف بالبايت' })
  fileSize: number;

  @ApiPropertyOptional({ description: 'رابط الصورة المصغرة' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'نص بديل للصورة' })
  @IsOptional()
  @IsString()
  altText?: string;

  @ApiPropertyOptional({ description: 'وصف المرفق' })
  @IsOptional()
  @IsString()
  description?: string;
}

// DTO لبيانات الإشارة (@mention)
export class PostMentionDto {
  @ApiProperty({
    description: 'نوع الإشارة',
    enum: ['USER', 'TEAM', 'DEPARTMENT'],
  })
  @IsString()
  mentionType: 'USER' | 'TEAM' | 'DEPARTMENT';

  @ApiProperty({
    description: 'معرف المستخدم، الفريق، أو القسم',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  mentionId: string;

  @ApiPropertyOptional({ description: 'موقع بداية الإشارة في المحتوى' })
  @IsOptional()
  startIndex?: number;

  @ApiPropertyOptional({ description: 'موقع نهاية الإشارة في المحتوى' })
  @IsOptional()
  endIndex?: number;
}

export class CreatePostDto {
  @ApiPropertyOptional({
    description: 'نوع المنشور',
    enum: PostType,
    default: 'POST',
  })
  @IsOptional()
  @IsEnum(PostType)
  type?: PostType;

  @ApiPropertyOptional({
    description: 'عنوان المنشور (اختياري)',
    example: 'إعلان هام من الإدارة',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional({
    description: 'عنوان المنشور بالإنجليزية',
    example: 'Important Announcement from Management',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  titleEn?: string;

  @ApiProperty({
    description: 'محتوى المنشور',
    example: 'نود إعلامكم بأن هناك تحديثات جديدة في سياسة الإجازات...',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content: string;

  @ApiPropertyOptional({
    description: 'محتوى المنشور بالإنجليزية',
    example: 'We would like to inform you about new updates to the leave policy...',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  contentEn?: string;

  @ApiPropertyOptional({
    description: 'نوع الظهور/الرؤية',
    enum: VisibilityType,
    default: 'PUBLIC',
  })
  @IsOptional()
  @IsEnum(VisibilityType)
  visibilityType?: VisibilityType;

  @ApiPropertyOptional({
    description: 'هل المنشور مثبت',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({
    description: 'تاريخ انتهاء التثبيت',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  pinnedUntil?: string;

  @ApiPropertyOptional({
    description: 'تاريخ النشر المجدول',
    example: '2024-06-01T09:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({
    description: 'تاريخ انتهاء صلاحية المنشور',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'يتطلب تأكيد القراءة',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  requireAcknowledge?: boolean;

  @ApiPropertyOptional({
    description: 'إخفاء المنشور بعد تأكيد القراءة',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hideAfterAcknowledge?: boolean;

  @ApiPropertyOptional({
    description: 'السماح بالتعليقات',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;

  @ApiPropertyOptional({
    description: 'أولوية المنشور (للمنشورات المروجة)',
    default: 0,
  })
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({
    description: 'الحد الأقصى لعدد الظهورات',
  })
  @IsOptional()
  maxImpressions?: number;

  @ApiPropertyOptional({
    description: 'تاريخ انتهاء الترويج',
  })
  @IsOptional()
  @IsDateString()
  promotedUntil?: string;

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
    description: 'المرفقات',
    type: [PostAttachmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PostAttachmentDto)
  attachments?: PostAttachmentDto[];

  @ApiPropertyOptional({
    description: 'الإشارات (@mentions)',
    type: [PostMentionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PostMentionDto)
  mentions?: PostMentionDto[];
}
