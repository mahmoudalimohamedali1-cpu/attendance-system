import { PerformanceReviewCycleStatus } from '@prisma/client';
import { CreateReviewCycleDto } from './create-review-cycle.dto';
declare const UpdateReviewCycleDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateReviewCycleDto>>;
export declare class UpdateReviewCycleDto extends UpdateReviewCycleDto_base {
    status?: PerformanceReviewCycleStatus;
}
export {};
