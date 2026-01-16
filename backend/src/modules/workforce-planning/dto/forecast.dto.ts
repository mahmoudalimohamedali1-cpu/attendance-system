import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsNumber, IsEnum, Min, Max } from 'class-validator';

export enum ForecastType {
    STAFFING_NEEDS = 'STAFFING_NEEDS',
    COVERAGE_GAPS = 'COVERAGE_GAPS',
    COST_OPTIMIZATION = 'COST_OPTIMIZATION',
}

export class ForecastRequestDto {
    @ApiProperty({ description: 'تاريخ البداية', example: '2024-02-01' })
    @IsDateString()
    startDate: string;

    @ApiProperty({ description: 'تاريخ النهاية', example: '2024-02-29' })
    @IsDateString()
    endDate: string;

    @ApiProperty({ description: 'نوع التوقع', enum: ForecastType, required: false })
    @IsOptional()
    @IsEnum(ForecastType)
    type?: ForecastType;

    @ApiProperty({ description: 'معرف الفرع', required: false })
    @IsOptional()
    @IsString()
    branchId?: string;

    @ApiProperty({ description: 'معرف القسم', required: false })
    @IsOptional()
    @IsString()
    departmentId?: string;
}

export class DemandPrediction {
    @ApiProperty({ description: 'التاريخ' })
    date: string;

    @ApiProperty({ description: 'عدد الموظفين المطلوب' })
    requiredStaff: number;

    @ApiProperty({ description: 'عدد الموظفين المتاح' })
    availableStaff: number;

    @ApiProperty({ description: 'الفجوة (سالب = عجز، موجب = فائض)' })
    gap: number;

    @ApiProperty({ description: 'مستوى الثقة (0-1)' })
    confidence: number;
}

export class CoverageGap {
    @ApiProperty({ description: 'تاريخ البداية' })
    startDate: string;

    @ApiProperty({ description: 'تاريخ النهاية' })
    endDate: string;

    @ApiProperty({ description: 'القسم' })
    department: string;

    @ApiProperty({ description: 'حجم الفجوة' })
    gapSize: number;

    @ApiProperty({ description: 'الخطورة (LOW, MEDIUM, HIGH, CRITICAL)' })
    severity: string;

    @ApiProperty({ description: 'التوصيات' })
    recommendations: string[];
}

export class CostOptimization {
    @ApiProperty({ description: 'التكلفة الحالية المتوقعة' })
    currentCost: number;

    @ApiProperty({ description: 'التكلفة المثلى' })
    optimizedCost: number;

    @ApiProperty({ description: 'المبلغ الموفر' })
    savings: number;

    @ApiProperty({ description: 'نسبة التوفير' })
    savingsPercentage: number;

    @ApiProperty({ description: 'الإجراءات الموصى بها' })
    recommendedActions: string[];
}

export class ForecastResponseDto {
    @ApiProperty({ description: 'معرف الشركة' })
    companyId: string;

    @ApiProperty({ description: 'تاريخ البداية' })
    startDate: string;

    @ApiProperty({ description: 'تاريخ النهاية' })
    endDate: string;

    @ApiProperty({ description: 'توقعات الطلب', type: [DemandPrediction] })
    predictions: DemandPrediction[];

    @ApiProperty({ description: 'فجوات التغطية', type: [CoverageGap] })
    coverageGaps: CoverageGap[];

    @ApiProperty({ description: 'تحسين التكلفة' })
    costOptimization: CostOptimization;

    @ApiProperty({ description: 'النتائج الرئيسية' })
    insights: string[];

    @ApiProperty({ description: 'وقت التوليد' })
    generatedAt: Date;
}
