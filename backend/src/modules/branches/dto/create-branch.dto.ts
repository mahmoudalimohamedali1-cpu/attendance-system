import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  Matches,
} from 'class-validator';

export class CreateBranchDto {
  @ApiProperty({ description: 'اسم الفرع', example: 'الفرع الرئيسي' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'اسم الفرع بالإنجليزية', required: false })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiProperty({ description: 'العنوان', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: 'خط العرض', example: 24.7136 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'خط الطول', example: 46.6753 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({ description: 'نصف قطر الحضور بالمتر', default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(5000)
  geofenceRadius?: number = 100;

  @ApiProperty({ description: 'المنطقة الزمنية', default: 'Asia/Riyadh' })
  @IsOptional()
  @IsString()
  timezone?: string = 'Asia/Riyadh';

  @ApiProperty({ description: 'وقت بداية الدوام', default: '09:00' })
  @IsOptional()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'صيغة الوقت غير صحيحة (HH:MM)' })
  workStartTime?: string = '09:00';

  @ApiProperty({ description: 'وقت نهاية الدوام', default: '17:00' })
  @IsOptional()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'صيغة الوقت غير صحيحة (HH:MM)' })
  workEndTime?: string = '17:00';

  @ApiProperty({ description: 'فترة السماح للتأخير (دقائق)', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  lateGracePeriod?: number = 10;

  @ApiProperty({ description: 'فترة السماح للحضور المبكر (دقائق)', default: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(120)
  earlyCheckInPeriod?: number = 15;

  @ApiProperty({ description: 'فترة السماح للانصراف المبكر (دقائق)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  earlyCheckOutPeriod?: number = 0;

  @ApiProperty({ description: 'أيام العمل (0-6 مفصولة بفاصلة)', default: '0,1,2,3,4' })
  @IsOptional()
  @IsString()
  @Matches(/^[0-6](,[0-6])*$/, { message: 'صيغة أيام العمل غير صحيحة' })
  workingDays?: string = '0,1,2,3,4';

  @ApiProperty({ description: 'الفرع فعال', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

