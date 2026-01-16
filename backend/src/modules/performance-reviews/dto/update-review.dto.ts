import { IsOptional, IsEnum, IsInt, Min, Max, IsString } from 'class-validator';
import { PerformanceReviewStatus } from '@prisma/client';

export class UpdateReviewDto {
    @IsOptional()
    @IsEnum(PerformanceReviewStatus)
    status?: PerformanceReviewStatus;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(3)
    performanceScore?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(3)
    potentialScore?: number;

    @IsOptional()
    @IsString()
    nineBoxPosition?: string;
}
