import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
  IsArray,
  MaxLength,
} from 'class-validator';

enum LeaveType {
  ANNUAL = 'ANNUAL',
  SICK = 'SICK',
  PERSONAL = 'PERSONAL',
  EMERGENCY = 'EMERGENCY',
  NEW_BABY = 'NEW_BABY',
  MARRIAGE = 'MARRIAGE',
  BEREAVEMENT = 'BEREAVEMENT',
  HAJJ = 'HAJJ',
  EXAM = 'EXAM',
  WORK_MISSION = 'WORK_MISSION',
  UNPAID = 'UNPAID',
  EARLY_LEAVE = 'EARLY_LEAVE',
  OTHER = 'OTHER',
}

// واجهة المرفق
export interface LeaveAttachment {
  originalName: string;
  filename: string;
  path?: string;
  url: string;
  size?: number;
  mimeType?: string;
}

export class CreateLeaveRequestDto {
  @ApiProperty({ description: 'نوع الإجازة', enum: LeaveType })
  @IsEnum(LeaveType)
  type: LeaveType;

  @ApiProperty({ description: 'تاريخ البداية', example: '2024-01-15' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'تاريخ النهاية', example: '2024-01-17' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ description: 'السبب أو الملاحظات', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'الملاحظات يجب ألا تتجاوز 500 حرف' })
  reason?: string;

  @ApiProperty({ description: 'ملاحظات', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'الملاحظات يجب ألا تتجاوز 500 حرف' })
  notes?: string;

  @ApiProperty({ description: 'المرفقات', required: false, type: 'array' })
  @IsOptional()
  attachments?: LeaveAttachment[];
}

