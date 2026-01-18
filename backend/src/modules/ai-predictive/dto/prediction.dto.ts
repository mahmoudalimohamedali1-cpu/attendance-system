import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  IsDateString,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

enum FeatureImpact {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/**
 * 📊 DTO لأهمية العوامل
 */
export class FeatureImportanceDto {
  @ApiProperty({ description: 'اسم العامل' })
  @IsString()
  feature: string;

  @ApiProperty({ description: 'التأثير', enum: FeatureImpact })
  @IsEnum(FeatureImpact)
  impact: FeatureImpact;

  @ApiProperty({ description: 'الوصف' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'الوزن (0-1)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  weight: number;
}

/**
 * 🎯 DTO لتوقعات الموظف
 */
export class EmployeePredictionDto {
  @ApiProperty({ description: 'معرف الموظف' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'اسم الموظف' })
  @IsString()
  employeeName: string;

  @ApiProperty({ description: 'احتمالية الغياب (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  absenceLikelihood: number;

  @ApiProperty({ description: 'مستوى المخاطر', enum: RiskLevel })
  @IsEnum(RiskLevel)
  riskLevel: RiskLevel;

  @ApiProperty({ description: 'العوامل المساهمة', type: [String] })
  @IsArray()
  @IsString({ each: true })
  contributingFactors: string[];

  @ApiProperty({ description: 'مقارنة مع القسم', required: false })
  @IsOptional()
  @IsString()
  departmentComparison?: string;

  @ApiProperty({ description: 'تاريخ التوقع' })
  @IsDateString()
  predictionDate: Date;
}

/**
 * 🔍 DTO لشرح التوقع
 */
export class PredictionExplanationDto {
  @ApiProperty({ description: 'ملخص سريع' })
  @IsString()
  summary: string;

  @ApiProperty({ description: 'مستوى المخاطر', enum: RiskLevel })
  @IsEnum(RiskLevel)
  riskLevel: RiskLevel;

  @ApiProperty({ description: 'احتمالية الغياب (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  likelihood: number;

  @ApiProperty({ description: 'أهم العوامل', type: [FeatureImportanceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeatureImportanceDto)
  topFactors: FeatureImportanceDto[];

  @ApiProperty({ description: 'الشرح التفصيلي' })
  @IsString()
  detailedExplanation: string;

  @ApiProperty({ description: 'التوصيات', type: [String] })
  @IsArray()
  @IsString({ each: true })
  recommendations: string[];
}

/**
 * 🔍 DTO للأنماط المكتشفة
 */
export class PatternInsightDto {
  @ApiProperty({ description: 'نوع النمط' })
  @IsString()
  patternType: string;

  @ApiProperty({ description: 'الوصف' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'الموظفون المتأثرون', type: [String] })
  @IsArray()
  @IsString({ each: true })
  affectedEmployees: string[];

  @ApiProperty({ description: 'مستوى الثقة (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiProperty({ description: 'تاريخ الاكتشاف' })
  @IsDateString()
  detectedAt: Date;

  @ApiProperty({ description: 'الرؤى والتوصيات', type: [String] })
  @IsArray()
  @IsString({ each: true })
  insights: string[];
}

/**
 * 📈 DTO لمقاييس دقة النموذج
 */
export class AccuracyMetricsDto {
  @ApiProperty({ description: 'إصدار النموذج' })
  @IsString()
  modelVersion: string;

  @ApiProperty({ description: 'الدقة العامة (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  accuracy: number;

  @ApiProperty({ description: 'الدقة (Precision) (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  precision: number;

  @ApiProperty({ description: 'الاستدعاء (Recall) (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  recall: number;

  @ApiProperty({ description: 'درجة F1 (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  f1Score: number;

  @ApiProperty({ description: 'تاريخ التقييم' })
  @IsDateString()
  evaluatedAt: Date;

  @ApiProperty({ description: 'عدد التوقعات المستخدمة في التقييم' })
  @IsNumber()
  @Min(0)
  predictionCount: number;
}

/**
 * 📝 DTO لطلب التدريب
 */
export class TrainModelDto {
  @ApiProperty({ description: 'معرف الشركة', required: false })
  @IsOptional()
  @IsString()
  companyId?: string;
}

/**
 * 📝 DTO لطلب توقع الموظف
 */
export class PredictEmployeeDto {
  @ApiProperty({ description: 'معرف الموظف' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'تاريخ التوقع المستهدف', required: false })
  @IsOptional()
  @IsDateString()
  targetDate?: string;
}

/**
 * 📝 DTO لطلب الأنماط
 */
export class GetPatternsDto {
  @ApiProperty({ description: 'نوع النمط', required: false })
  @IsOptional()
  @IsString()
  patternType?: string;

  @ApiProperty({ description: 'الحد الأقصى للنتائج', required: false, default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
