import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, Matches } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ description: 'اسم القسم', example: 'قسم تقنية المعلومات' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'اسم القسم بالإنجليزية', required: false })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiProperty({ description: 'معرف الفرع' })
  @IsUUID()
  branchId: string;

  @ApiProperty({ description: 'وقت بداية الدوام للقسم (اختياري)', required: false })
  @IsOptional()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'صيغة الوقت غير صحيحة (HH:MM)' })
  workStartTime?: string;

  @ApiProperty({ description: 'وقت نهاية الدوام للقسم (اختياري)', required: false })
  @IsOptional()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'صيغة الوقت غير صحيحة (HH:MM)' })
  workEndTime?: string;
}

