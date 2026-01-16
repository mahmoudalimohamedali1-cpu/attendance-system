import { IsOptional, IsNumber, IsString, IsArray, Min, Max } from 'class-validator';

export class SubmitSelfReviewDto {
    @IsNumber()
    @Min(1)
    @Max(5)
    selfRating: number;

    @IsOptional()
    @IsString()
    selfComments?: string;

    @IsOptional()
    @IsArray()
    selfAchievements?: string[];

    @IsOptional()
    @IsArray()
    selfChallenges?: string[];
}
