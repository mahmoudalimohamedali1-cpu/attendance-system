import { ApiProperty } from '@nestjs/swagger';
import {
    IsOptional,
    IsString,
    IsNumber,
    IsDateString,
    IsEnum,
    IsArray,
    Min,
    Max,
} from 'class-validator';

export enum OptimizationType {
    SCHEDULE_ADJUSTMENT = 'SCHEDULE_ADJUSTMENT',
    HEADCOUNT_CHANGE = 'HEADCOUNT_CHANGE',
    SHIFT_RESTRUCTURE = 'SHIFT_RESTRUCTURE',
    OVERTIME_REDUCTION = 'OVERTIME_REDUCTION',
    COST_SAVING = 'COST_SAVING',
}

export enum OptimizationStatus {
    PENDING = 'PENDING',
    REVIEWED = 'REVIEWED',
    APPROVED = 'APPROVED',
    IMPLEMENTED = 'IMPLEMENTED',
    REJECTED = 'REJECTED',
}

export enum OptimizationPriority {
    LOW = 1,
    MEDIUM = 2,
    HIGH = 3,
    CRITICAL = 4,
}

export class GenerateCostOptimizationDto {
    @ApiProperty({ description: 'معرف الفرع', required: false })
    @IsOptional()
    @IsString()
    branchId?: string;

    @ApiProperty({ description: 'معرف القسم', required: false })
    @IsOptional()
    @IsString()
    departmentId?: string;

    @ApiProperty({ description: 'تاريخ البداية للتحليل', example: '2024-01-01' })
    @IsDateString()
    startDate: string;

    @ApiProperty({ description: 'تاريخ النهاية للتحليل', example: '2024-12-31' })
    @IsDateString()
    endDate: string;

    @ApiProperty({ description: 'أنواع التحسين المطلوبة', enum: OptimizationType, isArray: true, required: false })
    @IsOptional()
    @IsArray()
    @IsEnum(OptimizationType, { each: true })
    optimizationTypes?: OptimizationType[];
}

export class CostOptimizationQueryDto {
    @ApiProperty({ description: 'نوع التحسين', enum: OptimizationType, required: false })
    @IsOptional()
    @IsEnum(OptimizationType)
    optimizationType?: OptimizationType;

    @ApiProperty({ description: 'حالة التوصية', enum: OptimizationStatus, required: false })
    @IsOptional()
    @IsEnum(OptimizationStatus)
    status?: OptimizationStatus;

    @ApiProperty({ description: 'معرف الفرع', required: false })
    @IsOptional()
    @IsString()
    branchId?: string;

    @ApiProperty({ description: 'معرف القسم', required: false })
    @IsOptional()
    @IsString()
    departmentId?: string;

    @ApiProperty({ description: 'الحد الأدنى للأولوية (1-4)', required: false })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(4)
    minPriority?: number;
}

export class UpdateOptimizationStatusDto {
    @ApiProperty({ description: 'الحالة الجديدة', enum: OptimizationStatus })
    @IsEnum(OptimizationStatus)
    status: OptimizationStatus;

    @ApiProperty({ description: 'ملاحظات', required: false })
    @IsOptional()
    @IsString()
    notes?: string;
}

export class CostOptimizationRecommendationDto {
    @ApiProperty({ description: 'معرف التوصية' })
    id: string;

    @ApiProperty({ description: 'معرف الشركة' })
    companyId: string;

    @ApiProperty({ description: 'معرف الفرع', required: false })
    branchId?: string;

    @ApiProperty({ description: 'معرف القسم', required: false })
    departmentId?: string;

    @ApiProperty({ description: 'عنوان التوصية' })
    title: string;

    @ApiProperty({ description: 'وصف التوصية' })
    description: string;

    @ApiProperty({ description: 'نوع التحسين', enum: OptimizationType })
    optimizationType: OptimizationType;

    @ApiProperty({ description: 'حالة التوصية', enum: OptimizationStatus })
    status: OptimizationStatus;

    @ApiProperty({ description: 'التكلفة الحالية' })
    currentCost: number;

    @ApiProperty({ description: 'التكلفة المحسنة' })
    optimizedCost: number;

    @ApiProperty({ description: 'التوفير المحتمل' })
    potentialSavings: number;

    @ApiProperty({ description: 'نسبة التوفير' })
    savingsPercentage: number;

    @ApiProperty({ description: 'الأولوية (1-4)' })
    priority: number;

    @ApiProperty({ description: 'بيانات التحليل' })
    analysisData: Record<string, any>;

    @ApiProperty({ description: 'التوصيات التفصيلية' })
    recommendations: string;

    @ApiProperty({ description: 'المتطلبات', required: false })
    requirements?: string;

    @ApiProperty({ description: 'المخاطر المحتملة', required: false })
    risks?: string;

    @ApiProperty({ description: 'تاريخ الإنشاء' })
    createdAt: Date;

    @ApiProperty({ description: 'تاريخ التحديث' })
    updatedAt: Date;
}

export class CostOptimizationSummaryDto {
    @ApiProperty({ description: 'إجمالي التوصيات' })
    totalRecommendations: number;

    @ApiProperty({ description: 'إجمالي التوفير المحتمل' })
    totalPotentialSavings: number;

    @ApiProperty({ description: 'التوصيات حسب النوع' })
    byType: Record<OptimizationType, {
        count: number;
        potentialSavings: number;
    }>;

    @ApiProperty({ description: 'التوصيات حسب الحالة' })
    byStatus: Record<OptimizationStatus, number>;

    @ApiProperty({ description: 'أعلى التوصيات ذات الأولوية' })
    topPriorityRecommendations: CostOptimizationRecommendationDto[];
}

export class AIOptimizationAnalysisDto {
    @ApiProperty({ description: 'معرف الشركة' })
    companyId: string;

    @ApiProperty({ description: 'فترة التحليل - من' })
    startDate: string;

    @ApiProperty({ description: 'فترة التحليل - إلى' })
    endDate: string;

    @ApiProperty({ description: 'التوصيات المُنشأة' })
    recommendations: CostOptimizationRecommendationDto[];

    @ApiProperty({ description: 'ملخص التحليل' })
    summary: {
        totalCurrentCost: number;
        totalOptimizedCost: number;
        totalPotentialSavings: number;
        overallSavingsPercentage: number;
    };

    @ApiProperty({ description: 'رؤى الذكاء الاصطناعي' })
    insights: string[];

    @ApiProperty({ description: 'وقت التحليل' })
    analyzedAt: Date;
}
