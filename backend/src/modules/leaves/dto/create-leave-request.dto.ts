import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
  IsArray,
  MaxLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
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

// Issue #42: Validate minimum advance notice (1 day for non-emergency)
@ValidatorConstraint({ name: 'advanceNotice', async: false })
class AdvanceNoticeValidator implements ValidatorConstraintInterface {
  validate(startDate: string, args: ValidationArguments) {
    const dto = args.object as CreateLeaveRequestDto;
    // Emergency and sick leave can be same-day
    if (['EMERGENCY', 'SICK'].includes(dto.type)) {
      return true;
    }
    const start = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return start >= today;
  }

  defaultMessage() {
    return 'تاريخ البداية يجب أن يكون اليوم أو بعده (إلا للإجازات الطارئة والمرضية)';
  }
}

// Issue #48: Validate maximum leave duration (90 days)
@ValidatorConstraint({ name: 'maxDuration', async: false })
class MaxDurationValidator implements ValidatorConstraintInterface {
  validate(endDate: string, args: ValidationArguments) {
    const dto = args.object as CreateLeaveRequestDto;
    const start = new Date(dto.startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diffDays <= 90;
  }

  defaultMessage() {
    return 'مدة الإجازة لا يمكن أن تتجاوز 90 يوماً';
  }
}

export class CreateLeaveRequestDto {
  @ApiProperty({ description: 'نوع الإجازة', enum: LeaveType })
  @IsEnum(LeaveType)
  type: LeaveType;

  @ApiProperty({ description: 'تاريخ البداية', example: '2024-01-15' })
  @IsDateString()
  @Validate(AdvanceNoticeValidator)
  startDate: string;

  @ApiProperty({ description: 'تاريخ النهاية', example: '2024-01-17' })
  @IsDateString()
  @Validate(MaxDurationValidator)
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

