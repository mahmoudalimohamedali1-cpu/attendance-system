import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsArray, IsUUID, IsObject } from 'class-validator';

enum NotificationType {
  LATE_CHECK_IN = 'LATE_CHECK_IN',
  EARLY_CHECK_OUT = 'EARLY_CHECK_OUT',
  EARLY_CHECK_IN = 'EARLY_CHECK_IN',
  LEAVE_APPROVED = 'LEAVE_APPROVED',
  LEAVE_REJECTED = 'LEAVE_REJECTED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  GENERAL = 'GENERAL',
}

export class BroadcastNotificationDto {
  @ApiProperty({ description: 'نوع الإشعار', enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'عنوان الإشعار' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'نص الإشعار' })
  @IsString()
  body: string;

  @ApiProperty({ description: 'قائمة معرفات المستخدمين (اختياري - للإرسال للكل اتركه فارغاً)', required: false })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  userIds?: string[];

  @ApiProperty({ description: 'بيانات إضافية', required: false })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}

