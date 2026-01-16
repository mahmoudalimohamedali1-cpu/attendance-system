import { ApiProperty } from '@nestjs/swagger';
import {
    IsOptional,
    IsString,
    IsNumber,
    IsDateString,
    IsEnum,
    IsObject,
    IsArray,
    ValidateNested,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum MetricType {
    SALES = 'SALES',
    PRODUCTION = 'PRODUCTION',
    ORDERS = 'ORDERS',
    TRAFFIC = 'TRAFFIC',
    WORKLOAD = 'WORKLOAD',
    CUSTOM = 'CUSTOM',
}

export class CreateBusinessMetricDto {
    @ApiProperty({ description: 'نوع المقياس', enum: MetricType })
    @IsEnum(MetricType)
    metricType: MetricType;

    @ApiProperty({ description: 'اسم المقياس' })
    @IsString()
    metricName: string;

    @ApiProperty({ description: 'تاريخ المقياس', example: '2024-02-01' })
    @IsDateString()
    date: string;

    @ApiProperty({ description: 'قيمة المقياس' })
    @IsNumber()
    @Min(0)
    value: number;

    @ApiProperty({ description: 'معرف الفرع', required: false })
    @IsOptional()
    @IsString()
    branchId?: string;

    @ApiProperty({ description: 'مصدر البيانات', required: false })
    @IsOptional()
    @IsString()
    source?: string;

    @ApiProperty({ description: 'بيانات وصفية إضافية', required: false })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}

export class UpdateBusinessMetricDto {
    @ApiProperty({ description: 'قيمة المقياس', required: false })
    @IsOptional()
    @IsNumber()
    @Min(0)
    value?: number;

    @ApiProperty({ description: 'مصدر البيانات', required: false })
    @IsOptional()
    @IsString()
    source?: string;

    @ApiProperty({ description: 'بيانات وصفية إضافية', required: false })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}

export class BulkCreateMetricsDto {
    @ApiProperty({ description: 'قائمة المقاييس', type: [CreateBusinessMetricDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateBusinessMetricDto)
    metrics: CreateBusinessMetricDto[];
}

export class BusinessMetricQueryDto {
    @ApiProperty({ description: 'نوع المقياس', enum: MetricType, required: false })
    @IsOptional()
    @IsEnum(MetricType)
    metricType?: MetricType;

    @ApiProperty({ description: 'معرف الفرع', required: false })
    @IsOptional()
    @IsString()
    branchId?: string;

    @ApiProperty({ description: 'تاريخ البداية', required: false })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiProperty({ description: 'تاريخ النهاية', required: false })
    @IsOptional()
    @IsDateString()
    endDate?: string;
}

export class BusinessMetricResponseDto {
    @ApiProperty({ description: 'معرف المقياس' })
    id: string;

    @ApiProperty({ description: 'معرف الشركة' })
    companyId: string;

    @ApiProperty({ description: 'معرف الفرع', required: false })
    branchId?: string;

    @ApiProperty({ description: 'نوع المقياس', enum: MetricType })
    metricType: MetricType;

    @ApiProperty({ description: 'اسم المقياس' })
    metricName: string;

    @ApiProperty({ description: 'التاريخ' })
    date: Date;

    @ApiProperty({ description: 'القيمة' })
    value: number;

    @ApiProperty({ description: 'المصدر', required: false })
    source?: string;

    @ApiProperty({ description: 'البيانات الوصفية', required: false })
    metadata?: Record<string, any>;

    @ApiProperty({ description: 'تاريخ الإنشاء' })
    createdAt: Date;

    @ApiProperty({ description: 'تاريخ التحديث' })
    updatedAt: Date;
}

export class MetricsSummaryDto {
    @ApiProperty({ description: 'نوع المقياس' })
    metricType: MetricType;

    @ApiProperty({ description: 'المجموع' })
    total: number;

    @ApiProperty({ description: 'المتوسط' })
    average: number;

    @ApiProperty({ description: 'الحد الأدنى' })
    min: number;

    @ApiProperty({ description: 'الحد الأقصى' })
    max: number;

    @ApiProperty({ description: 'عدد السجلات' })
    count: number;
}

export class MetricsTrendDto {
    @ApiProperty({ description: 'التاريخ' })
    date: string;

    @ApiProperty({ description: 'القيمة' })
    value: number;

    @ApiProperty({ description: 'نسبة التغيير عن الفترة السابقة' })
    changePercentage: number;
}

export class BusinessMetricsAnalysisDto {
    @ApiProperty({ description: 'معرف الشركة' })
    companyId: string;

    @ApiProperty({ description: 'فترة التحليل - من' })
    startDate: string;

    @ApiProperty({ description: 'فترة التحليل - إلى' })
    endDate: string;

    @ApiProperty({ description: 'ملخص المقاييس', type: [MetricsSummaryDto] })
    summaries: MetricsSummaryDto[];

    @ApiProperty({ description: 'اتجاهات المقاييس', type: [MetricsTrendDto] })
    trends: MetricsTrendDto[];

    @ApiProperty({ description: 'رؤى وتوصيات' })
    insights: string[];

    @ApiProperty({ description: 'العلاقة مع احتياجات القوى العاملة' })
    workforceCorrelation: {
        metric: string;
        correlation: number;
        impact: 'LOW' | 'MEDIUM' | 'HIGH';
        recommendation: string;
    }[];

    @ApiProperty({ description: 'وقت التحليل' })
    analyzedAt: Date;
}
