import { IsString, IsOptional, IsEnum, IsDateString, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { PerformanceReviewCycleType } from '../../../shared/enums';

export class CreateReviewCycleDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    nameEn?: string;

    @IsOptional()
    @IsEnum(PerformanceReviewCycleType)
    type?: PerformanceReviewCycleType;

    @IsDateString()
    periodStart: string;

    @IsDateString()
    periodEnd: string;

    // مواعيد العملية
    @IsOptional()
    @IsDateString()
    selfReviewStart?: string;

    @IsOptional()
    @IsDateString()
    selfReviewEnd?: string;

    @IsOptional()
    @IsDateString()
    managerReviewStart?: string;

    @IsOptional()
    @IsDateString()
    managerReviewEnd?: string;

    @IsOptional()
    @IsDateString()
    feedbackStart?: string;

    @IsOptional()
    @IsDateString()
    feedbackEnd?: string;

    @IsOptional()
    @IsDateString()
    calibrationStart?: string;

    @IsOptional()
    @IsDateString()
    calibrationEnd?: string;

    // إعدادات
    @IsOptional()
    @IsBoolean()
    includeSelfReview?: boolean;

    @IsOptional()
    @IsBoolean()
    include360Feedback?: boolean;

    @IsOptional()
    @IsBoolean()
    includeGoalRating?: boolean;

    @IsOptional()
    @IsBoolean()
    includeCompetencyRating?: boolean;

    // الأوزان
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    goalWeight?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    competencyWeight?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    valueWeight?: number;

    @IsOptional()
    @IsString()
    competencyFrameworkId?: string;
}
