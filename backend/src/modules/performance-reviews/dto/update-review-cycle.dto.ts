import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsEnum } from 'class-validator';
import { PerformanceReviewCycleStatus } from '@prisma/client';
import { CreateReviewCycleDto } from './create-review-cycle.dto';

export class UpdateReviewCycleDto extends PartialType(CreateReviewCycleDto) {
    @IsOptional()
    @IsEnum(PerformanceReviewCycleStatus)
    status?: PerformanceReviewCycleStatus;
}
