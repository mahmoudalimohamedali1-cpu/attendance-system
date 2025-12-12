import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsEnum, IsUUID, IsInt, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';

enum AttendanceStatus {
  PRESENT = 'PRESENT',
  LATE = 'LATE',
  EARLY_LEAVE = 'EARLY_LEAVE',
  ABSENT = 'ABSENT',
  ON_LEAVE = 'ON_LEAVE',
  WORK_FROM_HOME = 'WORK_FROM_HOME',
}

export class AttendanceQueryDto {
  @ApiProperty({ description: 'تاريخ البداية', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'تاريخ النهاية', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'تاريخ محدد', required: false })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ description: 'البحث عن موظف', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'حالة الحضور', enum: AttendanceStatus, required: false })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @ApiProperty({ description: 'معرف الفرع', required: false })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiProperty({ description: 'معرف القسم', required: false })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiProperty({ description: 'معرف الموظف', required: false })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ description: 'رقم الصفحة', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: 'عدد العناصر في الصفحة', default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 30;
}

