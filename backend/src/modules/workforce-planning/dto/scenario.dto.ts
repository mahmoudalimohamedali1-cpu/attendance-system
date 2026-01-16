import { ApiProperty } from '@nestjs/swagger';
import {
    IsString,
    IsEnum,
    IsObject,
    IsDateString,
    IsOptional,
    IsNumber,
    Min,
} from 'class-validator';

export enum ScenarioType {
    HIRE = 'HIRE',                  // توظيف موظفين جدد
    TERMINATE = 'TERMINATE',        // إنهاء خدمات
    SCHEDULE_CHANGE = 'SCHEDULE_CHANGE', // تغيير الجداول
    COST_REDUCTION = 'COST_REDUCTION',   // تخفيض التكاليف
    EXPANSION = 'EXPANSION',             // توسع في الأعمال
}

export enum ScenarioStatus {
    DRAFT = 'DRAFT',            // مسودة
    ANALYZING = 'ANALYZING',    // قيد التحليل
    COMPLETED = 'COMPLETED',    // مكتمل
    IMPLEMENTED = 'IMPLEMENTED', // تم التنفيذ
    REJECTED = 'REJECTED',      // مرفوض
}

export class ScenarioParameters {
    @ApiProperty({ description: 'عدد الموظفين (للتوظيف أو الإنهاء)', required: false })
    @IsOptional()
    @IsNumber()
    @Min(0)
    employeeCount?: number;

    @ApiProperty({ description: 'معرف القسم', required: false })
    @IsOptional()
    @IsString()
    departmentId?: string;

    @ApiProperty({ description: 'معرف الفرع', required: false })
    @IsOptional()
    @IsString()
    branchId?: string;

    @ApiProperty({ description: 'متوسط الراتب للموظفين الجدد', required: false })
    @IsOptional()
    @IsNumber()
    @Min(0)
    averageSalary?: number;

    @ApiProperty({ description: 'نسبة التغيير (%)', required: false })
    @IsOptional()
    @IsNumber()
    changePercentage?: number;

    @ApiProperty({ description: 'بيانات إضافية', required: false })
    @IsOptional()
    @IsObject()
    additionalData?: any;
}

export class CreateScenarioRequestDto {
    @ApiProperty({ description: 'اسم السيناريو' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'وصف السيناريو', required: false })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ description: 'نوع السيناريو', enum: ScenarioType })
    @IsEnum(ScenarioType)
    type: ScenarioType;

    @ApiProperty({ description: 'تاريخ البداية', example: '2024-02-01' })
    @IsDateString()
    startDate: string;

    @ApiProperty({ description: 'تاريخ النهاية', example: '2024-02-29' })
    @IsDateString()
    endDate: string;

    @ApiProperty({ description: 'معاملات السيناريو', type: ScenarioParameters })
    @IsObject()
    parameters: ScenarioParameters;
}

export class ScenarioImpactAnalysis {
    @ApiProperty({ description: 'التكلفة الأساسية' })
    baselineCost: number;

    @ApiProperty({ description: 'التكلفة المتوقعة' })
    projectedCost: number;

    @ApiProperty({ description: 'فرق التكلفة' })
    costDifference: number;

    @ApiProperty({ description: 'نسبة التغيير في التكلفة (%)' })
    costChangePercentage: number;

    @ApiProperty({ description: 'التغطية الأساسية (%)' })
    baselineCoverage: number;

    @ApiProperty({ description: 'التغطية المتوقعة (%)' })
    projectedCoverage: number;

    @ApiProperty({ description: 'فرق التغطية (%)' })
    coverageChange: number;

    @ApiProperty({ description: 'تحليل التأثير' })
    impactAnalysis: string;

    @ApiProperty({ description: 'المخاطر المحتملة', type: [String] })
    risks: string[];

    @ApiProperty({ description: 'الفوائد المتوقعة', type: [String] })
    benefits: string[];

    @ApiProperty({ description: 'رؤى الذكاء الاصطناعي' })
    aiInsights: string;
}

export class ScenarioResponseDto {
    @ApiProperty({ description: 'معرف السيناريو' })
    id: string;

    @ApiProperty({ description: 'معرف الشركة' })
    companyId: string;

    @ApiProperty({ description: 'اسم السيناريو' })
    name: string;

    @ApiProperty({ description: 'وصف السيناريو' })
    description?: string;

    @ApiProperty({ description: 'نوع السيناريو', enum: ScenarioType })
    type: ScenarioType;

    @ApiProperty({ description: 'حالة السيناريو', enum: ScenarioStatus })
    status: ScenarioStatus;

    @ApiProperty({ description: 'تاريخ البداية' })
    startDate: string;

    @ApiProperty({ description: 'تاريخ النهاية' })
    endDate: string;

    @ApiProperty({ description: 'معاملات السيناريو' })
    parameters: ScenarioParameters;

    @ApiProperty({ description: 'تحليل التأثير' })
    impact: ScenarioImpactAnalysis;

    @ApiProperty({ description: 'وقت الإنشاء' })
    createdAt: Date;

    @ApiProperty({ description: 'أنشئ بواسطة' })
    createdBy: string;
}
