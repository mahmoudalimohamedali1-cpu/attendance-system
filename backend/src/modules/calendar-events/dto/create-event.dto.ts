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
import { EventType, VisibilityType, TargetType } from '@prisma/client';

// DTO لقواعد استهداف الحدث
export class EventTargetDto {
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

// DTO لإضافة الحضور
export class EventAttendeeDto {
  @ApiProperty({
    description: 'معرف المستخدم المدعو',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  userId: string;
}

export class CreateEventDto {
  @ApiProperty({
    description: 'عنوان الحدث',
    example: 'اجتماع فريق التطوير',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional({
    description: 'عنوان الحدث بالإنجليزية',
    example: 'Development Team Meeting',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  titleEn?: string;

  @ApiPropertyOptional({
    description: 'وصف الحدث',
    example: 'اجتماع أسبوعي لمناقشة تقدم المشاريع',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({
    description: 'وصف الحدث بالإنجليزية',
    example: 'Weekly meeting to discuss project progress',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descriptionEn?: string;

  @ApiProperty({
    description: 'تاريخ ووقت بداية الحدث',
    example: '2024-06-15T09:00:00.000Z',
  })
  @IsDateString()
  startAt: string;

  @ApiProperty({
    description: 'تاريخ ووقت نهاية الحدث',
    example: '2024-06-15T10:00:00.000Z',
  })
  @IsDateString()
  endAt: string;

  @ApiPropertyOptional({
    description: 'هل الحدث يوم كامل',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @ApiPropertyOptional({
    description: 'المنطقة الزمنية',
    example: 'Asia/Riyadh',
    default: 'Asia/Riyadh',
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
    default: 'MEETING',
  })
  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @ApiPropertyOptional({
    description: 'نوع الظهور/الرؤية',
    enum: VisibilityType,
    default: 'PUBLIC',
  })
  @IsOptional()
  @IsEnum(VisibilityType)
  visibilityType?: VisibilityType;

  @ApiPropertyOptional({
    description: 'هل الحدث متكرر',
    default: false,
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
    description: 'قواعد الاستهداف للحدث',
    type: [EventTargetDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventTargetDto)
  targets?: EventTargetDto[];

  @ApiPropertyOptional({
    description: 'قائمة المدعوين للحدث',
    type: [EventAttendeeDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventAttendeeDto)
  attendees?: EventAttendeeDto[];
}
