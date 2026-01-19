import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventType, EventStatus, VisibilityType } from '@prisma/client';
import { EventTargetDto, EventAttendeeDto } from './create-event.dto';

export class UpdateEventDto {
  @ApiPropertyOptional({
    description: 'عنوان الحدث',
    example: 'اجتماع فريق التطوير - محدث',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional({
    description: 'عنوان الحدث بالإنجليزية',
    example: 'Development Team Meeting - Updated',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  titleEn?: string;

  @ApiPropertyOptional({
    description: 'وصف الحدث',
    example: 'اجتماع أسبوعي لمناقشة تقدم المشاريع - تم تحديث الموعد',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({
    description: 'وصف الحدث بالإنجليزية',
    example: 'Weekly meeting to discuss project progress - schedule updated',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descriptionEn?: string;

  @ApiPropertyOptional({
    description: 'تاريخ ووقت بداية الحدث',
    example: '2024-06-15T09:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional({
    description: 'تاريخ ووقت نهاية الحدث',
    example: '2024-06-15T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional({
    description: 'هل الحدث يوم كامل',
  })
  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @ApiPropertyOptional({
    description: 'المنطقة الزمنية',
    example: 'Asia/Riyadh',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'موقع الحدث',
    example: 'قاعة الاجتماعات الرئيسية',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @ApiPropertyOptional({
    description: 'رابط الاجتماع الإلكتروني',
    example: 'https://meet.google.com/abc-defg-hij',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  meetingLink?: string;

  @ApiPropertyOptional({
    description: 'نوع الحدث',
    enum: EventType,
  })
  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @ApiPropertyOptional({
    description: 'حالة الحدث',
    enum: EventStatus,
  })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional({
    description: 'نوع الظهور/الرؤية',
    enum: VisibilityType,
  })
  @IsOptional()
  @IsEnum(VisibilityType)
  visibilityType?: VisibilityType;

  @ApiPropertyOptional({
    description: 'هل الحدث متكرر',
  })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({
    description: 'قاعدة التكرار بصيغة RRULE',
    example: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  recurrenceRule?: string;

  @ApiPropertyOptional({
    description: 'لون الحدث في التقويم',
    example: '#4CAF50',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @ApiPropertyOptional({
    description: 'أيقونة الحدث',
    example: 'meeting',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({
    description: 'قواعد الاستهداف للحدث (سيتم استبدال القواعد الحالية)',
    type: [EventTargetDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventTargetDto)
  targets?: EventTargetDto[];

  @ApiPropertyOptional({
    description: 'قائمة المدعوين للحدث (سيتم استبدال القائمة الحالية)',
    type: [EventAttendeeDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventAttendeeDto)
  attendees?: EventAttendeeDto[];
}
