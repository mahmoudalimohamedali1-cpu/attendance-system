import { IsNumber, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';

export class CalibrateReviewDto {
    @IsNumber()
    @Min(1)
    @Max(5)
    finalRating: number;

    @IsOptional()
    @IsString()
    finalComments?: string;

    @IsOptional()
    @IsString()
    calibrationNotes?: string;

    @IsInt()
    @Min(1)
    @Max(3)
    performanceScore: number;

    @IsInt()
    @Min(1)
    @Max(3)
    potentialScore: number;
}
