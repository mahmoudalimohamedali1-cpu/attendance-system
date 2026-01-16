import { ApiProperty } from '@nestjs/swagger';
import {
    IsOptional,
    IsString,
    IsNumber,
    IsArray,
    IsObject,
    IsDateString,
    ValidateNested,
    Min,
    Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ScheduleConstraints {
    @ApiProperty({ description: 'الحد الأدنى لعدد الموظفين', required: false })
    @IsOptional()
    @IsNumber()
    @Min(0)
    minStaff?: number;

    @ApiProperty({ description: 'الحد الأقصى لعدد الموظفين', required: false })
    @IsOptional()
    @IsNumber()
    @Min(0)
    maxStaff?: number;

    @ApiProperty({ description: 'الحد الأقصى لساعات العمل في الأسبوع', required: false })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(168)
    maxWeeklyHours?: number;

    @ApiProperty({ description: 'الحد الأدنى لساعات الراحة بين المناوبات', required: false })
    @IsOptional()
    @IsNumber()
    @Min(0)
    minRestHours?: number;

    @ApiProperty({ description: 'أيام الإجازة الأسبوعية', required: false, type: [Number] })
    @IsOptional()
    @IsArray()
    weekendDays?: number[];
}

export class OptimizeScheduleRequestDto {
    @ApiProperty({ description: 'تاريخ البداية', example: '2024-02-01' })
    @IsDateString()
    startDate: string;

    @ApiProperty({ description: 'تاريخ النهاية', example: '2024-02-29' })
    @IsDateString()
    endDate: string;

    @ApiProperty({ description: 'معرف الفرع', required: false })
    @IsOptional()
    @IsString()
    branchId?: string;

    @ApiProperty({ description: 'معرف القسم', required: false })
    @IsOptional()
    @IsString()
    departmentId?: string;

    @ApiProperty({ description: 'قيود الجدولة', type: ScheduleConstraints, required: false })
    @IsOptional()
    @ValidateNested()
    @Type(() => ScheduleConstraints)
    constraints?: ScheduleConstraints;
}

export class ScheduleShift {
    @ApiProperty({ description: 'التاريخ' })
    date: string;

    @ApiProperty({ description: 'معرف الموظف' })
    userId: string;

    @ApiProperty({ description: 'اسم الموظف' })
    employeeName: string;

    @ApiProperty({ description: 'وقت البداية', example: '09:00' })
    startTime: string;

    @ApiProperty({ description: 'وقت النهاية', example: '17:00' })
    endTime: string;

    @ApiProperty({ description: 'عدد الساعات' })
    hours: number;

    @ApiProperty({ description: 'القسم', required: false })
    department?: string;
}

export class ScheduleOptimizationResult {
    @ApiProperty({ description: 'عدد المناوبات المحسنة' })
    totalShifts: number;

    @ApiProperty({ description: 'إجمالي ساعات العمل' })
    totalHours: number;

    @ApiProperty({ description: 'التكلفة المقدرة' })
    estimatedCost: number;

    @ApiProperty({ description: 'معدل التغطية (%)' })
    coverageRate: number;

    @ApiProperty({ description: 'مستوى التحسين (0-1)' })
    optimizationScore: number;
}

export class OptimizeScheduleResponseDto {
    @ApiProperty({ description: 'معرف الشركة' })
    companyId: string;

    @ApiProperty({ description: 'تاريخ البداية' })
    startDate: string;

    @ApiProperty({ description: 'تاريخ النهاية' })
    endDate: string;

    @ApiProperty({ description: 'المناوبات المحسنة', type: [ScheduleShift] })
    shifts: ScheduleShift[];

    @ApiProperty({ description: 'نتائج التحسين' })
    result: ScheduleOptimizationResult;

    @ApiProperty({ description: 'التوصيات' })
    recommendations: string[];

    @ApiProperty({ description: 'وقت التوليد' })
    generatedAt: Date;
}
