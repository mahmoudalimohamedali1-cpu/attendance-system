import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn } from 'class-validator';

// أنواع التفاعلات المتاحة
export const REACTION_TYPES = [
  'like',
  'love',
  'celebrate',
  'support',
  'insightful',
  'funny',
] as const;

export type ReactionType = (typeof REACTION_TYPES)[number];

export class PostReactionDto {
  @ApiProperty({
    description: 'رمز التفاعل',
    example: 'like',
    enum: REACTION_TYPES,
  })
  @IsString()
  @IsIn(REACTION_TYPES)
  emoji: ReactionType;
}

// DTO للاستجابة - عرض التفاعلات
export class ReactionResponseDto {
  @ApiProperty({ description: 'معرف التفاعل' })
  id: string;

  @ApiProperty({ description: 'معرف المنشور' })
  postId: string;

  @ApiProperty({ description: 'معرف المستخدم' })
  userId: string;

  @ApiProperty({
    description: 'رمز التفاعل',
    enum: REACTION_TYPES,
  })
  emoji: string;

  @ApiProperty({ description: 'تاريخ التفاعل' })
  createdAt: Date;

  @ApiProperty({
    description: 'بيانات المستخدم',
    type: 'object',
  })
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

// DTO لإحصائيات التفاعلات على منشور
export class ReactionStatsDto {
  @ApiProperty({ description: 'إجمالي عدد التفاعلات' })
  total: number;

  @ApiProperty({
    description: 'عدد كل نوع من التفاعلات',
    example: { like: 10, love: 5, celebrate: 3 },
  })
  breakdown: Record<string, number>;

  @ApiProperty({
    description: 'هل المستخدم الحالي تفاعل مع المنشور',
  })
  userReacted: boolean;

  @ApiProperty({
    description: 'نوع تفاعل المستخدم الحالي (إن وجد)',
    nullable: true,
  })
  userReactionType?: string | null;
}
