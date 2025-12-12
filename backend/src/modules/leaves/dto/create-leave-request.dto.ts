import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
  MinLength,
  Matches,
} from 'class-validator';

enum LeaveType {
  ANNUAL = 'ANNUAL',
  SICK = 'SICK',
  PERSONAL = 'PERSONAL',
  EMERGENCY = 'EMERGENCY',
  WORK_FROM_HOME = 'WORK_FROM_HOME',
  EARLY_LEAVE = 'EARLY_LEAVE',
  OTHER = 'OTHER',
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

  @ApiProperty({ description: 'وقت البداية (للخروج المبكر)', required: false })
  @IsOptional()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  startTime?: string;

  @ApiProperty({ description: 'وقت النهاية (للخروج المبكر)', required: false })
  @IsOptional()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  endTime?: string;

  @ApiProperty({ description: 'سبب الطلب' })
  @IsString()
  @MinLength(10, { message: 'يرجى كتابة سبب واضح للطلب (10 أحرف على الأقل)' })
  reason: string;
}

