import { IsOptional, IsNumber, IsString, IsArray, Min, Max } from 'class-validator';

export class SubmitManagerReviewDto {
    @IsNumber()
    @Min(1)
    @Max(5)
    managerRating: number;

    @IsOptional()
    @IsString()
    managerComments?: string;

    @IsOptional()
    @IsArray()
    managerStrengths?: string[];

    @IsOptional()
    @IsArray()
    managerImprovements?: string[];
}
