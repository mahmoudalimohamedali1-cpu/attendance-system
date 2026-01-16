import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsEnum } from 'class-validator';

export enum CoverageAnalysisType {
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
}

export enum GapSeverity {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL',
}

export class CoverageAnalysisRequestDto {
    @ApiProperty({ description: 'التاريخ المطلوب تحليله', example: '2024-02-01' })
    @IsDateString()
    date: string;

    @ApiProperty({ description: 'نوع التحليل', enum: CoverageAnalysisType, required: false })
    @IsOptional()
    @IsEnum(CoverageAnalysisType)
    analysisType?: CoverageAnalysisType;

    @ApiProperty({ description: 'معرف الفرع', required: false })
    @IsOptional()
    @IsString()
    branchId?: string;

    @ApiProperty({ description: 'معرف القسم', required: false })
    @IsOptional()
    @IsString()
    departmentId?: string;
}

export class DepartmentCoverage {
    @ApiProperty({ description: 'اسم القسم' })
    departmentName: string;

    @ApiProperty({ description: 'معرف القسم' })
    departmentId: string;

    @ApiProperty({ description: 'عدد الموظفين المطلوب' })
    requiredStaff: number;

    @ApiProperty({ description: 'عدد الموظفين المتاح' })
    availableStaff: number;

    @ApiProperty({ description: 'عدد الموظفين الحاضرين' })
    presentStaff: number;

    @ApiProperty({ description: 'عدد الإجازات' })
    onLeave: number;

    @ApiProperty({ description: 'الفجوة' })
    gap: number;

    @ApiProperty({ description: 'نسبة التغطية (%)' })
    coveragePercentage: number;

    @ApiProperty({ description: 'مستوى الخطورة', enum: GapSeverity })
    severity: GapSeverity;
}

export class ShiftCoverage {
    @ApiProperty({ description: 'اسم المناوبة' })
    shiftName: string;

    @ApiProperty({ description: 'وقت البداية' })
    startTime: string;

    @ApiProperty({ description: 'وقت النهاية' })
    endTime: string;

    @ApiProperty({ description: 'عدد الموظفين المطلوب' })
    requiredStaff: number;

    @ApiProperty({ description: 'عدد الموظفين المجدولين' })
    scheduledStaff: number;

    @ApiProperty({ description: 'الفجوة' })
    gap: number;

    @ApiProperty({ description: 'نسبة التغطية (%)' })
    coveragePercentage: number;

    @ApiProperty({ description: 'مستوى الخطورة', enum: GapSeverity })
    severity: GapSeverity;
}

export class CoverageGapDetail {
    @ApiProperty({ description: 'التاريخ' })
    date: string;

    @ApiProperty({ description: 'القسم' })
    department: string;

    @ApiProperty({ description: 'حجم الفجوة' })
    gapSize: number;

    @ApiProperty({ description: 'الخطورة', enum: GapSeverity })
    severity: GapSeverity;

    @ApiProperty({ description: 'السبب' })
    reason: string;

    @ApiProperty({ description: 'التوصيات', type: [String] })
    recommendations: string[];

    @ApiProperty({ description: 'التأثير على العمليات' })
    impact: string;
}

export class CoverageAnalysisResponseDto {
    @ApiProperty({ description: 'معرف الشركة' })
    companyId: string;

    @ApiProperty({ description: 'التاريخ المحلل' })
    date: string;

    @ApiProperty({ description: 'نوع التحليل', enum: CoverageAnalysisType })
    analysisType: CoverageAnalysisType;

    @ApiProperty({ description: 'نسبة التغطية الإجمالية (%)' })
    overallCoveragePercentage: number;

    @ApiProperty({ description: 'إجمالي الفجوات' })
    totalGaps: number;

    @ApiProperty({ description: 'التغطية حسب القسم', type: [DepartmentCoverage] })
    departmentCoverage: DepartmentCoverage[];

    @ApiProperty({ description: 'التغطية حسب المناوبة', type: [ShiftCoverage] })
    shiftCoverage: ShiftCoverage[];

    @ApiProperty({ description: 'تفاصيل الفجوات الحرجة', type: [CoverageGapDetail] })
    criticalGaps: CoverageGapDetail[];

    @ApiProperty({ description: 'التوصيات الرئيسية', type: [String] })
    recommendations: string[];

    @ApiProperty({ description: 'الحالة العامة' })
    overallStatus: string;

    @ApiProperty({ description: 'وقت التوليد' })
    generatedAt: Date;
}
