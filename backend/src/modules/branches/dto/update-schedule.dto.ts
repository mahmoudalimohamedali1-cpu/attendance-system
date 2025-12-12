import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  Max,
  IsString,
  IsBoolean,
  IsOptional,
  Matches,
} from 'class-validator';

class ScheduleItem {
  @ApiProperty({ description: 'يوم الأسبوع (0=الأحد, 6=السبت)', minimum: 0, maximum: 6 })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ description: 'وقت بداية الدوام', example: '09:00' })
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  workStartTime: string;

  @ApiProperty({ description: 'وقت نهاية الدوام', example: '17:00' })
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  workEndTime: string;

  @ApiProperty({ description: 'يوم عمل', default: true })
  @IsOptional()
  @IsBoolean()
  isWorkingDay?: boolean = true;
}

export class UpdateScheduleDto {
  @ApiProperty({ description: 'جدول العمل', type: [ScheduleItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleItem)
  schedules: ScheduleItem[];
}

